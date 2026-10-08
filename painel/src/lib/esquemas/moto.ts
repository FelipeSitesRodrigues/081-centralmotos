import { z } from 'zod'
import { CAMBIOS, CATEGORIAS, chaves, COMBUSTIVEIS, CONDICOES, CORES, FREIOS, PARTIDAS } from '@/lib/rotulos'

/*
 * Ficha da moto como o formulário manda pro servidor. A tela valida pra avisar
 * no campo; o servidor valida de novo (é endpoint público) e o banco tem as
 * mesmas travas por baixo. Rascunho pode ir quase vazio: o que falta pra
 * publicar quem diz é o banco (pendencias_publicacao).
 */

export const anoMaximoFabricacao = () => new Date().getFullYear() + 1

const opcional = <T extends z.ZodType>(tipo: T) => tipo.nullable()

export const esquemaPreco = z
  .object({
    preco_centavos: opcional(
      z.number().int().min(100000, { error: 'O preço mínimo é R$ 1.000.' }).max(100000000, { error: 'O preço máximo é R$ 1.000.000.' }),
    ),
    parcela_manual: opcional(
      z.number().int().min(50, { error: 'A parcela mínima é R$ 50.' }).max(30000, { error: 'A parcela máxima é R$ 30.000.' }),
    ),
    custo_centavos: opcional(z.number().int().min(0).max(100000000, { error: 'O custo máximo é R$ 1.000.000.' })),
    observacao: opcional(z.string().trim().max(1000, { error: 'A observação vai até 1.000 caracteres.' })),
  })
  .superRefine((p, ctx) => {
    if (p.preco_centavos === null && p.parcela_manual !== null) {
      ctx.addIssue({ code: 'custom', path: ['preco_centavos'], message: 'Informe o preço: a parcela manual vale junto com ele.' })
    }
  })

export const esquemaMoto = z
  .object({
    modelo_id: opcional(z.number().int().positive()),
    versao: opcional(z.string().trim().max(60, { error: 'A versão vai até 60 caracteres.' })),
    ano_fabricacao: opcional(z.number().int().min(1980, { error: 'Ano a partir de 1980.' })),
    ano_modelo: opcional(z.number().int().min(1980, { error: 'Ano a partir de 1980.' })),
    condicao: opcional(z.enum(chaves(CONDICOES))),
    km: z.number().int().min(0).max(500000, { error: 'Até 500.000 km.' }),
    cor: opcional(z.enum(chaves(CORES))),
    cilindrada: opcional(z.number().int().min(49, { error: 'Cilindrada a partir de 49 cc.' }).max(2500, { error: 'Até 2.500 cc.' })),
    categoria: opcional(z.enum(chaves(CATEGORIAS))),
    combustivel: z.enum(chaves(COMBUSTIVEIS)),
    partida: opcional(z.enum(chaves(PARTIDAS))),
    freio: opcional(z.enum(chaves(FREIOS))),
    cambio: z.enum(chaves(CAMBIOS)),
    final_placa: opcional(z.number().int().min(0).max(9)),
    ipva_pago_ate: opcional(z.number().int().min(2000).max(2100)),
    unico_dono: z.boolean(),
    manual_chave: z.boolean(),
    revisada: z.boolean(),
    so_transferir: z.boolean(),
    aceita_troca: z.boolean(),
    descricao: opcional(z.string().trim().max(2000, { error: 'A descrição vai até 2.000 caracteres.' })),
    destaque: z.boolean(),
    preco: esquemaPreco,
  })
  .superRefine((d, ctx) => {
    if (d.ano_fabricacao !== null && d.ano_fabricacao > anoMaximoFabricacao()) {
      ctx.addIssue({ code: 'custom', path: ['ano_fabricacao'], message: `O ano de fabricação vai até ${anoMaximoFabricacao()}.` })
    }
    if (d.ano_fabricacao !== null && d.ano_modelo !== null && (d.ano_modelo < d.ano_fabricacao || d.ano_modelo > d.ano_fabricacao + 1)) {
      ctx.addIssue({ code: 'custom', path: ['ano_modelo'], message: 'O ano do modelo é o mesmo da fabricação ou um a mais.' })
    }
    if (d.condicao === '0km' && d.km > 50) {
      ctx.addIssue({ code: 'custom', path: ['km'], message: 'Moto 0 km aceita no máximo 50 km rodados.' })
    }
  })

export type DadosMoto = z.infer<typeof esquemaMoto>

/** Erros do Zod por campo ("preco.preco_centavos" → mensagem), pra mostrar ao lado de cada um. */
export function errosPorCampo(erro: z.ZodError) {
  const campos: Record<string, string> = {}
  for (const issue of erro.issues) {
    const chave = issue.path.join('.')
    if (!campos[chave]) campos[chave] = issue.message
  }
  return campos
}

export const esquemaModeloNovo = z.object({
  marca_id: z.number().int().positive({ error: 'Escolha a marca.' }),
  nome: z.string().trim().min(1, { error: 'Digite o nome do modelo.' }).max(60, { error: 'O nome vai até 60 caracteres.' }),
  categoria: z.enum(chaves(CATEGORIAS), { error: 'Escolha o tipo.' }),
  cilindrada: opcional(z.number().int().min(49, { error: 'Cilindrada a partir de 49 cc.' }).max(2500, { error: 'Até 2.500 cc.' })),
})

export const esquemaMarcaNova = z.object({
  nome: z.string().trim().min(2, { error: 'Digite o nome da marca.' }).max(40, { error: 'O nome vai até 40 caracteres.' }),
})
