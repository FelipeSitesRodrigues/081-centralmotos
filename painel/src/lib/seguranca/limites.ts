import 'server-only'
import { createHmac } from 'node:crypto'
import { headers } from 'next/headers'
import { clienteAdmin } from '@/lib/supabase/admin'

/*
 * Limite de tentativas (login, código do celular, convite).
 *
 * A contagem mora no banco (tabela limites, função consumir_limite), então vale
 * entre instâncias do servidor. IP e e-mail não são guardados em texto: a chave
 * é um HMAC com um segredo do servidor (SEGREDO_HMAC), que identifica sem expor.
 *
 * Se o banco não responder, bloqueia: melhor pedir pra tentar de novo do que
 * deixar tentativa ilimitada.
 */

/** IP de quem fez o request. Na Vercel o cabeçalho vem da própria plataforma. */
export async function ipDoRequest() {
  const h = await headers()
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? ''
  return ip.trim().slice(0, 60) || 'desconhecido'
}

export async function agenteDoRequest() {
  return ((await headers()).get('user-agent') ?? '').slice(0, 200)
}

function resumo(valor: string) {
  const segredo = process.env.SEGREDO_HMAC
  if (!segredo || segredo.length < 32) throw new Error('Variável de ambiente ausente ou curta: SEGREDO_HMAC.')
  return createHmac('sha256', segredo).update(valor.toLowerCase()).digest('base64url').slice(0, 32)
}

/**
 * Conta uma tentativa. true = pode seguir; false = passou do limite na janela.
 *
 * @param escopo nome curto do que está sendo limitado ("login-ip")
 * @param identificador o que separa uma contagem da outra (IP, e-mail, id)
 */
export async function consumirLimite(escopo: string, identificador: string, maximo: number, janelaSegundos: number) {
  try {
    const { data, error } = await clienteAdmin().rpc('consumir_limite', {
      p_chave: `${escopo}:${resumo(identificador)}`,
      p_maximo: maximo,
      p_janela_segundos: janelaSegundos,
    })
    if (error) throw error
    return data === true
  } catch (erro) {
    console.error(`Limite de tentativas indisponível (${escopo}):`, erro instanceof Error ? erro.message : erro)
    return false
  }
}

export type ResultadoAcesso =
  | 'entrou'
  | 'senha_errada'
  | 'codigo_errado'
  | 'bloqueado'
  | 'saiu'
  | 'saiu_de_todos'
  | 'convite_aceito'
  | 'senha_trocada'
  | 'celular_cadastrado'
  | 'celular_removido'

/** Entrada certa ou errada no painel vai pras atividades (só o admin lê). */
export async function registrarAcesso(resultado: ResultadoAcesso, quem: { usuario?: string | null; email?: string | null }) {
  try {
    // Os tipos gerados não sabem que estes dois aceitam nulo (entrada errada não tem usuário)
    const nulo = null as unknown as string
    const { error } = await clienteAdmin().rpc('registrar_acesso', {
      p_usuario: quem.usuario ?? nulo,
      p_email: quem.email ?? nulo,
      p_resultado: resultado,
      p_ip: await ipDoRequest(),
      p_agente: await agenteDoRequest(),
    })
    if (error) throw error
  } catch (erro) {
    console.error('Registro de acesso falhou:', erro instanceof Error ? erro.message : erro)
  }
}
