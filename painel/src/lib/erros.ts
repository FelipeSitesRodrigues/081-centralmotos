import { PENDENCIAS, STATUS } from './rotulos'

/*
 * Erro do banco em português claro (o "raise exception limite_destaques:8"
 * vira "O limite é de 8 motos em destaque"). As funções e restrições do banco
 * levantam códigos curtos de propósito, pra esta tradução ser possível.
 */

type ErroDoBanco = { message?: string; code?: string } | null | undefined

const NOMES_STATUS = STATUS as Record<string, string>

function listar(itens: string[]) {
  if (itens.length <= 1) return itens.join('')
  return `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`
}

export function mensagemDoBanco(erro: ErroDoBanco, padrao = 'Não foi possível salvar agora. Tente de novo em instantes.') {
  const m = erro?.message ?? ''

  if (m.includes('conflito_edicao'))
    return 'Esta moto foi alterada em outro aparelho enquanto você editava. Recarregue a página pra ver a versão nova.'

  const pendencias = m.match(/publicacao_incompleta:([a-z_,]+)/)
  if (pendencias?.[1]) {
    const itens = pendencias[1].split(',').map((c) => PENDENCIAS[c as keyof typeof PENDENCIAS] ?? c)
    return `Pra ir pro ar, falta ${listar(itens)}.`
  }

  const destaques = m.match(/limite_destaques:(\d+)/)
  if (destaques) return `O limite é de ${destaques[1]} motos em destaque. Tire o destaque de outra antes.`

  const fotos = m.match(/limite_fotos:(\d+)/)
  if (fotos) {
    const n = Number(fotos[1])
    return n === 0 ? 'Esta moto já tem 20 fotos, o máximo.' : `Cabem só mais ${n} ${n === 1 ? 'foto' : 'fotos'} nesta moto (o máximo é 20).`
  }

  const transicao = m.match(/transicao_invalida:([a-z]+):([a-z]+)/)
  if (transicao) {
    const de = NOMES_STATUS[transicao[1] ?? ''] ?? transicao[1]
    const para = NOMES_STATUS[transicao[2] ?? ''] ?? transicao[2]
    return `Uma moto ${de?.toLowerCase()} não pode ir direto pra ${para?.toLowerCase()}.`
  }

  if (m.includes('capa_obrigatoria')) return 'Moto no ar precisa de pelo menos uma foto. Tire do ar antes de apagar a última.'
  if (m.includes('veiculos_parcela_no_ar')) return 'Moto no ar precisa de preço. Tire do ar antes de apagar o preço.'
  if (m.includes('veiculos_anos')) return 'O ano do modelo é o mesmo da fabricação ou um a mais.'
  if (m.includes('veiculos_0km_ate_50')) return 'Moto 0 km aceita no máximo 50 km rodados.'
  if (m.includes('ano_invalido')) return 'O ano de fabricação vai até o ano que vem.'
  if (m.includes('exclusao_bloqueada'))
    return 'Só dá pra excluir de vez um rascunho que nunca foi pro ar ou uma moto arquivada. Arquive antes.'
  if (m.includes('veiculo_inexistente')) return 'Essa moto não existe mais. Ela pode ter sido excluída em outro aparelho.'
  if (m.includes('fotos_divergentes')) return 'A lista de fotos mudou em outro aparelho. Recarregue a página.'
  if (m.includes('modelos_slug_por_marca')) return 'Esse modelo já está cadastrado nessa marca.'
  if (m.includes('marcas_nome_key') || m.includes('marcas_slug_key')) return 'Essa marca já está cadastrada.'
  if (m.includes('lojas_uma_principal_idx')) return 'Só uma loja pode ser a principal.'
  if (m.includes('sem_permissao') || erro?.code === '42501') return 'Sua sessão não tem mais permissão pra isso. Entre de novo.'

  if (m) console.error('Erro do banco sem tradução:', m)
  return padrao
}
