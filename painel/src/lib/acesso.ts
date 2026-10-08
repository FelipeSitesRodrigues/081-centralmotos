import 'server-only'
import type { JwtPayload } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { sessaoVencida } from '@/lib/supabase/cookie'
import { clienteServidor, type ClienteServidor } from '@/lib/supabase/servidor'

/*
 * Porta de entrada de toda página e ação do painel (a 2ª das três camadas da
 * seção 6.2 do plano).
 *
 * O proxy já barrou quem não tem sessão, mas Server Action é endpoint público e
 * pode ser chamada sem passar pela página: por isso cada página e cada ação
 * chama exigirAdmin() de novo. E o banco confere uma terceira vez (RLS com
 * eh_admin, que exige perfil admin ativo e login de menos de 7 dias).
 */

export type SessaoAdmin = {
  supabase: ClienteServidor
  claims: JwtPayload
  usuario: { id: string; email: string; nome: string }
}

/** Sessão lida do cookie, com o token conferido. null = ninguém logado. */
export const lerSessao = cache(async () => {
  const supabase = await clienteServidor()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  return { supabase, claims: data.claims }
})

/** Administrador logado. Sem isso, redireciona. Uma vez por request (cache do React). */
export const exigirAdmin = cache(async (): Promise<SessaoAdmin> => {
  const sessao = await lerSessao()
  if (!sessao) redirect('/entrar')
  const { supabase, claims } = sessao

  if (sessaoVencida(claims.amr)) redirect('/sair?motivo=expirou')

  // O token pode estar assinado e ainda assim encerrado ("sair de todos os
  // aparelhos"): o Auth confirma que a sessão existe.
  const { data: auth, error } = await supabase.auth.getUser()
  if (error || !auth.user) redirect('/sair?motivo=expirou')

  const { data: perfil } = await supabase.from('perfis').select('nome, papel, ativo').eq('id', claims.sub).maybeSingle()
  if (!perfil || perfil.papel !== 'admin' || !perfil.ativo) redirect('/sem-acesso')

  return {
    supabase,
    claims,
    usuario: { id: claims.sub, email: auth.user.email ?? '', nome: perfil.nome },
  }
})
