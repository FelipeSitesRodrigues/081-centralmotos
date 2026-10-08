import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@central/vitrine/tipos'
import { SUPABASE_URL } from '@/lib/ambiente'

/*
 * Cliente com a chave secreta: passa por cima da RLS. Só pra o que o banco
 * reserva ao servidor (limite de tentativas, registro de acesso) e pro Storage
 * (URL assinada de upload, apagar arquivo). Nunca pra ler ou gravar moto em
 * nome do lojista: isso vai sempre pelo clienteServidor(), com a sessão dele.
 *
 * "server-only" faz o build falhar se este arquivo for parar no navegador.
 */
export function clienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY
  if (!chave) throw new Error('Variável de ambiente ausente: SUPABASE_SECRET_KEY. Confira o painel/.env.local.')
  return createClient<Database>(SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
