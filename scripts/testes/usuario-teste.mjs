/**
 * Usuário de teste do painel (e-mail e senha, como o do dono).
 *
 *   node --env-file=painel/.env.local scripts/testes/usuario-teste.mjs criar
 *   node --env-file=painel/.env.local scripts/testes/usuario-teste.mjs apagar
 *
 * Grava e-mail e senha em .env.teste.local (fora do Git),
 * pros testes automáticos entrarem no painel. Nada disso é impresso.
 *
 * APAGAR ANTES DO LANÇAMENTO: é um administrador de verdade no banco.
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const ARQUIVO = '.env.teste.local'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secreta = process.env.SUPABASE_SECRET_KEY
if (!url || !secreta) {
  console.error('Rode com --env-file=painel/.env.local (precisa de SUPABASE_SECRET_KEY).')
  process.exit(1)
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, secreta, opcoes)

async function apagar() {
  if (!existsSync(ARQUIVO)) {
    console.log('Nenhum usuário de teste registrado.')
    return
  }
  const email = readFileSync(ARQUIVO, 'utf8').match(/^TESTE_PAINEL_EMAIL=(.+)$/m)?.[1]
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const usuario = data.users.find((u) => u.email === email)
  if (usuario) {
    const { error: erro } = await admin.auth.admin.deleteUser(usuario.id)
    if (erro) throw erro
  }
  rmSync(ARQUIVO)
  console.log(usuario ? 'Usuário de teste apagado.' : 'Usuário já não existia; arquivo removido.')
}

async function criar() {
  if (existsSync(ARQUIVO)) {
    console.log(`Já existe um usuário de teste (${ARQUIVO}). Apague antes de criar outro.`)
    return
  }

  const email = `painel.teste.${randomBytes(4).toString('hex')}@example.com`
  const senha = `Teste ${randomBytes(18).toString('base64url')} 9a`

  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { teste: true },
  })
  if (error) throw error

  const perfil = await admin.from('perfis').insert({ id: criado.user.id, nome: 'Teste do painel', papel: 'admin' })
  if (perfil.error) throw perfil.error

  writeFileSync(
    ARQUIVO,
    [
      '# Usuário de teste do painel. APAGAR ANTES DO LANÇAMENTO: node --env-file=painel/.env.local scripts/testes/usuario-teste.mjs apagar',
      `TESTE_PAINEL_EMAIL=${email}`,
      `TESTE_PAINEL_SENHA=${senha}`,
      '',
    ].join('\n'),
    { mode: 0o600 },
  )
  console.log(`Usuário de teste criado. Dados em ${ARQUIVO}.`)
}

const acao = process.argv[2]
if (acao === 'criar') await criar()
else if (acao === 'apagar') await apagar()
else console.error('Uso: usuario-teste.mjs criar | apagar')
