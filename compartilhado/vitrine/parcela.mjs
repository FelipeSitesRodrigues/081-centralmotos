/**
 * A mesma conta do banco (public.calcular_parcela), pra prévia ao vivo no
 * painel: preço × coeficiente, arredondada pra cima no múltiplo de
 * `arredondar` reais.
 *
 * Em inteiros (BigInt), não em ponto flutuante: 10.000 × 0,05 tem que dar 500
 * aqui também, e não 510 por causa de um 500,00000000000006.
 *
 *   calcularParcela(1000000, 0.0537)  → 540    (R$ 10.000)
 *   calcularParcela(2000000, 0.0537)  → 1080   (R$ 20.000)
 *   calcularParcela(2500000, 0.0537)  → 1350   (R$ 25.000)
 *
 * @param {number} precoCentavos
 * @param {number} coeficiente  até 6 casas (numeric(7,6) no banco)
 * @param {number} [arredondar] 1, 5 ou 10
 * @returns {number | null} parcela em reais inteiros
 */
export function calcularParcela(precoCentavos, coeficiente, arredondar = 10) {
  if (!Number.isInteger(precoCentavos) || precoCentavos <= 0) return null
  if (!Number.isFinite(coeficiente) || coeficiente <= 0) return null
  if (![1, 5, 10].includes(arredondar)) return null

  const coeficienteMilionesimos = BigInt(Math.round(coeficiente * 1_000_000))
  const numerador = BigInt(precoCentavos) * coeficienteMilionesimos
  // centavos → reais (100) × milionésimos (1.000.000) × múltiplo do arredondamento
  const denominador = 100_000_000n * BigInt(arredondar)
  const multiplos = (numerador + denominador - 1n) / denominador
  return Number(multiplos) * arredondar
}

/**
 * A parcela que vale, igual ao banco: sem preço, nenhuma; com preço, a
 * digitada pelo dono, se houver, senão a calculada.
 * @param {number | null} precoCentavos
 * @param {number | null} parcelaManual
 * @param {number | null} coeficiente
 * @param {number} [arredondar]
 * @returns {number | null}
 */
export function parcelaExibida(precoCentavos, parcelaManual, coeficiente, arredondar = 10) {
  if (precoCentavos === null) return null
  if (parcelaManual !== null && Number.isInteger(parcelaManual) && parcelaManual > 0) return parcelaManual
  if (coeficiente === null) return null
  return calcularParcela(precoCentavos, coeficiente, arredondar)
}
