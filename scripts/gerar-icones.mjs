/**
 * Ícones da vitrine (Phosphor), extraídos do @phosphor-icons/core pra
 * site/lib/icones.json. O build na Vercel lê esse JSON e monta o sprite de cada
 * página só com os ícones dela, sem instalar pacote nenhum.
 *
 *   node scripts/gerar-icones.mjs
 *
 * Ícone novo na vitrine: acrescente aqui e rode de novo.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const ICONES = {
  regular: ['instagram-logo', 'clock', 'phone', 'map-trifold', 'storefront', 'calendar-blank', 'gauge', 'gas-pump', 'engine'],
  bold: ['caret-right', 'caret-left', 'caret-down', 'magnifying-glass', 'arrows-left-right', 'list', 'x', 'arrow-right', 'arrow-up-right', 'plus', 'minus', 'funnel-simple', 'sliders-horizontal', 'check'],
  light: ['wallet', 'clock', 'arrows-left-right', 'credit-card', 'shield-check', 'file-text', 'handshake', 'users-three', 'check-circle', 'motorcycle', 'whatsapp-logo', 'storefront'],
  fill: ['whatsapp-logo', 'map-pin', 'star', 'instagram-logo'],
}

const BASE = 'node_modules/@phosphor-icons/core/assets'
const saida = {}
for (const [peso, nomes] of Object.entries(ICONES)) {
  for (const nome of nomes) {
    const arquivo = `${BASE}/${peso}/${nome}${peso === 'regular' ? '' : `-${peso}`}.svg`
    if (!existsSync(arquivo)) {
      console.error(`ícone não existe: ${nome} (${peso})`)
      process.exitCode = 1
      continue
    }
    const miolo = readFileSync(arquivo, 'utf8')
      .replace(/^<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    saida[`${nome}-${peso}`] = miolo
  }
}

writeFileSync('site/lib/icones.json', JSON.stringify(saida))
console.log(`ok site/lib/icones.json (${Object.keys(saida).length} ícones)`)
