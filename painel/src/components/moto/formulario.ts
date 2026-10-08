import type { LinhaPainel } from '@/lib/dados/motos'
import { escreverInteiro, escreverReais, lerInteiro, lerReais } from '@/lib/numeros'
import type { DadosMoto } from '@/lib/esquemas/moto'

/*
 * O formulário guarda tudo como texto (é o que o campo mostra) e só vira
 * número na hora de salvar. Assim "19.876,54" continua como o lojista digitou
 * enquanto ele edita.
 */

export type Formulario = {
  marca_id: string
  modelo_id: string
  versao: string
  ano_fabricacao: string
  ano_modelo: string
  condicao: '' | '0km' | 'seminova'
  km: string
  cor: string
  cilindrada: string
  categoria: string
  combustivel: string
  partida: string
  freio: string
  cambio: string
  final_placa: string
  ipva_pago_ate: string
  unico_dono: boolean
  manual_chave: boolean
  revisada: boolean
  so_transferir: boolean
  aceita_troca: boolean
  descricao: string
  destaque: boolean
  preco: string
  usar_parcela_manual: boolean
  parcela_manual: string
  custo: string
  observacao: string
}

const texto = (v: unknown) => (v === null || v === undefined ? '' : String(v))

export function formularioDe(moto: LinhaPainel): Formulario {
  return {
    marca_id: texto(moto.marca_id),
    modelo_id: texto(moto.modelo_id),
    versao: texto(moto.versao),
    ano_fabricacao: texto(moto.ano_fabricacao),
    ano_modelo: texto(moto.ano_modelo),
    condicao: (moto.condicao as Formulario['condicao']) ?? '',
    km: moto.km ? escreverInteiro(moto.km) : '',
    cor: texto(moto.cor),
    cilindrada: texto(moto.cilindrada),
    categoria: texto(moto.categoria),
    combustivel: moto.combustivel ?? 'gasolina',
    partida: texto(moto.partida),
    freio: texto(moto.freio),
    cambio: moto.cambio ?? 'manual',
    final_placa: texto(moto.final_placa),
    ipva_pago_ate: texto(moto.ipva_pago_ate),
    unico_dono: Boolean(moto.unico_dono),
    manual_chave: Boolean(moto.manual_chave),
    revisada: Boolean(moto.revisada),
    so_transferir: Boolean(moto.so_transferir),
    aceita_troca: moto.aceita_troca ?? true,
    descricao: texto(moto.descricao),
    destaque: Boolean(moto.destaque),
    preco: escreverReais(moto.preco_centavos ?? null),
    usar_parcela_manual: moto.parcela_manual !== null && moto.parcela_manual !== undefined,
    parcela_manual: texto(moto.parcela_manual),
    custo: escreverReais(moto.custo_centavos ?? null),
    observacao: texto(moto.observacao),
  }
}

const numeroOuNulo = (v: string) => (v === '' ? null : Number(v))
const textoOuNulo = (v: string) => (v.trim() === '' ? null : v.trim())

/**
 * Formulário → dados que o servidor valida. Devolve também os campos que não
 * deu pra ler (preço "abc"), que viram erro antes de mandar.
 */
export function dadosDe(f: Formulario): { dados: DadosMoto; ilegiveis: Record<string, string> } {
  const ilegiveis: Record<string, string> = {}

  const preco = lerReais(f.preco)
  if (f.preco.trim() && preco === null) ilegiveis['preco.preco_centavos'] = 'Não entendi esse valor. Escreva assim: 19.876,54'
  const custo = lerReais(f.custo)
  if (f.custo.trim() && custo === null) ilegiveis['preco.custo_centavos'] = 'Não entendi esse valor. Escreva assim: 15.000,00'
  const parcela = f.usar_parcela_manual ? lerInteiro(f.parcela_manual) : null
  if (f.usar_parcela_manual && parcela === null) ilegiveis['preco.parcela_manual'] = 'Digite a parcela ou desligue a parcela manual.'

  return {
    ilegiveis,
    dados: {
      modelo_id: numeroOuNulo(f.modelo_id),
      versao: textoOuNulo(f.versao),
      ano_fabricacao: numeroOuNulo(f.ano_fabricacao),
      ano_modelo: numeroOuNulo(f.ano_modelo),
      condicao: f.condicao || null,
      km: lerInteiro(f.km) ?? 0,
      cor: (f.cor || null) as DadosMoto['cor'],
      cilindrada: lerInteiro(f.cilindrada),
      categoria: (f.categoria || null) as DadosMoto['categoria'],
      combustivel: (f.combustivel || 'gasolina') as DadosMoto['combustivel'],
      partida: (f.partida || null) as DadosMoto['partida'],
      freio: (f.freio || null) as DadosMoto['freio'],
      cambio: (f.cambio || 'manual') as DadosMoto['cambio'],
      final_placa: numeroOuNulo(f.final_placa),
      ipva_pago_ate: numeroOuNulo(f.ipva_pago_ate),
      unico_dono: f.unico_dono,
      manual_chave: f.manual_chave,
      revisada: f.revisada,
      so_transferir: f.so_transferir,
      aceita_troca: f.aceita_troca,
      descricao: textoOuNulo(f.descricao),
      destaque: f.destaque,
      preco: {
        preco_centavos: preco,
        parcela_manual: parcela,
        custo_centavos: custo,
        observacao: textoOuNulo(f.observacao),
      },
    },
  }
}

/** Onde mora cada campo na tela, pro resumo de erros levar até ele. */
export const CAMPOS_DA_TELA: Record<string, { id: string; rotulo: string }> = {
  modelo_id: { id: 'modelo', rotulo: 'Modelo' },
  versao: { id: 'versao', rotulo: 'Versão' },
  ano_fabricacao: { id: 'ano-fabricacao', rotulo: 'Ano de fabricação' },
  ano_modelo: { id: 'ano-modelo', rotulo: 'Ano do modelo' },
  condicao: { id: 'condicao', rotulo: '0 km ou seminova' },
  km: { id: 'km', rotulo: 'Quilometragem' },
  cor: { id: 'cor', rotulo: 'Cor' },
  cilindrada: { id: 'cilindrada', rotulo: 'Cilindrada' },
  categoria: { id: 'categoria', rotulo: 'Tipo' },
  partida: { id: 'partida', rotulo: 'Partida' },
  freio: { id: 'freio', rotulo: 'Freio' },
  final_placa: { id: 'final-placa', rotulo: 'Final da placa' },
  ipva_pago_ate: { id: 'ipva', rotulo: 'IPVA pago até' },
  descricao: { id: 'descricao', rotulo: 'Descrição' },
  'preco.preco_centavos': { id: 'preco', rotulo: 'Preço' },
  'preco.parcela_manual': { id: 'parcela-manual', rotulo: 'Parcela manual' },
  'preco.custo_centavos': { id: 'custo', rotulo: 'Custo' },
  'preco.observacao': { id: 'observacao', rotulo: 'Observação interna' },
}
