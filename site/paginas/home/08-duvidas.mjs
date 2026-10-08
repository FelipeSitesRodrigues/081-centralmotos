/**
 * Dúvidas: <details> nativo, abre sem JavaScript. As respostas vêm de conteudo.mjs;
 * enquanto o dono não confirmar, ficam marcadas e a trava de lançamento segura o
 * domínio de verdade.
 */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { DUVIDAS } from '../../conteudo.mjs'
import { titulo } from '../comum.mjs'

export const css = ['home-duvidas']

export function render(_dados, { icone }) {
  return html`<section class="duvidas secao secao--vermelha" id="duvidas" aria-labelledby="titulo-duvidas">
  <div class="container duvidas__grade">
    <div class="duvidas__cabeca">
      ${titulo([DUVIDAS.titulo], { id: 'titulo-duvidas', classe: 'titulo duvidas__titulo' })}
      <a class="botao botao--whats botao--grande" href="${linkWhatsapp({ origem: 'duvidas' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Falar no WhatsApp</a>
    </div>
    <div class="duvidas__lista">${DUVIDAS.itens.map(
      (q) => html`<details class="duvida">
      <summary class="duvida__pergunta"><span>${q.pergunta}</span>${icone('plus', 'bold', 'duvida__mais')}</summary>
      <p class="duvida__resposta">${q.resposta}</p>
    </details>`,
    )}</div>
  </div>
</section>`
}
