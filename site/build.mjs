/**
 * Build da vitrine da Central Motos: HTML, CSS e JS estático em site/dist (seção 8 do plano).
 *
 *   node site/build.mjs              lê o banco com a chave pública (NEXT_PUBLIC_SUPABASE_URL e _ANON_KEY)
 *   node site/build.mjs --exemplo    lê site/exemplo/dados.json (desenvolvimento, sem banco)
 *
 * Variáveis:
 *   SITE_DOMINIO   domínio de verdade (https://centralmotos.com.br). Só com ele o site é
 *                  indexado (canonical, sitemap, robots aberto) e a trava de lançamento vale.
 *                  Sem ele (preview da Vercel, máquina local), tudo sai com noindex.
 *   PUBLICACAO_SEGREDO  avisa o banco que esta publicação terminou (etapa 5).
 *
 * Como funciona:
 * - Cada página leva no <style> só o CSS que usa (site/css: _fontes, _base, cabecalho,
 *   rodape e os das seções), minificado. Nenhum <script> inline: os JS vão pra
 *   /assets/js com o hash no nome e entram com defer (CSP script-src 'self').
 * - Ícones: sprite por página com só os usados (site/lib/icones.json).
 * - Imagens fixas: <picture> com AVIF e WebP (site/assets/img/manifesto.json); a maior
 *   da página tem preload no topo do <head>.
 * - Fotos das motos: direto do Storage do Supabase, no tamanho certo por tela.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nomeMoto, reais } from '../compartilhado/vitrine/formato.mjs'
import { urlOg } from '../compartilhado/vitrine/fotos.mjs'
import { html } from '../compartilhado/vitrine/html.mjs'
import { DUVIDAS, SITE } from './conteudo.mjs'
import { carregarDados } from './dados.mjs'
import { criarSprite } from './lib/icones.mjs'
import { criarImagens } from './lib/imagens.mjs'
import { blocoJsonLd, estoqueJsonLd, faqJsonLd, lojaJsonLd, migalhasJsonLd, motoJsonLd, siteJsonLd } from './lib/schema.mjs'
import { cabecalho, documento, flutuante, rodape } from './paginas/comum.mjs'
import * as estoque from './paginas/estoque.mjs'
import * as moto from './paginas/moto.mjs'
import * as naoEncontrada from './paginas/nao-encontrada.mjs'
import * as politica from './paginas/politica.mjs'

const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const P = (...a) => path.join(RAIZ, ...a)
const DIST = P('dist')

const exemplo = process.argv.includes('--exemplo')
const dominio = (process.env.SITE_DOMINIO ?? '').replace(/\/+$/, '')
const producao = Boolean(dominio)
const BASE = dominio || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:4081')
const avisos = []
const inicio = Date.now()

// ---------------------------------------------------------------- dados
const dados = await carregarDados({ exemplo })

// ---------------------------------------------------------------- trava de lançamento (seção 8.1)
function travaDeLancamento() {
  const problemas = []
  if (exemplo) problemas.push('build com --exemplo (dados de mentira)')
  for (const loja of dados.lojas) {
    if (/a confirmar/i.test(`${loja.endereco} ${loja.nome}`)) problemas.push(`loja ${loja.cidade}: endereço a confirmar`)
    if (/^55(\d\d)9{8,9}$/.test(loja.whatsapp) || loja.whatsapp.endsWith('999999999')) problemas.push(`loja ${loja.cidade}: WhatsApp de exemplo`)
  }
  for (const q of DUVIDAS.itens) if (!q.confirmado) problemas.push(`dúvida sem resposta confirmada pelo dono: "${q.pergunta}"`)
  if (!dados.entregas.length) avisos.push('sem fotos de entrega: a seção de clientes chama pro Instagram')
  return problemas
}
const pendencias = travaDeLancamento()
if (producao && pendencias.length) {
  console.error(`TRAVA DE LANÇAMENTO: o domínio ${dominio} não recebe este site ainda:\n  ${pendencias.join('\n  ')}`)
  process.exit(1)
}
for (const p of pendencias) avisos.push(`pendente pro lançamento: ${p}`)

// ---------------------------------------------------------------- arquivos estáticos
rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

function copiarPasta(de, para, filtro = () => true) {
  if (!existsSync(de)) return
  mkdirSync(para, { recursive: true })
  for (const nome of readdirSync(de)) {
    if (nome.startsWith('.') || !filtro(nome)) continue
    const a = path.join(de, nome)
    const b = path.join(para, nome)
    if (statSync(a).isDirectory()) copiarPasta(a, b, filtro)
    else copyFileSync(a, b)
  }
}
copiarPasta(P('assets'), path.join(DIST, 'assets'), (nome) => nome !== 'manifesto.json')
if (exemplo) copiarPasta(P('exemplo/fotos'), path.join(DIST, 'exemplo-fotos'))

const gravar = (rota, conteudo) => {
  const arquivo = path.join(DIST, rota)
  mkdirSync(path.dirname(arquivo), { recursive: true })
  writeFileSync(arquivo, conteudo)
  return Buffer.byteLength(conteudo)
}

// ---------------------------------------------------------------- CSS e JS
function minCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .replace(/,\s+/g, ',')
    .replace(/;}/g, '}')
    .trim()
}

const cacheCss = new Map()
function css(nomes) {
  const lista = ['_fontes', '_base', 'cabecalho', 'rodape', ...nomes]
  const chave = lista.join(',')
  if (!cacheCss.has(chave)) {
    const texto = [...new Set(lista)]
      .map((nome) => {
        const arquivo = P('css', `${nome}.css`)
        if (!existsSync(arquivo)) {
          avisos.push(`CSS que não existe: ${nome}.css`)
          return ''
        }
        const c = readFileSync(arquivo, 'utf8')
        if ((c.match(/{/g) ?? []).length !== (c.match(/}/g) ?? []).length) avisos.push(`CSS com chaves desbalanceadas: ${nome}.css`)
        return c
      })
      .join('\n')
    cacheCss.set(chave, minCss(texto))
  }
  return cacheCss.get(chave)
}

/** JS com o hash no nome: pode ficar um ano em cache, e um JS novo ganha nome novo. */
const scripts = new Map()
function script(nome) {
  if (!scripts.has(nome)) {
    const codigo = readFileSync(P('js', `${nome}.js`), 'utf8')
    const hash = createHash('sha256').update(codigo).digest('hex').slice(0, 10)
    const rota = `/assets/js/${nome}.${hash}.js`
    gravar(rota, codigo)
    scripts.set(nome, rota)
  }
  return scripts.get(nome)
}

// ---------------------------------------------------------------- montagem de página
const SUPABASE_ORIGEM = dados.origem === 'banco' ? new URL(dados.arquivos).origin : null
const ogPadrao = { imagem: `${BASE}/assets/img/og-central-motos.jpg`, alt: 'Fachada da Central Motos com motos 0 km e seminovas' }

function montar({ rota, pagina, titulo, descricao, corpo, cssExtra = [], jsExtra = [], schema = null, og = ogPadrao, indexar = producao, comFlutuante = true, fotosDoBanco = false }) {
  const sprite = criarSprite(avisos)
  const imagens = criarImagens(avisos)
  const ctx = { icone: sprite.icone, imagens, arquivos: dados.arquivos, prazo: dados.config.prazo, config: dados.config, lojas: dados.lojas, pagina }
  const miolo = corpo(ctx)
  const conteudo = html`${cabecalho(ctx)}
${miolo}
${rodape(ctx)}
${comFlutuante ? flutuante(ctx) : ''}`
  const url = `${BASE}${rota === '/' ? '/' : rota}`
  const pronto = documento({
    titulo,
    descricao,
    url,
    indexar,
    og,
    preloads: imagens.linksPreload(),
    preconectar: fotosDoBanco ? SUPABASE_ORIGEM : null,
    css: css(cssExtra),
    corpo: conteudo,
    sprite: sprite.sprite(),
    scripts: ['base', ...jsExtra].map(script),
    schema,
  })
  if (/[—–]/.test(pronto.replace(/<style>[\s\S]*?<\/style>/, ''))) avisos.push(`[${rota}] travessão no texto (regra da casa)`)
  if ((pronto.match(/<h1[\s>]/g) ?? []).length !== 1) avisos.push(`[${rota}] precisa de exatamente 1 h1`)
  return pronto
}

const relatorio = []
const salvar = (rota, arquivo, conteudo) => relatorio.push([rota, gravar(arquivo, conteudo)])

// ---------------------------------------------------------------- home
const secoes = await Promise.all(
  readdirSync(P('paginas/home'))
    .filter((f) => f.endsWith('.mjs'))
    .sort()
    .map((f) => import(new URL(`./paginas/home/${f}`, import.meta.url))),
)
const urlHome = `${BASE}/`
salvar(
  '/',
  'index.html',
  montar({
    rota: '/',
    pagina: 'home',
    titulo: 'Central Motos | Motos 0 km e seminovas em Irecê e LEM, na Bahia',
    descricao: `${SITE.oQueE} Financiamento 100% online, parcelas em até ${dados.config.prazo}x sem entrada e sua usada na troca. Chame no WhatsApp.`,
    corpo: (ctx) => html`<main id="conteudo">${secoes.map((s) => s.render(dados, ctx))}</main>`,
    cssExtra: [...secoes.flatMap((s) => s.css ?? []), 'home-abrindo'],
    // O carrossel de clientes só existe com mais de uma foto de entrega
    jsExtra: dados.entregas.length > 1 ? ['clientes'] : [],
    schema: blocoJsonLd([siteJsonLd(BASE), ...dados.lojas.map((l) => lojaJsonLd(l, BASE, dados.config.instagram)), faqJsonLd(DUVIDAS.itens, urlHome)]),
    fotosDoBanco: dados.aVenda.length > 0,
  }),
)

// ---------------------------------------------------------------- estoque
const urlEstoque = `${BASE}/estoque`
salvar(
  '/estoque',
  'estoque.html',
  montar({
    rota: '/estoque',
    pagina: 'estoque',
    titulo: `Estoque de motos 0 km e seminovas | Central Motos, Irecê e LEM`,
    descricao: `${dados.aVenda.length} motos 0 km e seminovas na Central Motos, em Irecê e Luís Eduardo Magalhães (BA). Veja a parcela em ${dados.config.prazo}x sem entrada e chame no WhatsApp.`,
    corpo: (ctx) => estoque.render(dados, ctx),
    cssExtra: estoque.css,
    jsExtra: estoque.js,
    schema: blocoJsonLd([estoqueJsonLd(dados.aVenda, { base: BASE, url: urlEstoque }), migalhasJsonLd([['Início', `${BASE}/`], ['Estoque', urlEstoque]], urlEstoque)]),
    fotosDoBanco: true,
  }),
)
gravar('estoque.json', JSON.stringify({ arquivos: dados.arquivos, prazo: dados.config.prazo, porPagina: estoque.POR_PAGINA, motos: estoque.indiceEstoque(dados.aVenda) }))

// ---------------------------------------------------------------- uma página por moto
const limiteVendida = Date.now() - 30 * 24 * 60 * 60 * 1000
const paginasMoto = [...dados.aVenda, ...dados.vendidas.filter((m) => m.vendido_em && Date.parse(m.vendido_em) > limiteVendida)]
for (const m of paginasMoto) {
  const nome = nomeMoto(m)
  const rota = `/estoque/${m.slug}`
  const url = `${BASE}${rota}`
  const vendida = m.status === 'vendido'
  const capa = m.fotos[0]
  const lojasTexto = dados.lojas.map((l) => l.cidade === 'Luís Eduardo Magalhães' ? 'LEM' : l.cidade).join(' e ')
  const km = m.condicao === '0km' ? '0 km' : `${new Intl.NumberFormat('pt-BR').format(m.km)} km`
  salvar(
    rota,
    `estoque/${m.slug}.html`,
    montar({
      rota,
      pagina: 'moto',
      titulo: vendida ? `${nome} (vendida) | Central Motos` : `${nome} ${m.condicao === '0km' ? '0 km' : 'seminova'} em ${lojasTexto} | Central Motos`,
      descricao: vendida
        ? `A ${nome} já foi vendida. Veja motos parecidas no estoque da Central Motos, em Irecê e Luís Eduardo Magalhães (BA).`
        : `${nome}, ${km}, ${m.parcela_exibida ? `${dados.config.prazo}x de ${reais(m.parcela_exibida)} sem entrada` : 'parcelas sem entrada'}. Financiamento 100% online e sua usada na troca. Central Motos, Irecê e LEM (BA).`,
      corpo: (ctx) => moto.render(m, dados, ctx),
      cssExtra: moto.css,
      jsExtra: m.fotos.length > 1 ? moto.js : [],
      schema: blocoJsonLd([motoJsonLd(m, { base: BASE, arquivos: dados.arquivos, url }), migalhasJsonLd([['Início', `${BASE}/`], ['Estoque', `${BASE}/estoque`], [nome, url]], url)]),
      og: capa?.og ? { imagem: `${urlOg(dados.arquivos, m.id, capa)}?v=${encodeURIComponent(m.atualizado_em ?? '')}`, alt: nome, tipo: 'product' } : { ...ogPadrao, alt: nome },
      indexar: producao && !vendida,
      comFlutuante: false,
      fotosDoBanco: true,
    }),
  )
}

// ---------------------------------------------------------------- política e 404
salvar(
  '/politica-de-privacidade',
  'politica-de-privacidade.html',
  montar({
    rota: '/politica-de-privacidade',
    pagina: 'politica',
    titulo: 'Política de privacidade | Central Motos',
    descricao: 'Como o site da Central Motos trata dados: sem formulário, sem cookies de rastreamento e só a contagem de cliques no WhatsApp.',
    corpo: (ctx) => politica.render(dados, ctx),
    cssExtra: politica.css,
  }),
)
salvar(
  '/404',
  '404.html',
  montar({
    rota: '/404',
    pagina: '404',
    titulo: 'Página não encontrada | Central Motos',
    descricao: 'Essa página não existe. Veja o estoque de motos 0 km e seminovas da Central Motos.',
    corpo: (ctx) => naoEncontrada.render(dados, ctx),
    cssExtra: naoEncontrada.css,
    indexar: false,
  }),
)

// ---------------------------------------------------------------- contatos da rota /api/w
// A função lê este arquivo no clique: zero consulta ao banco pra montar o link (seção 7.3).
gravar(
  'contatos.json',
  JSON.stringify({
    principal: dados.lojaPrincipal ? { id: dados.lojaPrincipal.id, cidade: dados.lojaPrincipal.cidade, whatsapp: dados.lojaPrincipal.whatsapp } : null,
    lojas: Object.fromEntries(dados.lojas.map((l) => [l.id, { cidade: l.cidade, whatsapp: l.whatsapp }])),
    motos: Object.fromEntries(paginasMoto.map((m) => [m.codigo, { marca: m.marca, modelo: m.modelo, versao: m.versao, ano_modelo: m.ano_modelo, codigo: m.codigo }])),
  }),
)

// ---------------------------------------------------------------- robots e sitemap
if (producao) {
  const hoje = new Date().toISOString()
  const urls = [
    { loc: `${BASE}/`, lastmod: hoje },
    { loc: urlEstoque, lastmod: hoje },
    ...dados.aVenda.map((m) => ({ loc: `${BASE}/estoque/${m.slug}`, lastmod: m.atualizado_em ?? hoje })),
    { loc: `${BASE}/politica-de-privacidade`, lastmod: hoje },
  ]
  gravar('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  gravar('robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /estoque.json\nDisallow: /contatos.json\n\nSitemap: ${BASE}/sitemap.xml\n`)
} else {
  // Fora do domínio de verdade (preview da Vercel, máquina local): nada indexa
  gravar('robots.txt', 'User-agent: *\nDisallow: /\n')
}

// ---------------------------------------------------------------- fim
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
for (const [rota, bytes] of relatorio.slice(0, 6)) console.log(`ok ${rota.padEnd(48)} ${kb(bytes).padStart(9)}`)
if (relatorio.length > 6) console.log(`ok ... e mais ${relatorio.length - 6} páginas`)
console.log(
  `${relatorio.length} páginas, ${dados.aVenda.length} motos à venda, ${paginasMoto.length - dados.aVenda.length} vendidas recentes · dados: ${dados.origem} · ${producao ? `PRODUÇÃO (${dominio})` : 'sem domínio: noindex'} · ${((Date.now() - inicio) / 1000).toFixed(1)} s`,
)
if (avisos.length) console.log(`AVISOS:\n  ${[...new Set(avisos)].join('\n  ')}`)
