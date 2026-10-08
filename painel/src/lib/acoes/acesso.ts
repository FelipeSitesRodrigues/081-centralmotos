'use server'

import { redirect } from 'next/navigation'
import { exigirAdmin, lerSessao } from '@/lib/acesso'
import { destinoSeguro } from '@/lib/seguranca/destino'
import { consumirLimite, ipDoRequest, registrarAcesso } from '@/lib/seguranca/limites'
import { problemaDaSenha } from '@/lib/senha'
import { clienteServidor } from '@/lib/supabase/servidor'

/*
 * Entrada no painel: e-mail e senha (decisão do Felipe em 2026-10-07: sem
 * código do celular; o login é criado por scripts/acesso.mjs e entregue ao
 * dono), troca de senha e saída.
 *
 * Toda ação aqui é endpoint público (Server Action), então nada confia no que a
 * tela mostrou antes: cada uma lê a sessão de novo, limita tentativas e responde
 * com mensagem genérica quando o erro poderia revelar se um e-mail existe.
 */

export type EstadoAcesso = { erro?: string; email?: string } | undefined

const MUITAS_TENTATIVAS = 'Muitas tentativas seguidas. Espere 15 minutos e tente de novo.'

export async function entrar(_: EstadoAcesso, dados: FormData): Promise<EstadoAcesso> {
  const email = String(dados.get('email') ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
  const senha = String(dados.get('senha') ?? '').slice(0, 200)
  const para = destinoSeguro(dados.get('para'))

  if (!email || !senha) return { erro: 'Preencha o e-mail e a senha.', email }

  const ip = await ipDoRequest()
  const [porIp, porEmail] = await Promise.all([
    consumirLimite('login-ip', ip, 30, 15 * 60),
    consumirLimite('login-email', email, 8, 15 * 60),
  ])
  if (!porIp || !porEmail) {
    await registrarAcesso('bloqueado', { email })
    return { erro: MUITAS_TENTATIVAS, email }
  }

  const supabase = await clienteServidor()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error || !data.user) {
    if (error?.status && error.status >= 500) return { erro: 'Não foi possível entrar agora. Tente de novo em instantes.', email }
    await registrarAcesso('senha_errada', { email })
    return { erro: 'E-mail ou senha incorretos.', email }
  }

  // Conta sem perfil de administrador ativo não passa daqui, com a mesma mensagem
  const { data: perfil } = await supabase.from('perfis').select('papel, ativo').eq('id', data.user.id).maybeSingle()
  if (!perfil || perfil.papel !== 'admin' || !perfil.ativo) {
    await supabase.auth.signOut({ scope: 'local' })
    await registrarAcesso('senha_errada', { usuario: data.user.id, email })
    return { erro: 'E-mail ou senha incorretos.', email }
  }

  await registrarAcesso('entrou', { usuario: data.user.id, email })
  redirect(para)
}

/** Troca de senha pela Minha conta. */
export async function definirSenha(_: EstadoAcesso, dados: FormData): Promise<EstadoAcesso> {
  const { supabase, usuario } = await exigirAdmin()

  const senha = String(dados.get('senha') ?? '')
  const confirmacao = String(dados.get('confirmacao') ?? '')

  const problema = problemaDaSenha(senha)
  if (problema) return { erro: problema }
  if (senha !== confirmacao) return { erro: 'As duas senhas não estão iguais. Digite de novo.' }

  if (!(await consumirLimite('senha', usuario.id, 10, 60 * 60))) return { erro: MUITAS_TENTATIVAS }

  const { error } = await supabase.auth.updateUser({ password: senha })
  if (error) {
    if (error.code === 'same_password') return { erro: 'Essa já é a senha atual. Escolha uma diferente.' }
    if (error.code === 'weak_password') return { erro: 'Essa senha é fácil de adivinhar. Escolha outra.' }
    console.error('Troca de senha falhou:', error.code, error.message)
    return { erro: 'Não foi possível salvar a senha agora. Tente de novo em instantes.' }
  }

  await registrarAcesso('senha_trocada', { usuario: usuario.id, email: usuario.email })
  redirect('/conta?ok=senha')
}

export async function sair() {
  const sessao = await lerSessao()
  if (sessao) {
    await registrarAcesso('saiu', { usuario: sessao.claims.sub, email: sessao.claims.email })
    await sessao.supabase.auth.signOut({ scope: 'local' })
  }
  redirect('/entrar?motivo=saiu')
}

/** Encerra a sessão em todos os aparelhos (celular perdido, funcionário que saiu). */
export async function sairDeTodos() {
  const { supabase, usuario } = await exigirAdmin()
  await registrarAcesso('saiu_de_todos', { usuario: usuario.id, email: usuario.email })
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/entrar?motivo=saiu')
}
