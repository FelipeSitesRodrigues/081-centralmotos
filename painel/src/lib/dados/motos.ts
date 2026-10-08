import 'server-only'
import type { Database } from '@central/vitrine/tipos'
import type { ClienteServidor } from '@/lib/supabase/servidor'
import type { Status } from '@/lib/rotulos'

/*
 * Leituras do painel. Sempre com o cliente da sessão do lojista (a RLS vale) e
 * sem cache: o painel mostra o dado de agora.
 */

export type LinhaPainel = Database['public']['Views']['painel_motos']['Row']

export type Capa = {
  id: string
  larguras: number[]
  formato: 'webp' | 'jpeg'
  largura: number
  altura: number
  foco_x: number
  foco_y: number
  cor_media: string | null
  og: boolean
}

const COLUNAS_LISTA =
  'id, codigo, slug, status, marca, modelo, versao, ano_fabricacao, ano_modelo, condicao, km, cor, parcela_exibida, preco_centavos, destaque, ordem, total_fotos, capa, publicado_em, vendido_em, atualizado_em, editado_em'

/** Busca sem acento, igual à coluna "busca" do banco. */
export const normalizarBusca = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[%_\\]/g, ' ')
    .trim()
    .slice(0, 60)

export async function listarMotos(supabase: ClienteServidor, filtro: { status: Status; busca?: string }) {
  let consulta = supabase.from('painel_motos').select(COLUNAS_LISTA).eq('status', filtro.status)

  const busca = filtro.busca ? normalizarBusca(filtro.busca) : ''
  for (const termo of busca.split(/\s+/).filter(Boolean).slice(0, 5)) {
    consulta = consulta.ilike('busca', `%${termo}%`)
  }

  // A mesma ordem do site pras que estão no ar; as outras, da mais recente
  if (filtro.status === 'publicado' || filtro.status === 'reservado') {
    consulta = consulta
      .order('destaque', { ascending: false })
      .order('ordem', { ascending: true })
      .order('publicado_em', { ascending: false })
  } else if (filtro.status === 'vendido') {
    consulta = consulta.order('vendido_em', { ascending: false })
  } else {
    consulta = consulta.order('atualizado_em', { ascending: false })
  }

  const { data, error } = await consulta.limit(300)
  if (error) throw new Error(`Não consegui ler o estoque: ${error.message}`)
  return data
}

/** Quantas motos em cada aba. */
export async function contarPorStatus(supabase: ClienteServidor) {
  const lista: Status[] = ['publicado', 'rascunho', 'reservado', 'vendido', 'arquivado']
  const contagens = await Promise.all(
    lista.map((status) => supabase.from('veiculos').select('id', { count: 'exact', head: true }).eq('status', status)),
  )
  return Object.fromEntries(lista.map((status, i) => [status, contagens[i]?.count ?? 0])) as Record<Status, number>
}

export async function lerMoto(supabase: ClienteServidor, id: string) {
  const [{ data: moto, error }, { data: fotos }, { data: pendencias }] = await Promise.all([
    supabase.from('painel_motos').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('veiculo_fotos')
      .select('id, posicao, larguras, formato, largura_original, altura_original, foco_x, foco_y, cor_media, og')
      .eq('veiculo_id', id)
      .order('posicao'),
    supabase.rpc('pendencias_publicacao', { p_veiculo: id }),
  ])
  if (error) throw new Error(`Não consegui ler a moto: ${error.message}`)
  if (!moto) return null
  return { moto, fotos: fotos ?? [], pendencias: (pendencias ?? []) as string[] }
}

/** Marcas e modelos pro formulário (cerca de 100 linhas). */
export async function lerCatalogo(supabase: ClienteServidor) {
  const [{ data: marcas }, { data: modelos }] = await Promise.all([
    supabase.from('marcas').select('id, nome, ativa').order('nome'),
    supabase.from('modelos').select('id, marca_id, nome, categoria, cilindrada, ativa').order('nome'),
  ])
  return { marcas: marcas ?? [], modelos: modelos ?? [] }
}

/** Coeficiente e arredondamento atuais, pra parcela ao vivo no formulário. */
export async function lerFinanciamento(supabase: ClienteServidor) {
  const { data: config } = await supabase.from('configuracoes').select('prazo_padrao, arredondar_para, limite_destaques').eq('id', true).maybeSingle()
  const prazo = config?.prazo_padrao ?? 48
  const { data: coef } = await supabase.from('financiamento_coeficientes').select('coeficiente, ativo').eq('prazo', prazo).maybeSingle()
  return {
    prazo,
    coeficiente: coef?.ativo ? Number(coef.coeficiente) : null,
    arredondar: config?.arredondar_para ?? 10,
    limiteDestaques: config?.limite_destaques ?? 8,
  }
}

export type Catalogo = Awaited<ReturnType<typeof lerCatalogo>>
export type Financiamento = Awaited<ReturnType<typeof lerFinanciamento>>
export type MotoCompleta = NonNullable<Awaited<ReturnType<typeof lerMoto>>>
