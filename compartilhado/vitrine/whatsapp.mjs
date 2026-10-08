/**
 * Links de WhatsApp da vitrine. Todo botão aponta pra rota /api/w (seção 7.3 do
 * plano), que conta o clique e manda pro WhatsApp da loja certa. A rota só
 * recebe ids: nunca número nem texto, pra ninguém montar um link "oficial" que
 * abra o WhatsApp de outra pessoa.
 *
 * A mensagem é montada do lado do servidor (mensagemWhatsapp), a partir da
 * origem do clique e da moto.
 */
import { codigoMoto, nomeMoto } from './formato.mjs'

/** Origens aceitas (as mesmas da tabela cliques_whatsapp_dia). */
export const ORIGENS = ['card', 'pagina_moto', 'hero', 'cabecalho', 'flutuante', 'troca', 'financiamento', 'duvidas', 'lojas', 'rodape', 'estoque_vazio', 'vendida', 'outro']

/**
 * @param {{ origem: string, codigo?: number | null, loja?: number | null }} pedido
 */
export function linkWhatsapp({ origem, codigo, loja }) {
  const busca = new URLSearchParams({ o: ORIGENS.includes(origem) ? origem : 'outro' })
  if (codigo) busca.set('m', String(codigo))
  if (loja) busca.set('l', String(loja))
  return `/api/w?${busca}`
}

const GERAL = 'Olá! Vim pelo site da Central Motos e quero ver as motos disponíveis.'

/**
 * O texto que abre no WhatsApp.
 * @param {{ origem: string, moto?: { marca?: string|null, modelo?: string|null, versao?: string|null, ano_modelo?: number|null, codigo: number } | null, loja?: { cidade: string } | null }} pedido
 */
export function mensagemWhatsapp({ origem, moto, loja }) {
  const qual = moto ? `a ${nomeMoto(moto)} (código ${codigoMoto(moto.codigo)})` : null
  switch (origem) {
    case 'card':
    case 'pagina_moto':
      return qual ? `Olá! Vi no site ${qual} e quero saber mais.` : GERAL
    case 'vendida':
      return qual ? `Olá! Vi no site que ${qual} já foi vendida. Vocês têm outra parecida?` : GERAL
    case 'troca':
      return qual ? `Olá! Vi no site ${qual} e quero avaliar minha moto usada na troca.` : 'Olá! Vim pelo site e quero avaliar minha moto usada na troca.'
    case 'financiamento':
      return 'Olá! Vim pelo site e quero simular um financiamento.'
    case 'duvidas':
      return 'Olá! Vim pelo site e tenho uma dúvida.'
    case 'lojas':
      return loja ? `Olá! Vim pelo site e quero visitar a loja de ${loja.cidade}.` : GERAL
    case 'estoque_vazio':
      return 'Olá! Vim pelo site da Central Motos. Quais motos vocês têm agora?'
    default:
      return GERAL
  }
}

/** wa.me com o texto já codificado. @param {string} numero só dígitos, com 55 @param {string} texto */
export const urlWaMe = (numero, texto) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
