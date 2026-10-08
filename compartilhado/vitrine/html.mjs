/**
 * Template de HTML com escape automático. Todo valor interpolado é escapado,
 * a não ser que já seja HTML montado por outro template (ou marcado com cru()).
 * Assim nada digitado no painel entra cru na vitrine (seção 3 do plano).
 *
 *   html`<p>${moto.descricao}</p>`          → escapa a descrição
 *   html`<ul>${lista.map((x) => html`<li>${x}</li>`)}</ul>`
 *   html`<div>${cru(svgDoSprite)}</div>`    → só pra HTML gerado pelo próprio build
 */

export class Cru {
  /** @param {string} valor */
  constructor(valor) {
    this.valor = String(valor)
  }
  toString() {
    return this.valor
  }
}

/** @param {unknown} valor */
export const cru = (valor) => new Cru(String(valor ?? ''))

/** @param {unknown} valor */
export const esc = (valor) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** @param {unknown} v @returns {string} */
function converter(v) {
  if (v === null || v === undefined || v === false || v === true) return ''
  if (v instanceof Cru) return v.valor
  if (Array.isArray(v)) return v.map(converter).join('')
  return esc(v)
}

/**
 * @param {TemplateStringsArray} partes
 * @param {...unknown} valores
 */
export function html(partes, ...valores) {
  let saida = partes[0] ?? ''
  for (let i = 0; i < valores.length; i++) saida += converter(valores[i]) + (partes[i + 1] ?? '')
  return new Cru(saida)
}

/** Texto do painel com quebras de linha → parágrafos (escapados). @param {string | null | undefined} texto */
export function paragrafos(texto) {
  if (!texto) return new Cru('')
  return html`${texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => html`<p>${p.split('\n').map((linha, i) => (i ? html`<br>${linha}` : linha))}</p>`)}`
}
