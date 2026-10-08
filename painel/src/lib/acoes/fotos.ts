'use server'

import { randomUUID } from 'node:crypto'
import { refresh } from 'next/cache'
import { z } from 'zod'
import { exigirAdmin } from '@/lib/acesso'
import { mensagemDoBanco } from '@/lib/erros'
import { apagarArquivosDeFotos } from '@/lib/fotos-servidor'
import { clienteAdmin } from '@/lib/supabase/admin'
import type { Resultado } from './motos'

/*
 * Fotos das motos (seção 5.1 do plano).
 *
 * 1. prepararEnvio: confere o login e o espaço (teto de 20), gera os ids e
 *    devolve uma URL assinada por arquivo, cada uma valendo pra um caminho só.
 * 2. O navegador sobe direto pro Storage.
 * 3. concluirEnvio: confere que os arquivos chegaram (nome e tipo) e cadastra
 *    no banco, que trava a moto e confere o teto de novo.
 *
 * A chave secreta só emite URL e apaga arquivo; a gravação no banco vai pela
 * sessão do lojista (RLS).
 */

const BUCKET = 'veiculos'
const MAX_FOTOS = 20
const uuid = z.uuid()
const CAMINHO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(\d{3,4}|og)\.(webp|jpg)$/

const extensao = (formato: 'webp' | 'jpeg') => (formato === 'jpeg' ? 'jpg' : 'webp')
const tipoMime = (formato: 'webp' | 'jpeg') => (formato === 'jpeg' ? 'image/jpeg' : 'image/webp')

const larguras = z.array(z.number().int().min(320).max(2048)).min(1).max(3)

const esquemaPedido = z.object({
  veiculo: uuid,
  fotos: z
    .array(z.object({ larguras, formato: z.enum(['webp', 'jpeg']), og: z.boolean() }))
    .min(1)
    .max(MAX_FOTOS),
})

export type EnvioPreparado = { id: string; envios: { largura: number | 'og'; caminho: string; token: string }[] }

async function urlAssinada(caminho: string, substituir = false) {
  if (!CAMINHO.test(caminho)) throw new Error(`Caminho fora do padrão: ${caminho}`)
  const { data, error } = await clienteAdmin().storage.from(BUCKET).createSignedUploadUrl(caminho, { upsert: substituir })
  if (error || !data) throw new Error(error?.message ?? 'sem URL')
  return data.token
}

export async function prepararEnvio(pedido: unknown): Promise<Resultado<{ fotos: EnvioPreparado[] }>> {
  const { supabase } = await exigirAdmin()
  const validado = esquemaPedido.safeParse(pedido)
  if (!validado.success) return { ok: false, erro: 'Pedido de envio inválido. Recarregue a página.' }
  const { veiculo, fotos } = validado.data

  // A moto existe e é visível pra este administrador (RLS)
  const { data: moto } = await supabase.from('veiculos').select('id').eq('id', veiculo).maybeSingle()
  if (!moto) return { ok: false, erro: 'Essa moto não existe mais.' }

  const { count } = await supabase.from('veiculo_fotos').select('id', { count: 'exact', head: true }).eq('veiculo_id', veiculo)
  const livres = MAX_FOTOS - (count ?? 0)
  if (fotos.length > livres) {
    return { ok: false, erro: livres <= 0 ? 'Esta moto já tem 20 fotos, o máximo.' : `Cabem só mais ${livres} fotos nesta moto (o máximo é 20).` }
  }

  try {
    const preparados: EnvioPreparado[] = []
    for (const foto of fotos) {
      const id = randomUUID()
      const envios: EnvioPreparado['envios'] = []
      for (const largura of foto.larguras) {
        const caminho = `${veiculo}/${id}-${largura}.${extensao(foto.formato)}`
        envios.push({ largura, caminho, token: await urlAssinada(caminho) })
      }
      if (foto.og) {
        const caminho = `${veiculo}/${id}-og.jpg`
        envios.push({ largura: 'og', caminho, token: await urlAssinada(caminho, true) })
      }
      preparados.push({ id, envios })
    }
    return { ok: true, fotos: preparados }
  } catch (erro) {
    console.error('URL de envio falhou:', erro instanceof Error ? erro.message : erro)
    return { ok: false, erro: 'Não foi possível preparar o envio agora. Tente de novo em instantes.' }
  }
}

const esquemaConclusao = z.object({
  veiculo: uuid,
  fotos: z
    .array(
      z.object({
        id: uuid,
        larguras,
        formato: z.enum(['webp', 'jpeg']),
        largura_original: z.number().int().min(1).max(20000),
        altura_original: z.number().int().min(1).max(20000),
        cor_media: z.string().regex(/^#[0-9a-f]{6}$/),
        og: z.boolean(),
      }),
    )
    .min(1)
    .max(MAX_FOTOS),
})

/** Arquivos que existem de fato na pasta da moto, com o tipo que o Storage registrou. */
async function arquivosDaMoto(veiculo: string) {
  const { data, error } = await clienteAdmin().storage.from(BUCKET).list(veiculo, { limit: 1000 })
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((a) => [a.name, String((a.metadata as { mimetype?: string } | null)?.mimetype ?? '')]))
}

export async function concluirEnvio(pedido: unknown): Promise<Resultado<{ total: number }>> {
  const { supabase } = await exigirAdmin()
  const validado = esquemaConclusao.safeParse(pedido)
  if (!validado.success) return { ok: false, erro: 'Dados das fotos inválidos. Envie de novo.' }
  const { veiculo, fotos } = validado.data

  let existentes: Map<string, string>
  try {
    existentes = await arquivosDaMoto(veiculo)
  } catch (erro) {
    console.error('Lista do Storage falhou:', erro instanceof Error ? erro.message : erro)
    return { ok: false, erro: 'Não consegui conferir as fotos enviadas. Tente de novo.' }
  }

  // Só entra no banco a foto com todos os arquivos no lugar e no tipo certo
  for (const foto of fotos) {
    for (const largura of foto.larguras) {
      const nome = `${foto.id}-${largura}.${extensao(foto.formato)}`
      if (existentes.get(nome) !== tipoMime(foto.formato)) {
        return { ok: false, erro: 'Uma das fotos não terminou de subir. Tente enviar de novo.' }
      }
    }
  }

  const { data, error } = await supabase.rpc('adicionar_fotos', {
    p_veiculo: veiculo,
    p_fotos: fotos.map(({ og: _og, ...f }) => f),
  })
  if (error) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível cadastrar as fotos agora.') }

  const comOg = fotos.filter((f) => f.og && existentes.get(`${f.id}-og.jpg`) === 'image/jpeg').map((f) => f.id)
  if (comOg.length) await supabase.from('veiculo_fotos').update({ og: true }).in('id', comOg)

  refresh()
  return { ok: true, total: Number(data) }
}

export async function reordenarFotos(veiculo: string, ids: string[]): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  if (!uuid.safeParse(veiculo).success || !z.array(uuid).max(MAX_FOTOS).safeParse(ids).success) return { ok: false, erro: 'Pedido inválido.' }
  const { error } = await supabase.rpc('reordenar_fotos', { p_veiculo: veiculo, p_ids: ids })
  if (error) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível mudar a ordem agora.') }
  refresh()
  return { ok: true }
}

export async function definirFoco(veiculo: string, foto: string, x: number, y: number): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  const ponto = z.number().int().min(0).max(100)
  if (!uuid.safeParse(veiculo).success || !uuid.safeParse(foto).success || !ponto.safeParse(x).success || !ponto.safeParse(y).success) {
    return { ok: false, erro: 'Pedido inválido.' }
  }
  const { error } = await supabase.from('veiculo_fotos').update({ foco_x: x, foco_y: y }).eq('id', foto).eq('veiculo_id', veiculo)
  if (error) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível salvar o foco agora.') }
  refresh()
  return { ok: true }
}

export async function excluirFotos(veiculo: string, ids: string[]): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  if (!uuid.safeParse(veiculo).success || !z.array(uuid).min(1).max(MAX_FOTOS).safeParse(ids).success) return { ok: false, erro: 'Pedido inválido.' }
  const { data, error } = await supabase.rpc('excluir_fotos', { p_veiculo: veiculo, p_ids: ids })
  if (error) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível apagar a foto agora.') }
  await apagarArquivosDeFotos('veiculos', veiculo, (data ?? []) as { id: string; larguras: number[]; formato: 'webp' | 'jpeg' }[])
  refresh()
  return { ok: true }
}

/** URL pra refazer a imagem de compartilhamento (capa nova ou foco novo). */
export async function prepararOg(veiculo: string, foto: string): Promise<Resultado<{ caminho: string; token: string }>> {
  const { supabase } = await exigirAdmin()
  if (!uuid.safeParse(veiculo).success || !uuid.safeParse(foto).success) return { ok: false, erro: 'Pedido inválido.' }
  const { data } = await supabase.from('veiculo_fotos').select('id').eq('id', foto).eq('veiculo_id', veiculo).maybeSingle()
  if (!data) return { ok: false, erro: 'Essa foto não existe mais.' }
  try {
    const caminho = `${veiculo}/${foto}-og.jpg`
    return { ok: true, caminho, token: await urlAssinada(caminho, true) }
  } catch {
    return { ok: false, erro: 'Não foi possível preparar a imagem de compartilhamento.' }
  }
}

export async function marcarOg(veiculo: string, foto: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  if (!uuid.safeParse(veiculo).success || !uuid.safeParse(foto).success) return { ok: false, erro: 'Pedido inválido.' }
  const existentes = await arquivosDaMoto(veiculo).catch(() => new Map<string, string>())
  if (existentes.get(`${foto}-og.jpg`) !== 'image/jpeg') return { ok: false, erro: 'A imagem de compartilhamento não subiu.' }
  const { error } = await supabase.from('veiculo_fotos').update({ og: true }).eq('id', foto).eq('veiculo_id', veiculo)
  if (error) return { ok: false, erro: mensagemDoBanco(error) }
  return { ok: true }
}
