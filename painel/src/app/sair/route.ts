import { NextResponse, type NextRequest } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'

/*
 * Saída forçada: sessão vencida (7 dias) ou encerrada em outro aparelho.
 * exigirAdmin() manda pra cá porque página não pode apagar cookie; rota pode.
 * O "Sair" do menu é uma Server Action (sair), não este GET.
 */
export async function GET(request: NextRequest) {
  const supabase = await clienteServidor()
  await supabase.auth.signOut({ scope: 'local' })
  const motivo = request.nextUrl.searchParams.get('motivo') === 'expirou' ? 'expirou' : 'saiu'
  return NextResponse.redirect(new URL(`/entrar?motivo=${motivo}`, request.url), 303)
}
