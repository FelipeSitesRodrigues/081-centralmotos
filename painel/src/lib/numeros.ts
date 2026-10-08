/*
 * Leitura do que o lojista digita nos campos de número e dinheiro, do jeito
 * que se escreve no Brasil ("19.876,54", "19876", "15.000").
 */

/** Só os dígitos viram número: "15.000 km" → 15000. Vazio → null. */
export function lerInteiro(texto: string): number | null {
  const digitos = texto.replace(/\D/g, '')
  if (!digitos) return null
  const n = Number(digitos)
  return Number.isSafeInteger(n) ? n : null
}

/**
 * Reais digitados → centavos. Com vírgula, os pontos são milhar ("19.876,54").
 * Sem vírgula, um ponto seguido de 1 ou 2 dígitos no fim é decimal ("19876.5");
 * qualquer outro ponto é milhar ("19.876").
 */
export function lerReais(texto: string): number | null {
  let t = texto.replace(/[R$\s]/g, '')
  if (!t) return null
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(t)) {
    // já está com ponto decimal
  } else {
    t = t.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const centavos = Math.round(Number(t) * 100)
  return Number.isSafeInteger(centavos) ? centavos : null
}

const milhar = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const comCentavos = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 15000 → "15.000" */
export const escreverInteiro = (n: number | null) => (n === null ? '' : milhar.format(n))

/** 1987654 → "19.876,54"; centavos zerados somem ("20.000") */
export function escreverReais(centavos: number | null) {
  if (centavos === null) return ''
  return centavos % 100 === 0 ? milhar.format(centavos / 100) : comCentavos.format(centavos / 100)
}
