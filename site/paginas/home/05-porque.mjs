/** Por que comprar: título à esquerda e 4 motivos com ícone (sem rótulo: ajuste 4 da seção 11.3). */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { PORQUE } from '../../conteudo.mjs'
import { titulo } from '../comum.mjs'

export const css = ['home-porque']

export function render(_dados, { icone }) {
  return html`<section class="porque secao secao--vermelha" aria-labelledby="titulo-porque">
  <div class="container porque__grade">
    ${titulo(PORQUE.titulo, { id: 'titulo-porque', classe: 'titulo porque__titulo' })}
    <ul class="porque__lista" role="list">${PORQUE.itens.map((item) => html`<li class="porque__item">${icone(item.icone, 'light', 'porque__icone')}<span>${item.texto}</span></li>`)}</ul>
  </div>
</section>`
}
