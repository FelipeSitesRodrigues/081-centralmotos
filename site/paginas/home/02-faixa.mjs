/** Faixa vermelha com os 4 argumentos: 2x2 no celular, 4 em linha a partir de 900 px. */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { FAIXA } from '../../conteudo.mjs'

export const css = ['home-faixa']

export function render(_dados, { icone }) {
  return html`<section class="faixa" aria-label="Vantagens da Central Motos">
  <ul class="container faixa__lista" role="list">${FAIXA.map(
    (item) => html`<li class="faixa__item">${icone(item.icone, 'light', 'faixa__icone')}<p class="faixa__texto"><span>${item.linha1}</span> <strong>${item.linha2}</strong></p></li>`,
  )}</ul>
</section>`
}
