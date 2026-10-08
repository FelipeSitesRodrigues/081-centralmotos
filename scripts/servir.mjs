/**
 * Servidor local da vitrine (site/dist), imitando a Vercel: endereço sem .html
 * (cleanUrls), 404.html pra o que não existe, compressão (brotli ou gzip, como a
 * Vercel: o Lighthouse mede o peso de verdade), cabeçalhos de cache e a rota /api/w,
 * que aqui monta o link do WhatsApp com o contatos.json do build (a de verdade, na
 * Vercel, também conta o clique).
 *
 *   node scripts/servir.mjs [porta]      (padrão 4081)
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { constants, createBrotliCompress, createGzip } from 'node:zlib'
import { mensagemWhatsapp, urlWaMe } from '../compartilhado/vitrine/whatsapp.mjs'

const DIST = path.resolve('site/dist')
const PORTA = Number(process.argv[2] ?? 4081)
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

function rotaWhatsapp(url, resposta) {
  const contatos = JSON.parse(readFileSync(path.join(DIST, 'contatos.json'), 'utf8'))
  const origem = url.searchParams.get('o') ?? 'outro'
  const moto = contatos.motos[url.searchParams.get('m') ?? ''] ?? null
  const loja = contatos.lojas[url.searchParams.get('l') ?? ''] ?? null
  const destino = loja ?? contatos.principal
  const texto = mensagemWhatsapp({ origem, moto, loja })
  resposta.writeHead(303, { Location: urlWaMe(destino.whatsapp, texto), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
  resposta.end()
}

createServer((pedido, resposta) => {
  const url = new URL(pedido.url, `http://localhost:${PORTA}`)
  if (url.pathname === '/api/w') return rotaWhatsapp(url, resposta)

  let caminho = decodeURIComponent(url.pathname)
  if (caminho.endsWith('/')) caminho += 'index.html'
  let arquivo = path.join(DIST, caminho)
  if (!arquivo.startsWith(DIST)) return resposta.writeHead(400).end()
  // /estoque é estoque.html mesmo existindo a pasta estoque/ (as páginas das motos)
  if ((!existsSync(arquivo) || statSync(arquivo).isDirectory()) && existsSync(`${arquivo}.html`)) arquivo = `${arquivo}.html`

  let status = 200
  if (!existsSync(arquivo) || statSync(arquivo).isDirectory()) {
    arquivo = path.join(DIST, '404.html')
    status = 404
  }
  const ext = path.extname(arquivo)
  const cache = ext === '.html' || ext === '.json' ? 'no-cache' : 'public, max-age=31536000, immutable'
  const cabecalhos = { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': cache, Vary: 'Accept-Encoding' }
  const texto = ['.html', '.js', '.json', '.css', '.svg', '.txt', '.xml'].includes(ext)
  const aceita = String(pedido.headers['accept-encoding'] ?? '')
  if (texto && aceita.includes('br')) {
    resposta.writeHead(status, { ...cabecalhos, 'Content-Encoding': 'br' })
    createReadStream(arquivo).pipe(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })).pipe(resposta)
  } else if (texto && aceita.includes('gzip')) {
    resposta.writeHead(status, { ...cabecalhos, 'Content-Encoding': 'gzip' })
    createReadStream(arquivo).pipe(createGzip({ level: 9 })).pipe(resposta)
  } else {
    resposta.writeHead(status, cabecalhos)
    createReadStream(arquivo).pipe(resposta)
  }
}).listen(PORTA, () => console.log(`vitrine em http://localhost:${PORTA}`))
