/**
 * Imagens fixas (hero, troca, logo): <picture> com AVIF e WebP a partir do
 * manifesto gerado por scripts/processar-imagens.mjs, com width e height reais.
 *
 * Direção de arte: `desk` põe outra imagem a partir de uma largura de tela (o
 * hero do celular é um recorte em pé; o do computador, a fachada inteira).
 * `prioridade` é a maior imagem da página (LCP): o pedido sai no topo do <head>
 * com a mesma lista e o mesmo sizes, pro navegador não baixar dois arquivos.
 */
import { readFileSync } from 'node:fs'
import { cru, html } from '../../compartilhado/vitrine/html.mjs'

const MANIFESTO = JSON.parse(readFileSync(new URL('../assets/img/manifesto.json', import.meta.url), 'utf8'))

function versoes(nome, ext) {
  return Object.entries(MANIFESTO)
    .map(([arquivo, m]) => ({ arquivo, m, w: Number((arquivo.match(new RegExp(`^${nome}-(\\d+)\\.${ext}$`)) ?? [])[1]) }))
    .filter((v) => v.w)
    .sort((a, b) => a.w - b.w)
}

const srcset = (lista) => lista.map((v) => `/assets/img/${v.arquivo} ${v.m.w}w`).join(', ')

/** @param {string[]} avisos */
export function criarImagens(avisos) {
  const preloads = []

  /**
   * @param {{ nome: string, sizes: string, alt: string, classe?: string, classeImg?: string, prioridade?: boolean, cedo?: boolean,
   *           max?: number, desk?: { nome: string, sizes: string, media: string } }} p
   * cedo: imagem pequena da primeira dobra (logo): sem lazy, sem preload
   */
  function picture({ nome, sizes, alt, classe = '', classeImg = '', prioridade = false, cedo = false, max = Infinity, desk }) {
    const avif = versoes(nome, 'avif')
    const webp = versoes(nome, 'webp')
    if (!webp.length) {
      avisos.push(`imagem fora do manifesto: ${nome}`)
      return cru('')
    }
    const principal = [...webp].reverse().find((v) => v.w <= max) ?? webp[0]
    const fontes = []
    if (desk) {
      const da = versoes(desk.nome, 'avif')
      const dw = versoes(desk.nome, 'webp')
      const maiorD = dw[dw.length - 1]?.m
      if (!dw.length) avisos.push(`imagem fora do manifesto: ${desk.nome}`)
      if (da.length) fontes.push(html`<source media="${desk.media}" type="image/avif" srcset="${srcset(da)}" sizes="${desk.sizes}" width="${maiorD?.w}" height="${maiorD?.h}">`)
      fontes.push(html`<source media="${desk.media}" type="image/webp" srcset="${srcset(dw)}" sizes="${desk.sizes}" width="${maiorD?.w}" height="${maiorD?.h}">`)
    }
    if (avif.length) fontes.push(html`<source type="image/avif" srcset="${srcset(avif)}" sizes="${sizes}">`)
    if (prioridade) preloads.push({ nome, sizes, desk })
    return html`<picture${classe ? cru(` class="${classe}"`) : ''}>${fontes}<img src="/assets/img/${principal.arquivo}" srcset="${srcset(webp)}" sizes="${sizes}" width="${principal.m.w}" height="${principal.m.h}" alt="${alt}"${classeImg ? cru(` class="${classeImg}"`) : ''} ${prioridade ? cru('fetchpriority="high"') : cedo ? cru('') : cru('loading="lazy"')} decoding="async"></picture>`
  }

  /** Links de preload do LCP (um por faixa de tela quando há direção de arte). */
  function linksPreload() {
    const inversa = (media) => {
      const x = /\(min-width:\s*([\d.]+)(px|em)\)/.exec(media)
      return x ? `(max-width: ${(Number(x[1]) - (x[2] === 'px' ? 0.02 : 0.001)).toFixed(3)}${x[2]})` : ''
    }
    const link = (nome, sizes, media) => {
      const avif = versoes(nome, 'avif')
      return avif.length
        ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${srcset(avif)}" imagesizes="${sizes}"${media ? ` media="${media}"` : ''} fetchpriority="high">`
        : ''
    }
    return cru(
      preloads
        .flatMap((p) => (p.desk ? [link(p.nome, p.sizes, inversa(p.desk.media)), link(p.desk.nome, p.desk.sizes, p.desk.media)] : [link(p.nome, p.sizes, '')]))
        .filter(Boolean)
        .join('\n  '),
    )
  }

  /** Só a URL do maior WebP (pra usos fora de <picture>). */
  const urlMaior = (nome) => {
    const webp = versoes(nome, 'webp')
    return webp.length ? `/assets/img/${webp[webp.length - 1].arquivo}` : ''
  }

  return { picture, linksPreload, urlMaior, preloads }
}

export const existeImagem = (arquivo) => Boolean(MANIFESTO[arquivo])
