import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@central/vitrine/tipos'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/lib/ambiente'
import { COOKIE_PAINEL } from './cookie'

/*
 * Cliente do painel: chave pública + sessão do lojista lida do cookie. Tudo que
 * ele lê ou grava passa pelas regras do banco (RLS com eh_admin: perfil admin,
 * código do celular e login de menos de 7 dias).
 *
 * Um cliente novo por request (nunca guardar em variável de módulo). Em Server
 * Component o cookie não pode ser gravado: se o token precisar de renovação, o
 * proxy já renovou antes da página rodar.
 */
export async function clienteServidor() {
  const pote = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookieOptions: COOKIE_PAINEL,
    cookies: {
      getAll: () => pote.getAll(),
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) pote.set(name, value, options)
        } catch {
          // Server Component: sem permissão de gravar cookie. O proxy cuida disso.
        }
      },
    },
  })
}

export type ClienteServidor = Awaited<ReturnType<typeof clienteServidor>>
