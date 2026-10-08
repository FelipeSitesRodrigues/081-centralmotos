/**
 * Cartão da moto: home, estoque, "motos parecidas" e a prévia do painel.
 * Foto 3:2 com o ponto de foco, selo, nome, ano e km, parcela, "Ver detalhes" e
 * o WhatsApp da própria moto (ajuste 2 da seção 11.3 do plano).
 */
import { CORES_NOME } from './rotulos.mjs'
import { km, nomeCurto, nomeMoto, reais } from './formato.mjs'
import { dimensoes, srcsetFoto, TAMANHOS, urlFoto } from './fotos.mjs'
import { html } from './html.mjs'
import { seloPrincipal } from './selos.mjs'
import { linkWhatsapp } from './whatsapp.mjs'

/**
 * @typedef {{ arquivos: string, prazo: number, icone: (nome: string, peso?: string, classe?: string) => import('./html.mjs').Cru }} Contexto
 */

/** Texto alternativo da foto: o nome e a cor ("Honda Pop 110i 2025, vermelha"). */
export function altDaMoto(moto, sufixo = '') {
  const cor = moto.cor && moto.cor !== 'outra' ? `, ${CORES_NOME[moto.cor] ?? moto.cor}` : ''
  return `${nomeMoto(moto)}${cor}${sufixo}`
}

/**
 * @param {any} moto linha da view vitrine_motos
 * @param {Contexto} ctx
 * @param {{ prioridade?: boolean, nivel?: 2 | 3 }} [opcoes] prioridade: é a maior imagem da página (LCP)
 */
export function cardMoto(moto, ctx, { prioridade = false, nivel = 3 } = {}) {
  const nome = nomeMoto(moto)
  const curto = nomeCurto(moto)
  const capa = moto.fotos?.[0]
  const selo = seloPrincipal(moto)
  const href = `/estoque/${moto.slug}`
  const dim = capa ? dimensoes(capa) : null
  const titulo = nivel === 2 ? html`<h2 class="card__nome"><a href="${href}">${curto}</a></h2>` : html`<h3 class="card__nome"><a href="${href}">${curto}</a></h3>`

  return html`<article class="card">
  <a class="card__foto" href="${href}" tabindex="-1" aria-hidden="true" style="background-color:${capa?.cor_media ?? '#2a2a30'}">${
    capa && dim
      ? html`<img src="${urlFoto(ctx.arquivos, moto.id, capa, 480)}" srcset="${srcsetFoto(ctx.arquivos, moto.id, capa, 960)}" sizes="${TAMANHOS.card}" width="${dim.largura}" height="${dim.altura}" alt="${altDaMoto(moto)}" ${prioridade ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async" style="object-position:${capa.foco_x ?? 50}% ${capa.foco_y ?? 50}%">`
      : ''
  }<span class="selo selo--${selo.tipo}">${selo.texto}</span></a>
  <div class="card__corpo">
    ${titulo}
    <p class="card__ficha">${moto.ano_modelo} · ${km(moto.km)}</p>
    <p class="card__parcela"><span>${ctx.prazo}x de</span> <strong>${moto.parcela_exibida ? reais(moto.parcela_exibida) : 'Consulte'}</strong></p>
    <div class="card__botoes">
      <a class="botao botao--vermelho card__detalhes" href="${href}">Ver detalhes${ctx.icone('caret-right', 'bold')}</a>
      <a class="botao botao--whats botao--icone" href="${linkWhatsapp({ origem: 'card', codigo: moto.codigo })}" target="_blank" rel="noopener nofollow" aria-label="Chamar no WhatsApp sobre a ${nome}">${ctx.icone('whatsapp-logo', 'fill')}</a>
    </div>
  </div>
</article>`
}
