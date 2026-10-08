/**
 * Quem compra, aprova. Com fotos de entrega cadastradas no painel: carrossel com
 * setas (scroll-snap, sem padding no trilho: lição da 080 sobre o LCP). Sem fotos:
 * chama pro Instagram da loja. Foto de cliente inventada não entra (ajuste 7 da
 * seção 11.3: as do mockup são de IA).
 */
import { srcsetEntrega, urlEntrega } from '../../../compartilhado/vitrine/fotos.mjs'
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { CLIENTES } from '../../conteudo.mjs'
import { rotulo, titulo } from '../comum.mjs'

export const css = ['home-clientes']
export const js = ['clientes']

export function render(dados, { icone, arquivos, config }) {
  const fotos = dados.entregas
  const instagram = `https://www.instagram.com/${config.instagram}/`

  const corpo = fotos.length
    ? html`<div class="clientes__carrossel" data-carrossel>
      <ul class="clientes__trilho" role="list" tabindex="0" aria-label="Fotos de entregas">${fotos.map((f, i) => {
        const alt = f.legenda ? `Entrega na Central Motos: ${f.legenda}` : `Cliente recebendo a moto na Central Motos, foto ${i + 1}`
        return html`<li class="clientes__foto" style="background-color:${f.cor_media ?? '#ddd'}"><img src="${urlEntrega(arquivos, f, 480)}" srcset="${srcsetEntrega(arquivos, f)}" sizes="(min-width: 1024px) 248px, 72vw" width="480" height="${Math.round((480 * f.altura_original) / f.largura_original)}" alt="${alt}" loading="lazy" decoding="async" style="object-position:${f.foco_x ?? 50}% ${f.foco_y ?? 50}%">${f.legenda ? html`<span class="clientes__legenda">${f.legenda}</span>` : ''}</li>`
      })}</ul>
    </div>`
    : html`<div class="clientes__instagram">
      <p>${CLIENTES.semFotos}</p>
      <a class="botao botao--escuro" href="${instagram}" target="_blank" rel="noopener">${icone('instagram-logo')}Ver as entregas no Instagram</a>
    </div>`

  return html`<section class="clientes secao secao--gelo" id="clientes" aria-labelledby="titulo-clientes">
  <div class="container clientes__topo">
    <div>
      ${rotulo(CLIENTES.rotulo)}
      ${titulo(CLIENTES.titulo, { id: 'titulo-clientes' })}
    </div>
    <div class="clientes__lado">
      <p class="clientes__texto">${CLIENTES.texto}</p>
      ${fotos.length > 1 ? html`<div class="clientes__setas"><button type="button" class="seta" data-anterior aria-label="Fotos anteriores">${icone('caret-left', 'bold')}</button><button type="button" class="seta" data-proxima aria-label="Próximas fotos">${icone('caret-right', 'bold')}</button></div>` : ''}
    </div>
  </div>
  <div class="container">${corpo}</div>
</section>`
}
