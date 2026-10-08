/*
 * Pra onde o painel volta depois do login: só caminhos desta lista. A 057
 * aceitava "/\site-falso.com" e mandava o lojista pra fora.
 */
const DESTINOS = /^\/(?:estoque(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?|entregas|lojas|configuracoes|conta|atividades)?$/

export function destinoSeguro(valor: unknown, padrao = '/') {
  return typeof valor === 'string' && DESTINOS.test(valor) ? valor : padrao
}
