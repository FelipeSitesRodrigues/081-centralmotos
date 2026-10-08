/**
 * Troca: texto à esquerda e a imagem das duas motos com as setas à direita. No
 * celular (mockup): título, texto, imagem e o botão embaixo da imagem.
 */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { TROCA } from '../../conteudo.mjs'
import { titulo } from '../comum.mjs'

export const css = ['home-troca']

export function render(_dados, { icone, imagens }) {
  return html`<section class="troca secao secao--preta" id="troca" aria-labelledby="titulo-troca">
  <div class="container troca__grade">
    ${titulo(TROCA.titulo, { id: 'titulo-troca', classe: 'titulo troca__titulo' })}
    <p class="troca__texto">${TROCA.texto}</p>
    <div class="troca__imagem">${imagens.picture({
      nome: 'troca',
      sizes: '(min-width: 1240px) 760px, (min-width: 1024px) 62vw, 100vw',
      alt: 'Uma moto vermelha e uma preta lado a lado, com setas de troca entre elas',
    })}</div>
    <a class="botao botao--whats botao--grande troca__botao" href="${linkWhatsapp({ origem: 'troca' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Avaliar minha moto no WhatsApp</a>
  </div>
</section>`
}
