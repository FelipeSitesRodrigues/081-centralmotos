/**
 * Hero. No computador: texto à esquerda sobre o degradê, fachada à direita (mockup).
 * No celular, a regra da casa (CLAUDE.md, desde a 035): título, imagem, subtítulo e
 * botões. Os filhos ficam soltos no grid e o grid-template-areas troca no celular.
 * Nada animado aqui: título e foto chegam prontos (lição da 080).
 */
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { HERO } from '../../conteudo.mjs'
import { rotulo, titulo } from '../comum.mjs'

export const css = ['home-hero']

export function render(_dados, { icone, imagens }) {
  return html`<section class="hero" id="inicio" aria-labelledby="titulo-hero">
  <div class="container hero__grade">
    ${rotulo(HERO.rotulo, 'hero__rotulo')}
    ${titulo(HERO.titulo, { nivel: 1, id: 'titulo-hero', classe: 'hero__titulo' })}
    <div class="hero__imagem">${imagens.picture({
      nome: 'hero-mob',
      sizes: '100vw',
      alt: 'Fachada da Central Motos com motos 0 km e seminovas na calçada, ao pôr do sol',
      prioridade: true,
      classeImg: 'hero__foto',
      desk: { nome: 'hero-desk', sizes: '74vw', media: '(min-width: 1024px)' },
    })}</div>
    <p class="hero__sub">${HERO.sub}</p>
    <div class="hero__botoes">
      <a class="botao botao--vermelho botao--hero" href="#estoque">${icone('magnifying-glass', 'bold')}Ver estoque</a>
      <a class="botao botao--whats botao--hero" href="${linkWhatsapp({ origem: 'hero' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Falar no WhatsApp</a>
    </div>
  </div>
</section>`
}
