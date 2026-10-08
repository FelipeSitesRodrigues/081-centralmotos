/**
 * Sprite de ícones por página: cada página leva só os <symbol> que usa, num <svg>
 * escondido no começo do <body>. Os desenhos vêm de icones.json (gerado por
 * scripts/gerar-icones.mjs a partir do Phosphor).
 */
import { readFileSync } from 'node:fs'
import { cru } from '../../compartilhado/vitrine/html.mjs'

const TODOS = JSON.parse(readFileSync(new URL('./icones.json', import.meta.url), 'utf8'))

/** @param {string[]} avisos */
export function criarSprite(avisos) {
  const usados = new Map()

  /** @param {string} nome @param {string} [peso] @param {string} [classe] */
  function icone(nome, peso = 'regular', classe = '') {
    const id = `${nome}-${peso}`
    if (!TODOS[id]) {
      avisos.push(`ícone fora do icones.json: ${id} (acrescente em scripts/gerar-icones.mjs)`)
      return cru('')
    }
    if (!usados.has(id)) usados.set(id, `<symbol id="i-${id}" viewBox="0 0 256 256">${TODOS[id]}</symbol>`)
    return cru(`<svg class="i${classe ? ` ${classe}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`)
  }

  const sprite = () =>
    cru(`<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true" focusable="false" class="sprite">${[...usados.values()].join('')}</svg>`)

  return { icone, sprite }
}
