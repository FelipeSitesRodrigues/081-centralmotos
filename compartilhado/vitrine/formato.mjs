/**
 * Formatos em pt-BR, no fuso de Irecê e LEM (America/Bahia, UTC-3 o ano todo).
 * Usados pela vitrine (build.mjs) e pelo painel, pra os dois mostrarem igual.
 */

const FUSO = 'America/Bahia'

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const dinheiro = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * 1080 → "R$ 1.080" (parcela, sem centavos)
 * @param {number} valor
 */
export const reais = (valor) => `R$ ${inteiro.format(valor)}`

/**
 * 1987654 → "R$ 19.876,54" (preço, só no painel)
 * @param {number} centavos
 */
export const reaisCentavos = (centavos) => `R$ ${dinheiro.format(centavos / 100)}`

/**
 * 15000 → "15.000 km"
 * @param {number} valor
 */
export const km = (valor) => `${inteiro.format(valor)} km`

/**
 * 42 → "CM-0042"
 * @param {number} codigo
 */
export const codigoMoto = (codigo) => `CM-${String(codigo).padStart(4, '0')}`

/**
 * "2026-10-07T21:17:59Z" → "07/10/2026"
 * @param {string} iso
 */
export function data(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

/**
 * "2026-10-07T21:17:59Z" → "18:17"
 * @param {string} iso
 */
export function hora(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/**
 * "2026-10-07T21:17:59Z" → "07/10 às 18:17"
 * @param {string} iso
 */
export function dataHora(iso) {
  const d = new Date(iso)
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' }).format(d)
  return `${dia} às ${hora(iso)}`
}

/**
 * "Honda Pop 110i ES 2025" (o nome que vai no card, no WhatsApp e no título)
 * @param {{ marca?: string | null, modelo?: string | null, versao?: string | null, ano_modelo?: number | null }} moto
 */
export function nomeMoto({ marca, modelo, versao, ano_modelo }) {
  return [marca, modelo, versao, ano_modelo].filter(Boolean).join(' ')
}

/**
 * "Honda Pop 110i ES" (o nome do cartão: o ano vai na linha de baixo, como no mockup)
 * @param {{ marca?: string | null, modelo?: string | null, versao?: string | null }} moto
 */
export function nomeCurto({ marca, modelo, versao }) {
  return [marca, modelo, versao].filter(Boolean).join(' ')
}

/**
 * "5574999936265" → "(74) 99993-6265"
 * @param {string} whatsapp
 */
export function telefone(whatsapp) {
  const n = String(whatsapp).replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return n
}
