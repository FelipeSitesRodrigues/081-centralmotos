/**
 * Peças que toda página usa: rótulo de seção, título com a parte vermelha,
 * cabeçalho, rodapé, botão flutuante de WhatsApp e a casca do documento.
 */
import { telefone } from '../../compartilhado/vitrine/formato.mjs'
import { cru, esc, html } from '../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../compartilhado/vitrine/whatsapp.mjs'
import { MENU, RODAPE } from '../conteudo.mjs'

/** Linha vermelha + texto pequeno em caixa alta (só em 4 seções: ajuste 4 da seção 11.3). */
export const rotulo = (texto, classe = '') => html`<p class="rotulo${classe ? cru(` ${classe}`) : ''}">${texto}</p>`

/**
 * Título em linhas; o trecho entre *asteriscos* sai em vermelho, como no mockup.
 * @param {string[]} linhas
 * @param {{ nivel?: number, id?: string, classe?: string }} [opcoes]
 */
export function titulo(linhas, { nivel = 2, id, classe = 'titulo' } = {}) {
  const miolo = linhas.map((linha) => {
    const partes = esc(linha).split('*')
    const marcada = partes.map((p, i) => (i % 2 ? `<span class="destaque">${p}</span>` : p)).join('')
    return cru(`<span class="titulo__linha">${marcada}</span>`)
  })
  return cru(`<h${nivel} class="${classe}"${id ? ` id="${id}"` : ''}>${miolo.join(' ')}</h${nivel}>`)
}

const hrefMenu = (item, pagina) => item.href ?? (pagina === 'home' ? `#${item.ancora}` : `/#${item.ancora}`)
const atual = (item, pagina) => (pagina === 'home' && item.ancora === 'inicio') || ((pagina === 'estoque' || pagina === 'moto') && item.href === '/estoque')

export function cabecalho(ctx) {
  const { icone, imagens, pagina, config } = ctx
  const links = (classe) =>
    MENU.map((item) => html`<li><a class="${classe}" href="${hrefMenu(item, pagina)}"${atual(item, pagina) ? cru(' aria-current="page"') : ''}>${item.rotulo}</a></li>`)

  // Na home, no computador, o cabeçalho fica transparente sobre a foto do hero (mockup)
  return html`<header class="topo${pagina === 'home' ? cru(' topo--sobre') : ''}">
  <div class="container topo__barra">
    <a class="topo__logo" href="${pagina === 'home' ? '#inicio' : '/'}" aria-label="Central Motos, página inicial">${imagens.picture({ nome: 'logo', sizes: '(min-width: 1024px) 204px, 138px', alt: '', cedo: true, classeImg: 'topo__logo-img' })}</a>
    <nav class="topo__nav" aria-label="Principal"><ul role="list">${links('topo__link')}</ul></nav>
    <div class="topo__acoes">
      <a class="topo__insta" href="https://www.instagram.com/${config.instagram}/" target="_blank" rel="noopener" aria-label="Instagram da Central Motos">${icone('instagram-logo')}</a>
      <a class="botao botao--whats topo__whats" href="${linkWhatsapp({ origem: 'cabecalho' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}WhatsApp</a>
      <details class="menu" data-menu>
        <summary class="menu__botao"><span class="menu__abrir">${icone('list', 'bold')}<span class="sr-only">Abrir o menu</span></span><span class="menu__fechar">${icone('x', 'bold')}<span class="sr-only">Fechar o menu</span></span></summary>
        <nav class="menu__painel" aria-label="Menu">
          <ul role="list">${links('menu__link')}</ul>
          <a class="botao botao--whats botao--grande menu__whats" href="${linkWhatsapp({ origem: 'cabecalho' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Falar no WhatsApp</a>
        </nav>
      </details>
    </div>
  </div>
</header>`
}

export function rodape(ctx) {
  const { icone, imagens, lojas, config, pagina } = ctx
  const ano = new Date().getFullYear()
  return html`<footer class="rodape">
  <div class="container rodape__grade">
    <div class="rodape__marca">
      ${imagens.picture({ nome: 'logo', sizes: '204px', alt: 'Central Motos, compra, venda e troca', classeImg: 'rodape__logo' })}
      <p class="rodape__texto">${RODAPE.texto}</p>
      <ul class="rodape__redes" role="list">
        <li><a href="https://www.instagram.com/${config.instagram}/" target="_blank" rel="noopener" aria-label="Instagram da Central Motos">${icone('instagram-logo')}</a></li>
        <li><a href="${linkWhatsapp({ origem: 'rodape' })}" target="_blank" rel="noopener nofollow" aria-label="WhatsApp da Central Motos">${icone('whatsapp-logo', 'fill')}</a></li>
      </ul>
    </div>
    <nav class="rodape__coluna" aria-label="Rodapé">
      <h2 class="rodape__titulo">Navegação</h2>
      <ul role="list">${MENU.map((item) => html`<li><a href="${hrefMenu(item, pagina)}">${item.rotulo}</a></li>`)}<li><a href="/politica-de-privacidade">Política de privacidade</a></li></ul>
    </nav>
    <div class="rodape__coluna">
      <h2 class="rodape__titulo">Contato</h2>
      <ul role="list" class="rodape__contatos">
        ${lojas.map((l) => html`<li><a href="${linkWhatsapp({ origem: 'rodape', loja: l.id })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill', 'i--whats')}<span><span class="rodape__cidade">${l.cidade}</span> ${telefone(l.whatsapp)}</span></a></li>`)}
        <li><a href="https://www.instagram.com/${config.instagram}/" target="_blank" rel="noopener">${icone('instagram-logo', 'regular', 'i--insta')}<span>@${config.instagram}</span></a></li>
      </ul>
    </div>
    <div class="rodape__coluna">
      <h2 class="rodape__titulo">Endereços</h2>
      <ul role="list" class="rodape__enderecos">
        ${lojas.map((l) => html`<li>${icone('map-pin', 'fill', 'i--pino')}<span><span class="rodape__cidade">${l.cidade}</span>${l.endereco}${l.bairro ? `, ${l.bairro}` : ''}, ${l.cidade}, ${l.uf}${l.cep ? `, CEP ${l.cep}` : ''}</span></li>`)}
      </ul>
    </div>
  </div>
  <div class="container rodape__base">
    <p>© ${ano} Central Motos. Todos os direitos reservados.</p>
    <p class="rodape__credito"><a href="${RODAPE.credito.url}" target="_blank" rel="noopener">${RODAPE.credito.texto}</a></p>
  </div>
</footer>`
}

export const flutuante = (ctx) =>
  html`<a class="flutuante" href="${linkWhatsapp({ origem: 'flutuante' })}" target="_blank" rel="noopener nofollow" aria-label="Falar no WhatsApp">${ctx.icone('whatsapp-logo', 'fill')}</a>`

/**
 * Documento inteiro. Nenhum script inline: a CSP da vitrine é script-src 'self'.
 * A classe "abrindo" do <html> segura as fotos de baixo da dobra até a primeira pintura
 * (o base.js tira; ver home-abrindo.css).
 * @param {{ titulo: string, descricao: string, url: string, indexar: boolean, og: { imagem: string, alt: string, tipo?: string },
 *           preloads: any, css: string, corpo: any, sprite: any, scripts: string[], schema: any, preconectar?: string | null }} p
 */
export function documento(p) {
  return `<!doctype html>
<html lang="pt-BR" class="abrindo">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(p.titulo)}</title>
  <meta name="description" content="${esc(p.descricao)}">
  ${p.indexar ? `<link rel="canonical" href="${esc(p.url)}">` : '<meta name="robots" content="noindex, nofollow">'}
  <link rel="preload" href="/assets/fontes/anton.woff2" as="font" type="font/woff2" crossorigin>
  ${p.preloads}
  ${p.preconectar ? `<link rel="preconnect" href="${esc(p.preconectar)}">` : ''}
  <style>${p.css}</style>
  <meta property="og:type" content="${esc(p.og.tipo ?? 'website')}">
  <meta property="og:site_name" content="Central Motos">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="${esc(p.titulo)}">
  <meta property="og:description" content="${esc(p.descricao)}">
  <meta property="og:url" content="${esc(p.url)}">
  <meta property="og:image" content="${esc(p.og.imagem)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(p.og.alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <meta name="theme-color" content="#0b0b0d">
  <meta name="format-detection" content="telephone=no">
  ${p.schema ?? ''}
</head>
<body>
${p.sprite}
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
${p.corpo}
${p.scripts.map((s) => `<script src="${esc(s)}" defer></script>`).join('\n')}
</body>
</html>
`
}
