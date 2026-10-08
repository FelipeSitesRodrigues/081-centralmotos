/**
 * Estoque na home: até 8 motos (destaques primeiro, depois a ordem do painel e as
 * mais recentes). No celular aparecem 4 e o botão pro estoque completo, como no mockup.
 */
import { cardMoto } from '../../../compartilhado/vitrine/card-moto.mjs'
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { ESTOQUE, SITE } from '../../conteudo.mjs'
import { rotulo, titulo } from '../comum.mjs'

export const css = ['cards', 'home-estoque']

export function render(dados, ctx) {
  const { icone } = ctx
  const destaques = dados.aVenda.slice(0, 8)
  const total = dados.aVenda.length

  const lista = destaques.length
    ? html`<ul class="grade-cards" role="list">${destaques.map((moto, i) => html`<li${i >= 4 ? html` class="so-em-tela-larga"` : ''}>${cardMoto(moto, ctx)}</li>`)}</ul>`
    : html`<div class="estoque__vazio">
      <p>Estamos atualizando o estoque. Chame no WhatsApp que a gente mostra as motos disponíveis agora.</p>
      <a class="botao botao--whats" href="${linkWhatsapp({ origem: 'estoque_vazio' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Ver as motos no WhatsApp</a>
    </div>`

  return html`<section class="estoque secao secao--gelo" id="estoque" aria-labelledby="titulo-estoque">
  <div class="container">
    <div class="estoque__topo">
      <div class="estoque__cabeca">
        ${rotulo(ESTOQUE.rotulo)}
        ${titulo(ESTOQUE.titulo, { id: 'titulo-estoque' })}
      </div>
      <div class="estoque__lado">
        <p class="estoque__texto">${SITE.oQueE} ${ESTOQUE.texto}</p>
        <a class="botao botao--contorno-vermelho estoque__todos-topo" href="/estoque">Ver todo o estoque${icone('caret-right', 'bold')}</a>
      </div>
    </div>
    ${lista}
    ${total ? html`<a class="botao botao--contorno-vermelho botao--grande estoque__todos" href="/estoque">Ver todo o estoque${total > 1 ? ` (${total} motos)` : ''}${icone('arrow-right', 'bold')}</a>` : ''}
  </div>
</section>`
}
