/**
 * Teste da vitrine num navegador de verdade (Chrome da máquina, puppeteer-core), com o
 * servidor local no ar (node scripts/servir.mjs).
 *
 *   node scripts/testar-vitrine.mjs [--base http://localhost:4081]
 *
 * Confere, em 11 larguras de 320 a 1920:
 * - nada estoura na lateral (scrollWidth medido, não o print: o print do Edge mente no celular);
 * - nenhum erro de console nem script bloqueado;
 * - toda imagem com width, height e alt; nenhuma imagem quebrada;
 * - um h1 por página; links internos que existem; WhatsApp só pela rota /api/w.
 * E o filtro do estoque: condição, busca, limpar e o estado na URL.
 */
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:4081'
const LARGURAS = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440, 1920]
const NAVEGADOR = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => existsSync(p))

const resultados = []
const conferir = (nome, ok, detalhe = '') => resultados.push({ nome, ok: Boolean(ok), detalhe })

const browser = await puppeteer.launch({ executablePath: NAVEGADOR, headless: true, args: ['--no-first-run', '--force-prefers-reduced-motion'] })

try {
  const pagina = await browser.newPage()
  const erros = []
  pagina.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 200)))
  pagina.on('pageerror', (e) => erros.push(`pageerror: ${e.message.slice(0, 200)}`))
  pagina.on('requestfailed', (r) => !r.url().includes('/api/w') && erros.push(`falhou: ${r.url().slice(0, 140)}`))

  // Páginas a testar: home, estoque, a primeira moto, a vendida, política e 404
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle0' })
  const motos = await pagina.$$eval('a[href^="/estoque/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))])
  const indice = await (await fetch(`${BASE}/estoque.json`)).json()
  const contatos = await (await fetch(`${BASE}/contatos.json`)).json()
  const rotas = ['/', '/estoque', motos[0], '/politica-de-privacidade', '/pagina-que-nao-existe']

  const linksInternos = new Set()
  for (const rota of rotas.filter(Boolean)) {
    for (const largura of LARGURAS) {
      erros.length = 0
      await pagina.setViewport({ width: largura, height: 900, deviceScaleFactor: 1, isMobile: largura < 600, hasTouch: largura < 600 })
      await pagina.goto(`${BASE}${rota}`, { waitUntil: 'networkidle0' })
      // Na página 404, o próprio documento responde 404: o navegador registra isso, e não é erro
      if (rota === '/pagina-que-nao-existe') erros.splice(0, erros.length, ...erros.filter((e) => !e.includes('404 (Not Found)')))
      const medida = await pagina.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
      const estoura = medida.sw > medida.iw + 1
      if (estoura) {
        const culpados = await pagina.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
            .slice(0, 4)
            .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(el.getBoundingClientRect().right)})`),
        )
        conferir(`${rota} em ${largura}: sem estouro lateral`, false, `${medida.sw}px numa janela de ${medida.iw}px: ${culpados.join(', ')}`)
      } else if (largura === 390 || largura === 1440) {
        conferir(`${rota} em ${largura}: sem estouro lateral`, true)
      }
      if (largura === 390 || largura === 1440) {
        conferir(`${rota} em ${largura}: sem erro de console nem pedido falho`, erros.length === 0, erros.join(' | '))
      } else if (erros.length) {
        conferir(`${rota} em ${largura}: sem erro de console`, false, erros.join(' | '))
      }
    }

    // Conferências da página (uma vez, em 1440)
    const info = await pagina.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      semDimensao: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.src.slice(-50)),
      semAlt: [...document.images].filter((i) => i.getAttribute('alt') === null).map((i) => i.src.slice(-50)),
      quebradas: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.src.slice(-60)),
      scriptsInline: [...document.scripts].filter((s) => !s.src && s.type !== 'application/ld+json').length,
      whatsDireto: [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]')].length,
      links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter((h) => h && !h.startsWith('/api/')),
      jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].every((s) => {
        try {
          JSON.parse(s.textContent)
          return true
        } catch {
          return false
        }
      }),
      robots: document.querySelector('meta[name="robots"]')?.content ?? '',
    }))
    conferir(`${rota}: um h1`, info.h1 === 1, `${info.h1} h1`)
    conferir(`${rota}: imagens com width e height (sem salto de layout)`, info.semDimensao.length === 0, info.semDimensao.join(', '))
    conferir(`${rota}: imagens com alt`, info.semAlt.length === 0, info.semAlt.join(', '))
    conferir(`${rota}: nenhuma imagem quebrada`, info.quebradas.length === 0, info.quebradas.join(', '))
    conferir(`${rota}: nenhum script inline (CSP script-src 'self')`, info.scriptsInline === 0, `${info.scriptsInline}`)
    conferir(`${rota}: WhatsApp só pela rota /api/w`, info.whatsDireto === 0, `${info.whatsDireto} link(s) direto(s)`)
    conferir(`${rota}: JSON-LD válido`, info.jsonLd)
    conferir(`${rota}: fora do domínio de verdade, noindex`, info.robots.includes('noindex'), info.robots)
    info.links.forEach((l) => linksInternos.add(l))
  }

  // Links internos que não existem
  const quebrados = []
  for (const link of linksInternos) {
    const r = await fetch(`${BASE}${link}`)
    if (r.status >= 400) quebrados.push(`${link} (${r.status})`)
  }
  conferir(`links internos (${linksInternos.size}) existem`, quebrados.length === 0, quebrados.join(', '))

  // A rota do WhatsApp manda pra loja certa com a moto na mensagem
  const moto = indice.motos[0]
  const r = await fetch(`${BASE}/api/w?o=card&m=${moto.c}`, { redirect: 'manual' })
  const destino = r.headers.get('location') ?? ''
  conferir('rota /api/w: 303 pro WhatsApp da loja principal com a moto na mensagem', r.status === 303 && destino.startsWith(`https://wa.me/${contatos.principal.whatsapp}?text=`) && decodeURIComponent(destino).includes(`CM-${String(moto.c).padStart(4, '0')}`), destino.slice(0, 120))
  const rLoja = await fetch(`${BASE}/api/w?o=lojas&l=1`, { redirect: 'manual' })
  conferir('rota /api/w: botão da loja vai pro WhatsApp daquela loja', (rLoja.headers.get('location') ?? '').startsWith(`https://wa.me/${contatos.lojas['1'].whatsapp}?`))

  // Filtro do estoque
  await pagina.setViewport({ width: 1440, height: 900 })
  await pagina.goto(`${BASE}/estoque`, { waitUntil: 'networkidle0' })
  const total = await pagina.$$eval('[data-lista] > li', (lis) => lis.length)
  await pagina.select('#f-condicao', '0km')
  await pagina.waitForFunction(() => location.search.includes('condicao=0km'), { timeout: 5000 })
  await new Promise((r) => setTimeout(r, 200))
  const zeroKm = await pagina.$$eval('[data-lista] .selo', (s) => s.map((x) => x.textContent.trim()))
  const esperados = indice.motos.filter((m) => m.co === '0km').length
  conferir('estoque: filtrar 0 km mostra só as 0 km', zeroKm.length === esperados && zeroKm.every((t) => /0 km|reservada/i.test(t)), `${zeroKm.length} de ${esperados}: ${zeroKm.join(', ')}`)
  const contagem = await pagina.$eval('[data-contagem]', (e) => e.textContent)
  conferir('estoque: a contagem acompanha o filtro', contagem.startsWith(String(esperados)), contagem)
  await pagina.goBack()
  await pagina.waitForFunction(() => !location.search.includes('condicao'), { timeout: 5000 })
  await new Promise((r) => setTimeout(r, 200))
  conferir('estoque: voltar desfaz o filtro', (await pagina.$$eval('[data-lista] > li', (lis) => lis.length)) === total && (await pagina.$eval('#f-condicao', (s) => s.value)) === '')
  await pagina.type('#f-busca', 'biz')
  await pagina.waitForFunction(() => location.search.includes('busca=biz'), { timeout: 5000 })
  await new Promise((r) => setTimeout(r, 200))
  const nomes = await pagina.$$eval('[data-lista] .card__nome', (n) => n.map((x) => x.textContent.trim()))
  conferir('estoque: buscar "biz" acha só as Biz', nomes.length > 0 && nomes.every((n) => /biz/i.test(n)), nomes.join(', '))
  await pagina.goto(`${BASE}/estoque?busca=nao-existe-xyz`, { waitUntil: 'networkidle0' })
  await new Promise((r) => setTimeout(r, 300))
  conferir('estoque: busca sem resultado mostra o aviso e o "limpar filtros"', !(await pagina.$eval('[data-nada]', (e) => e.hidden)))
} finally {
  await browser.close()
}

let falhas = 0
for (const r of resultados) {
  if (!r.ok) falhas++
  console.log(`${r.ok ? 'ok  ' : 'FALHOU'} ${r.nome}${!r.ok && r.detalhe ? `\n       ${r.detalhe}` : ''}`)
}
console.log(`\n${resultados.length - falhas} de ${resultados.length} conferências${falhas ? `, ${falhas} falharam` : ''}.`)
process.exitCode = falhas ? 1 : 0
