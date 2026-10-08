/*
 * Rótulos em português de cada valor que o banco guarda em código. As listas
 * são as mesmas das restrições do banco (migrations); mudou lá, muda aqui.
 */

export const STATUS = {
  rascunho: 'Rascunho',
  publicado: 'No ar',
  reservado: 'Reservada',
  vendido: 'Vendida',
  arquivado: 'Arquivada',
} as const
export type Status = keyof typeof STATUS

export const CONDICOES = { '0km': '0 km', seminova: 'Seminova' } as const

export const CORES = {
  preta: 'Preta',
  branca: 'Branca',
  vermelha: 'Vermelha',
  azul: 'Azul',
  prata: 'Prata',
  cinza: 'Cinza',
  amarela: 'Amarela',
  verde: 'Verde',
  laranja: 'Laranja',
  marrom: 'Marrom',
  roxa: 'Roxa',
  outra: 'Outra',
} as const

export const CATEGORIAS = {
  street: 'Street (urbana)',
  motoneta: 'Motoneta',
  scooter: 'Scooter',
  trail: 'Trail',
  'big-trail': 'Big trail',
  naked: 'Naked',
  esportiva: 'Esportiva',
  custom: 'Custom',
  touring: 'Touring',
  eletrica: 'Elétrica',
} as const

export const COMBUSTIVEIS = { gasolina: 'Gasolina', flex: 'Flex', eletrica: 'Elétrica' } as const
export const PARTIDAS = { eletrica: 'Elétrica', pedal: 'Pedal', eletrica_pedal: 'Elétrica e pedal' } as const
export const FREIOS = { tambor: 'Tambor', disco: 'Disco', cbs: 'CBS (combinado)', abs: 'ABS' } as const
export const CAMBIOS = { manual: 'Manual', automatico: 'Automático (CVT)' } as const

/** O que falta pra publicar (códigos de pendencias_publicacao no banco). */
export const PENDENCIAS = {
  capa: 'a foto de capa',
  modelo: 'a marca e o modelo',
  ano: 'os anos de fabricação e modelo',
  condicao: 'se é 0 km ou seminova',
  km: 'a quilometragem (seminova com 0 km)',
  cor: 'a cor',
  categoria: 'o tipo da moto',
  preco: 'o preço',
} as const

export const chaves = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]]
