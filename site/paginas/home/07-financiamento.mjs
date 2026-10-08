/**
 * Financiamento 100% online: título, os 4 passos e a moto à direita (no celular,
 * embaixo). A frase da simulação vai junto: sem ela, a parcela pode virar oferta de
 * crédito (seção 4.6 do plano).
 */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { FINANCIAMENTO, SITE } from '../../conteudo.mjs'
import { titulo } from '../comum.mjs'

export const css = ['home-financiamento']

export function render(_dados, { icone, imagens }) {
  return html`<section class="financiamento secao secao--preta" id="financiamento" aria-labelledby="titulo-financiamento">
  <div class="financiamento__moto" aria-hidden="true">${imagens.picture({ nome: 'financ-moto', sizes: '(min-width: 1024px) 40vw, 100vw', alt: '' })}</div>
  <div class="container financiamento__conteudo">
    ${titulo(FINANCIAMENTO.titulo, { id: 'titulo-financiamento', classe: 'titulo financiamento__titulo' })}
    <p class="financiamento__sub">${FINANCIAMENTO.sub}</p>
    <ol class="passos" role="list">${FINANCIAMENTO.passos.map(
      (passo, i) => html`<li class="passo"><span class="passo__numero" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>${icone(passo.icone, 'light', 'passo__icone')}<p class="passo__texto"><span class="sr-only">Passo ${i + 1}: </span>${passo.texto}</p></li>`,
    )}</ol>
    <div class="financiamento__rodape">
      <a class="botao botao--whats botao--grande" href="${linkWhatsapp({ origem: 'financiamento' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Simular no WhatsApp</a>
      <p class="financiamento__aviso">${SITE.avisoParcela}</p>
    </div>
  </div>
</section>`
}
