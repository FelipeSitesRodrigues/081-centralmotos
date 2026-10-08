/**
 * Baixa as fontes do Google Fonts e grava no próprio projeto (base do 080):
 *
 * - Anton 400: títulos, nome da moto, parcela e números (mockup e plano, seção 11.2).
 * - Manrope variável, peso de 400 a 800: o corpo da vitrine e todo o painel.
 *
 * Saída:
 *   site/assets/fontes/anton.woff2 e manrope-var.woff2   (vitrine)
 *   site/css/_fontes.css                                 (@font-face e fallbacks)
 *   painel/src/app/fontes/manrope-var.woff2              (painel, pelo next/font/local)
 *
 * Os fallbacks têm size-adjust medido contra a fonte real (Impact pra Anton,
 * Arial pra Manrope): enquanto a fonte chega, o texto ocupa quase o mesmo espaço
 * e a linha não quebra diferente (CLS).
 *
 * Só os caracteres do site (ASCII, Latin-1 com os acentos do português e a
 * pontuação usada): a Anton cai pra uns 20 KB.
 *
 * Uso: node scripts/baixar-fontes.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import opentype from 'opentype.js'
import subsetFont from 'subset-font'

const CACHE = 'scripts/.cache'
for (const pasta of [CACHE, 'site/assets/fontes', 'site/css', 'painel/src/app/fontes']) mkdirSync(pasta, { recursive: true })

let LETRAS = ''
for (let c = 0x20; c <= 0x7e; c++) LETRAS += String.fromCharCode(c)
for (let c = 0xa0; c <= 0xff; c++) LETRAS += String.fromCharCode(c)
LETRAS += '‘’“”•…·→←×©ªº€'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function baixar(familia, arquivo, { navegador = false } = {}) {
  const destino = `${CACHE}/${arquivo}`
  if (existsSync(destino)) return readFileSync(destino)
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}`, navegador ? { headers: { 'User-Agent': UA } } : {})).text()
  const bloco = navegador ? [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)].find(([, sub]) => sub === 'latin')?.[2] : css
  const url = bloco?.match(/url\((https:[^)]+)\)/)?.[1]
  if (!url) throw new Error(`sem url de fonte para ${familia}:\n${css.slice(0, 300)}`)
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  writeFileSync(destino, buf)
  console.log('baixada', arquivo, Math.round(buf.length / 1024) + ' KB')
  return buf
}

const kb = (b) => (b.length / 1024).toFixed(1) + ' KB'
const ab = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
const largura = (fonte, texto) => fonte.getAdvanceWidth(texto, fonte.unitsPerEm) / fonte.unitsPerEm

const AMOSTRA_TITULO = 'QUALIDADE, CONFIANÇA E LIBERDADE AS MELHORES MOTOS DE IRECÊ E REGIÃO SUA MOTO USADA VALE NA TROCA'
const AMOSTRA_TEXTO =
  'Motos 0 km e seminovas com procedência, financiamento 100% online, aprovação em 10 minutos e sua usada na troca. Atendimento em Irecê e Luís Eduardo Magalhães.'

function fallback(nome, fonte, locais, arquivoLocal, amostra) {
  const ref = opentype.parse(ab(readFileSync(arquivoLocal)))
  const ajuste = largura(fonte, amostra) / largura(ref, amostra)
  const upm = fonte.unitsPerEm
  const hhea = fonte.tables.hhea
  const pct = (v) => (v * 100).toFixed(2) + '%'
  return `@font-face {
  font-family: '${nome}';
  src: ${locais.map((l) => `local('${l}')`).join(', ')};
  size-adjust: ${pct(ajuste)};
  ascent-override: ${pct(hhea.ascender / upm / ajuste)};
  descent-override: ${pct(Math.abs(hhea.descender) / upm / ajuste)};
  line-gap-override: ${pct((hhea.lineGap || 0) / upm / ajuste)};
}`
}

const saida = ['/* Gerado por scripts/baixar-fontes.mjs. Não editar à mão. */']

// ---- Anton (um peso só)
const antonTtf = await baixar('Anton', 'anton-400.ttf')
const anton = await subsetFont(antonTtf, LETRAS, { targetFormat: 'woff2' })
writeFileSync('site/assets/fontes/anton.woff2', anton)
console.log('ok anton.woff2', kb(anton))
saida.push(`@font-face {
  font-family: 'Anton';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fontes/anton.woff2') format('woff2');
}`)
const antonFonte = opentype.parse(ab(antonTtf))
saida.push(fallback('Anton fallback', antonFonte, ['Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'Arial Bold'], 'C:/Windows/Fonts/impact.ttf', AMOSTRA_TITULO))

// Conferência da lição da Cormorant: o acento circunflexo e o til precisam existir de verdade
for (const letra of ['Ê', 'Ã', 'Ç', 'Õ', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Â', 'Ô']) {
  if (antonFonte.charToGlyph(letra).index === 0) console.log(`AVISO: Anton sem o caractere ${letra}`)
}

// ---- Manrope variável 400 a 800
const manropeVar = await baixar('Manrope:wght@400..800', 'manrope-var-latin.woff2', { navegador: true })
let manrope
try {
  manrope = await subsetFont(manropeVar, LETRAS, { targetFormat: 'woff2', variationAxes: { wght: { min: 400, max: 800, default: 400 } } })
} catch (e) {
  console.log('aviso: subset-font não limitou o eixo, vai a variável inteira:', e.message)
  manrope = await subsetFont(manropeVar, LETRAS, { targetFormat: 'woff2' })
}
writeFileSync('site/assets/fontes/manrope-var.woff2', manrope)
copyFileSync('site/assets/fontes/manrope-var.woff2', 'painel/src/app/fontes/manrope-var.woff2')
console.log('ok manrope-var.woff2', kb(manrope))
saida.push(`@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/assets/fontes/manrope-var.woff2') format('woff2');
}`)
const manrope400 = opentype.parse(ab(await baixar('Manrope:wght@400', 'manrope-400.ttf')))
saida.push(fallback('Manrope fallback', manrope400, ['Arial', 'Helvetica', 'Roboto'], 'C:/Windows/Fonts/arial.ttf', AMOSTRA_TEXTO))

writeFileSync('site/css/_fontes.css', saida.join('\n') + '\n')
console.log('ok site/css/_fontes.css')
