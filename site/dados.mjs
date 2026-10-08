/**
 * Dados da vitrine. No build normal, lê o banco com a chave pública (anon), pela
 * view vitrine_motos: a RLS garante que preço, custo e observação nunca chegam
 * aqui, mesmo que a consulta fosse escrita errada (seção 8.1 do plano).
 *
 * Com --exemplo, lê site/exemplo/dados.json (as 3 motos reais que a loja mandou,
 * pra desenvolver e comparar com o mockup antes do catálogo). O build no domínio
 * de verdade recusa o modo de exemplo.
 *
 * Se o banco não responder, o build falha e a Vercel mantém o site anterior no ar.
 */
import { readFileSync } from 'node:fs'

const VISIVEIS = ['publicado', 'reservado']

/** @param {{ exemplo: boolean }} opcoes */
export async function carregarDados({ exemplo }) {
  let bruto
  if (exemplo) {
    bruto = { ...JSON.parse(readFileSync(new URL('./exemplo/dados.json', import.meta.url), 'utf8')), arquivos: '/exemplo-fotos', origem: 'exemplo' }
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
    if (!url || !chave) throw new Error('Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (a chave pública).')
    const cabecalhos = { apikey: chave, ...(chave.startsWith('eyJ') ? { Authorization: `Bearer ${chave}` } : {}) }
    const ler = async (caminho) => {
      const resposta = await fetch(`${url}/rest/v1/${caminho}`, { headers: cabecalhos })
      if (!resposta.ok) throw new Error(`O banco não respondeu em ${caminho.split('?')[0]} (${resposta.status}): ${(await resposta.text()).slice(0, 300)}`)
      return resposta.json()
    }
    const [motos, lojas, configuracoes, entregas] = await Promise.all([
      ler('vitrine_motos?select=*&order=destaque.desc,ordem.asc,publicado_em.desc'),
      ler('lojas?select=*&order=posicao.asc,id.asc'),
      ler('configuracoes?select=prazo_padrao,aviso_site,instagram'),
      ler('entregas?select=*&order=posicao.asc'),
    ])
    bruto = { motos, lojas, config: configuracoes[0] ?? {}, entregas, arquivos: `${url}/storage/v1/object/public`, origem: 'banco' }
  }

  const ordem = (a, b) =>
    Number(b.destaque) - Number(a.destaque) || (a.ordem ?? 0) - (b.ordem ?? 0) || String(b.publicado_em ?? '').localeCompare(String(a.publicado_em ?? ''))

  const motos = bruto.motos.filter((m) => m.slug && m.fotos?.length)
  const aVenda = motos.filter((m) => VISIVEIS.includes(m.status)).sort(ordem)
  const vendidas = motos.filter((m) => m.status === 'vendido')
  const lojas = bruto.lojas.filter((l) => l.ativa !== false)

  return {
    origem: bruto.origem,
    arquivos: bruto.arquivos,
    aVenda,
    vendidas,
    lojas,
    lojaPrincipal: lojas.find((l) => l.principal) ?? lojas[0] ?? null,
    entregas: (bruto.entregas ?? []).filter((e) => e.publicada !== false),
    config: {
      prazo: bruto.config.prazo_padrao ?? 48,
      aviso: bruto.config.aviso_site || null,
      instagram: bruto.config.instagram || 'centralmotoslem',
    },
  }
}

/**
 * Motos parecidas: mesmo tipo e faixa de parcela, depois o resto da faixa,
 * depois as mais recentes. Nunca a própria.
 */
export function parecidas(moto, aVenda, quantas = 4) {
  const outras = aVenda.filter((m) => m.id !== moto.id)
  const perto = (m) => (moto.parcela_exibida && m.parcela_exibida ? Math.abs(m.parcela_exibida - moto.parcela_exibida) / moto.parcela_exibida : 1)
  const nota = (m) => (m.categoria === moto.categoria ? 0 : 1) + (m.condicao === moto.condicao ? 0 : 0.5) + Math.min(perto(m), 1)
  return [...outras].sort((a, b) => nota(a) - nota(b)).slice(0, quantas)
}
