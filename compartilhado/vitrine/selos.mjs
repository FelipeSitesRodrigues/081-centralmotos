/**
 * Selos da moto. No cartão vai só o principal (0 KM, SEMINOVA ou RESERVADA);
 * na página da moto, os de documentação também.
 */

/** @typedef {{ texto: string, tipo: 'condicao' | 'reservada' | 'vendida' | 'doc' }} Selo */

/** @param {{ status: string, condicao?: string | null }} moto @returns {Selo} */
export function seloPrincipal(moto) {
  if (moto.status === 'vendido') return { texto: 'Vendida', tipo: 'vendida' }
  if (moto.status === 'reservado') return { texto: 'Reservada', tipo: 'reservada' }
  return { texto: moto.condicao === '0km' ? '0 km' : 'Seminova', tipo: 'condicao' }
}

/**
 * @param {{ status: string, condicao?: string | null, ipva_pago_ate?: number | null, unico_dono?: boolean, manual_chave?: boolean, revisada?: boolean, so_transferir?: boolean, aceita_troca?: boolean }} moto
 * @param {number} [anoAtual]
 * @returns {Selo[]}
 */
export function selosDaMoto(moto, anoAtual = new Date().getFullYear()) {
  const lista = [seloPrincipal(moto)]
  if (moto.ipva_pago_ate && moto.ipva_pago_ate >= anoAtual) lista.push({ texto: `IPVA ${moto.ipva_pago_ate} pago`, tipo: 'doc' })
  if (moto.unico_dono) lista.push({ texto: 'Único dono', tipo: 'doc' })
  if (moto.so_transferir) lista.push({ texto: 'Só transferir', tipo: 'doc' })
  if (moto.revisada) lista.push({ texto: 'Revisada', tipo: 'doc' })
  if (moto.manual_chave) lista.push({ texto: 'Manual e chave reserva', tipo: 'doc' })
  return lista
}
