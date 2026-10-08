/**
 * Imagens fixas da vitrine, processadas uma vez nesta máquina (seção 5.2 do plano):
 * AVIF e WebP em várias larguras, com o manifesto que o build usa pra montar
 * <picture>, srcset, width e height.
 *
 *   node scripts/processar-imagens.mjs
 *
 * Origem: sites/081-Central Motos/Recursos Site (mockup aprovado e recursos da loja).
 * Saída: site/assets/img/*.avif|webp|jpg|png e site/assets/img/manifesto.json
 *
 * Metas do plano: hero do celular com uns 55 KB e o do computador com uns 120 KB.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import opentype from 'opentype.js'
import sharp from 'sharp'

const RECURSOS = '../081-Central Motos/Recursos Site'
const SAIDA = 'site/assets/img'
mkdirSync(SAIDA, { recursive: true })

const manifesto = {}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

/**
 * Gera as larguras pedidas em AVIF e WebP a partir de um pipeline do sharp
 * (já recortado). Nunca amplia.
 */
async function variantes(nome, origem, larguras, { avif = 50, webp = 72, alfa = false } = {}) {
  const base = await origem.toBuffer({ resolveWithObject: true })
  const { width: largOrigem, height: altOrigem } = base.info
  for (const largura of larguras.filter((l) => l <= largOrigem)) {
    const altura = Math.round((altOrigem * largura) / largOrigem)
    const avifBuf = await sharp(base.data).resize({ width: largura, kernel: 'lanczos3' }).avif({ quality: avif, effort: 7, chromaSubsampling: alfa ? '4:4:4' : '4:2:0' }).toBuffer()
    const webpBuf = await sharp(base.data).resize({ width: largura, kernel: 'lanczos3' }).webp({ quality: webp, effort: 6, alphaQuality: 90, smartSubsample: true }).toBuffer()
    writeFileSync(`${SAIDA}/${nome}-${largura}.avif`, avifBuf)
    writeFileSync(`${SAIDA}/${nome}-${largura}.webp`, webpBuf)
    manifesto[`${nome}-${largura}.avif`] = { w: largura, h: altura, bytes: avifBuf.length }
    manifesto[`${nome}-${largura}.webp`] = { w: largura, h: altura, bytes: webpBuf.length }
    console.log(`${nome}-${largura}  avif ${kb(avifBuf.length)}  webp ${kb(webpBuf.length)}  (${largura}x${altura})`)
  }
}

/** Pixel transparente com cor guardada vira halo em quem ignora o alfa: zera o RGB onde alfa é 0 (lição da 080). */
async function semCorEscondida(pipeline) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png()
}

// ---- Logo (fundo transparente, vai sobre o preto do cabeçalho e do rodapé)
const logo = await semCorEscondida(sharp(`${RECURSOS}/LOGO.png`).trim({ threshold: 4 }))
await variantes('logo', logo, [180, 270, 360, 540], { avif: 62, webp: 82, alfa: true })

// ---- Hero do computador (fachada à direita; o texto fica sobre o degradê da esquerda)
await variantes('hero-desk', sharp(`${RECURSOS}/DESKTOP/IMAGEM HERO DESKTOP.png`), [960, 1280, 1672], { avif: 46, webp: 68 })

// ---- Hero do celular: o letreiro e as motos, recortados da versão em pé, pra entrar
// entre o título e o subtítulo (regra da casa desde a 035)
const heroMob = sharp(`${RECURSOS}/MOBILE/IMAGEM HERO MOBILE.png`).extract({ left: 0, top: 560, width: 941, height: 760 })
// 760 e não 720: o celular do Lighthouse e do PageSpeed (412 px x 1,75) pede 721 px e pulava pro 941
await variantes('hero-mob', heroMob, [480, 760, 941], { avif: 46, webp: 66 })

// ---- Troca (as duas motos e as setas)
await variantes('troca', sharp('../081-Central Motos/SUA MOTO USADA VALE TROCA.png'), [640, 960, 1280, 1600], { avif: 48, webp: 70 })

// ---- Financiamento: a moto vermelha da imagem da troca, mais fechada (sem espelhar: o
// emblema do tanque sairia invertido). PROVISÓRIA: o ideal é uma imagem própria, gerada no
// mesmo chat do mockup.
const financ = sharp('../081-Central Motos/SUA MOTO USADA VALE TROCA.png').extract({ left: 250, top: 0, width: 760, height: 711 })
await variantes('financ-moto', financ, [480, 760], { avif: 48, webp: 70 })

// ---- Compartilhamento padrão (WhatsApp, Facebook): 1200x630 em JPEG
const og = await sharp(`${RECURSOS}/DESKTOP/IMAGEM HERO DESKTOP.png`)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'right' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer()
writeFileSync(`${SAIDA}/og-central-motos.jpg`, og)
manifesto['og-central-motos.jpg'] = { w: 1200, h: 630, bytes: og.length }
console.log(`og-central-motos.jpg ${kb(og.length)}`)

// ---- Ícone (aba do navegador e tela inicial do celular): monograma CM em Anton, C branco e
// M vermelho sobre preto. O desenho da moto do logo é largo demais e vira um risco em 32 px.
const anton = opentype.parse(readFileSync('scripts/.cache/anton-400.ttf').buffer)
function monograma(lado) {
  // Tamanho e posição pela caixa real das letras: 62% da largura, centrado nos dois eixos
  const prova = 100
  const caixaProva = anton.getPath('CM', 0, 0, prova).getBoundingBox()
  const tamanho = (prova * lado * 0.62) / (caixaProva.x2 - caixaProva.x1)
  const caixa = anton.getPath('CM', 0, 0, tamanho).getBoundingBox()
  const x = (lado - (caixa.x2 - caixa.x1)) / 2 - caixa.x1
  const y = (lado - (caixa.y2 - caixa.y1)) / 2 - caixa.y1
  const lc = anton.getAdvanceWidth('C', tamanho)
  const cPath = anton.getPath('C', x, y, tamanho).toPathData(2)
  const mPath = anton.getPath('M', x + lc, y, tamanho).toPathData(2)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" rx="${lado * 0.18}" fill="#0b0b0d"/><path d="${cPath}" fill="#ffffff"/><path d="${mPath}" fill="#e01a22"/></svg>`
}
const svg512 = monograma(512)
writeFileSync(`${SAIDA}/favicon.svg`, svg512)
manifesto['favicon.svg'] = { w: 512, h: 512, bytes: Buffer.byteLength(svg512) }
for (const lado of [32, 180, 512]) {
  const icone = await sharp(Buffer.from(svg512)).resize({ width: lado, height: lado }).png({ compressionLevel: 9 }).toBuffer()
  const nome = lado === 32 ? 'favicon-32.png' : lado === 180 ? 'apple-touch-icon.png' : 'icone-512.png'
  writeFileSync(`${SAIDA}/${nome}`, icone)
  manifesto[nome] = { w: lado, h: lado, bytes: icone.length }
}
console.log('ícones ok')

writeFileSync(`${SAIDA}/manifesto.json`, JSON.stringify(manifesto, null, 1))
// O que sobrou de uma rodada antiga (uma largura que saiu da lista) não vai pro site
for (const arquivo of readdirSync(SAIDA)) if (arquivo !== 'manifesto.json' && !manifesto[arquivo]) rmSync(`${SAIDA}/${arquivo}`)
console.log(`manifesto com ${Object.keys(manifesto).length} arquivos`)
