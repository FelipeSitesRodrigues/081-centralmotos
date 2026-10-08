import type { CookieOptionsWithName } from '@supabase/ssr'

/*
 * Cookie da sessão do painel.
 *
 * - httpOnly: nenhum JavaScript da página lê o token. Não existe cliente do
 *   Supabase com sessão no navegador: login e dados passam pelo servidor, e o
 *   upload de foto usa URL assinada, que não precisa da sessão.
 * - sameSite lax: link do WhatsApp pro painel abre já logado; formulário de
 *   outro site não consegue postar (as Server Actions conferem a origem também).
 * - 7 dias: a mesma conta que o banco faz em eh_admin() (seção 6.1 do plano).
 */
export const DURACAO_SESSAO_S = 7 * 24 * 60 * 60

export const COOKIE_PAINEL: CookieOptionsWithName = {
  name: 'central-painel',
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: DURACAO_SESSAO_S,
}

type EntradaAmr = { method: string; timestamp: number }

/** Quando esta sessão começou (segundos): o registro mais antigo do "amr", que é a senha. */
export function inicioDaSessao(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null
  const momentos = amr
    .filter((e): e is EntradaAmr => typeof e === 'object' && e !== null && 'timestamp' in e)
    .map((e) => Number(e.timestamp))
    .filter(Number.isFinite)
  return momentos.length ? Math.min(...momentos) : null
}

/** Passou dos 7 dias desde a senha: entra de novo. */
export function sessaoVencida(amr: unknown, agora = Date.now() / 1000) {
  const inicio = inicioDaSessao(amr)
  return inicio === null || agora - inicio > DURACAO_SESSAO_S
}
