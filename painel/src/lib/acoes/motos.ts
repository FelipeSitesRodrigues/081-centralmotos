'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { exigirAdmin } from '@/lib/acesso'
import { mensagemDoBanco } from '@/lib/erros'
import { errosPorCampo, esquemaMarcaNova, esquemaModeloNovo, esquemaMoto } from '@/lib/esquemas/moto'
import { STATUS, type Status } from '@/lib/rotulos'
import { apagarArquivosDeFotos } from '@/lib/fotos-servidor'

/*
 * Cadastro e situação das motos. Cada ação é endpoint público: confere o
 * administrador, valida a entrada com Zod e chama as funções do banco, que
 * têm as mesmas travas por baixo (RLS, transições, limites).
 */

const id = z.uuid()

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string; campos?: Record<string, string> }

/** "+ Nova moto": o rascunho nasce na hora, pra as fotos já poderem subir. */
export async function novaMoto() {
  const { supabase } = await exigirAdmin()
  const { data, error } = await supabase.rpc('criar_rascunho')
  if (error || !data) {
    console.error('criar_rascunho falhou:', error?.message)
    redirect('/estoque?erro=nova')
  }
  const { id: novo } = data as { id: string }
  redirect(`/estoque/${novo}`)
}

export async function salvarMoto(
  veiculo: string,
  dados: unknown,
  editadoEm: string,
): Promise<Resultado<{ editadoEm: string; parcela: number | null; pendencias: string[] }>> {
  const { supabase } = await exigirAdmin()
  if (!id.safeParse(veiculo).success) return { ok: false, erro: 'Moto inválida. Recarregue a página.' }

  const validado = esquemaMoto.safeParse(dados)
  if (!validado.success) {
    return { ok: false, erro: 'Confira os campos marcados.', campos: errosPorCampo(validado.error) }
  }

  const { data, error } = await supabase.rpc('salvar_veiculo', {
    p_id: veiculo,
    p_dados: validado.data,
    p_editado_em: editadoEm,
  })
  if (error || !data) return { ok: false, erro: mensagemDoBanco(error) }

  const salvo = data as { editado_em: string; parcela_exibida: number | null }
  const { data: pendencias } = await supabase.rpc('pendencias_publicacao', { p_veiculo: veiculo })
  refresh()
  return { ok: true, editadoEm: salvo.editado_em, parcela: salvo.parcela_exibida, pendencias: (pendencias ?? []) as string[] }
}

const esquemaStatus = z.enum(Object.keys(STATUS) as [Status, ...Status[]])

export async function mudarStatus(
  veiculo: string,
  novo: string,
): Promise<Resultado<{ status: Status; slug: string | null; editadoEm: string }>> {
  const { supabase } = await exigirAdmin()
  const status = esquemaStatus.safeParse(novo)
  if (!id.safeParse(veiculo).success || !status.success) return { ok: false, erro: 'Pedido inválido. Recarregue a página.' }

  const { data, error } = await supabase.rpc('alterar_status', { p_veiculo: veiculo, p_status: status.data })
  if (error || !data) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível mudar a situação agora.') }

  const r = data as { status: Status; slug: string | null; editado_em: string }
  refresh()
  return { ok: true, status: r.status, slug: r.slug, editadoEm: r.editado_em }
}

/** Liga ou desliga o destaque direto da lista (a estrela). */
export async function alternarDestaque(veiculo: string, destaque: boolean, editadoEm: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  if (!id.safeParse(veiculo).success || typeof destaque !== 'boolean') return { ok: false, erro: 'Pedido inválido.' }

  const { error } = await supabase.rpc('salvar_veiculo', { p_id: veiculo, p_dados: { destaque }, p_editado_em: editadoEm })
  if (error) return { ok: false, erro: mensagemDoBanco(error) }
  refresh()
  return { ok: true }
}

/** Exclusão definitiva (rascunho que nunca foi pro ar, ou arquivada). Apaga as fotos do Storage junto. */
export async function excluirMoto(veiculo: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin()
  if (!id.safeParse(veiculo).success) return { ok: false, erro: 'Pedido inválido.' }

  const { data, error } = await supabase.rpc('excluir_veiculo', { p_veiculo: veiculo })
  if (error || !data) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível excluir agora.') }

  const { fotos } = data as { fotos: { id: string; larguras: number[]; formato: 'webp' | 'jpeg'; og: boolean }[] }
  // O banco já apagou as linhas; se o Storage falhar aqui, a limpeza diária pega os órfãos
  await apagarArquivosDeFotos('veiculos', veiculo, fotos)
  redirect('/estoque?ok=excluida')
}

// ---------------------------------------------------------------------------
// Catálogo: modelo ou marca que faltou ("não achei, cadastrar")
// ---------------------------------------------------------------------------

const slugDe = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export async function cadastrarModelo(
  dados: unknown,
): Promise<Resultado<{ modelo: { id: number; marca_id: number; nome: string; categoria: string; cilindrada: number | null; ativa: boolean } }>> {
  const { supabase } = await exigirAdmin()
  const validado = esquemaModeloNovo.safeParse(dados)
  if (!validado.success) return { ok: false, erro: 'Confira os campos do modelo.', campos: errosPorCampo(validado.error) }

  const slug = slugDe(validado.data.nome)
  if (!slug) return { ok: false, erro: 'Digite o nome do modelo com letras ou números.' }

  const { data, error } = await supabase
    .from('modelos')
    .insert({ ...validado.data, slug })
    .select('id, marca_id, nome, categoria, cilindrada, ativa')
    .single()
  if (error || !data) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível cadastrar o modelo agora.') }
  return { ok: true, modelo: data }
}

export async function cadastrarMarca(dados: unknown): Promise<Resultado<{ marca: { id: number; nome: string; ativa: boolean } }>> {
  const { supabase } = await exigirAdmin()
  const validado = esquemaMarcaNova.safeParse(dados)
  if (!validado.success) return { ok: false, erro: 'Confira o nome da marca.', campos: errosPorCampo(validado.error) }

  const slug = slugDe(validado.data.nome)
  if (!slug) return { ok: false, erro: 'Digite o nome da marca com letras ou números.' }

  const { data, error } = await supabase.from('marcas').insert({ nome: validado.data.nome, slug }).select('id, nome, ativa').single()
  if (error || !data) return { ok: false, erro: mensagemDoBanco(error, 'Não foi possível cadastrar a marca agora.') }
  return { ok: true, marca: data }
}
