/**
 * Logins do painel: criar, trocar a senha, liberar quem foi criado no
 * dashboard do Supabase e desligar.
 *
 *   node --env-file=painel/.env.local scripts/acesso.mjs criar <email> "<Nome>"
 *   node --env-file=painel/.env.local scripts/acesso.mjs senha <email>
 *   node --env-file=painel/.env.local scripts/acesso.mjs liberar <email> "<Nome>"
 *   node --env-file=painel/.env.local scripts/acesso.mjs desligar <email>
 *
 * criar     cria o login com uma senha forte gerada aqui e o perfil de administrador.
 * senha     gera uma senha nova (quem esqueceu) e encerra as sessões abertas.
 * liberar   dá o perfil de administrador a um usuário criado à mão no dashboard
 *           do Supabase (Authentication > Users > Add user).
 * desligar  tira o acesso (perfil inativo) e encerra as sessões. O histórico fica.
 *
 * Decisão do Felipe em 2026-10-07: login só com e-mail e senha, criado por nós e
 * entregue ao dono. A senha vai pra .convites/ (fora do Git) e não aparece no
 * terminal: abra o arquivo, mande numa conversa privada do WhatsApp e apague o
 * arquivo. O dono troca a senha quando quiser, em Minha conta.
 */
import { randomInt } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secreta = process.env.SUPABASE_SECRET_KEY
const painel = process.env.PAINEL_URL
if (!url || !secreta) {
  console.error('Rode com --env-file=painel/.env.local (precisa de SUPABASE_SECRET_KEY preenchida).')
  process.exit(1)
}

const admin = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } })
const [acao, emailBruto, nome] = process.argv.slice(2)
const email = String(emailBruto ?? '').trim().toLowerCase()

if (!['criar', 'senha', 'liberar', 'desligar'].includes(acao) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Uso: acesso.mjs criar <email> "<Nome>" | senha <email> | liberar <email> "<Nome>" | desligar <email>')
  process.exit(1)
}

/** Quatro palavras curtas e um número: forte e fácil de digitar no celular. */
function senhaForte() {
  // 64 palavras (6 bits cada) × 4 + número de 100 a 999: cerca de 34 bits, de sobra com o limite
  // de 8 tentativas a cada 15 minutos por e-mail
  const palavras = [
    'moto', 'pneu', 'farol', 'guidao', 'banco', 'roda', 'motor', 'freio', 'corrente', 'tanque',
    'estrada', 'curva', 'serra', 'chapada', 'sertao', 'cacto', 'umbu', 'feira', 'praca', 'garagem',
    'escape', 'pedal', 'buzina', 'retrovisor', 'painel', 'marcha', 'embreagem', 'garupa', 'capacete', 'jaqueta',
    'luva', 'bota', 'trilha', 'poeira', 'chuva', 'sol', 'lua', 'vento', 'rio', 'lagoa',
    'milho', 'feijao', 'cafe', 'queijo', 'mandioca', 'cuscuz', 'rapadura', 'caju', 'manga', 'goiaba',
    'viola', 'forro', 'sanfona', 'zabumba', 'triangulo', 'xote', 'baiao', 'fogueira', 'mercado', 'ponte',
    'cidade', 'bairro', 'esquina', 'avenida',
  ]
  const escolhidas = Array.from({ length: 4 }, () => palavras[randomInt(palavras.length)])
  return `${escolhidas.join('-')}-${randomInt(100, 1000)}`
}

function guardar(tipo, senha) {
  mkdirSync('.convites', { recursive: true })
  const arquivo = `.convites/${tipo}-${email.replace(/[^a-z0-9]+/g, '-')}.txt`
  writeFileSync(
    arquivo,
    [
      'Acesso ao painel da Central Motos',
      '',
      `Endereço: ${painel ?? '(o endereço do painel)'}`,
      `E-mail: ${email}`,
      `Senha: ${senha}`,
      '',
      'Dá pra trocar a senha depois, no painel, em Minha conta.',
      '',
    ].join('\n'),
    { mode: 0o600 },
  )
  console.log(`Dados de acesso gravados em ${arquivo}. Mande numa conversa privada e apague o arquivo.`)
}

async function usuarioPorEmail() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  const usuario = data.users.find((u) => u.email === email)
  if (!usuario) {
    console.error('Nenhum usuário com esse e-mail.')
    process.exit(1)
  }
  return usuario
}

function exigirNome() {
  if (!nome || nome.trim().length < 2) {
    console.error(`Informe o nome: acesso.mjs ${acao} <email> "<Nome>"`)
    process.exit(1)
  }
  return nome.trim()
}

if (acao === 'criar') {
  const nomeLimpo = exigirNome()
  const senha = senhaForte()
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true })
  if (error) throw error
  const perfil = await admin.from('perfis').upsert({ id: data.user.id, nome: nomeLimpo, papel: 'admin', ativo: true })
  if (perfil.error) throw perfil.error
  guardar('acesso', senha)
}

if (acao === 'senha') {
  const usuario = await usuarioPorEmail()
  const senha = senhaForte()
  const { error } = await admin.auth.admin.updateUserById(usuario.id, { password: senha })
  if (error) throw error
  // Quem estava logado com a senha antiga entra de novo
  await admin.auth.admin.signOut(usuario.id, 'global').catch(() => {})
  guardar('senha-nova', senha)
}

if (acao === 'liberar') {
  const nomeLimpo = exigirNome()
  const usuario = await usuarioPorEmail()
  const { error } = await admin.from('perfis').upsert({ id: usuario.id, nome: nomeLimpo, papel: 'admin', ativo: true })
  if (error) throw error
  console.log('Perfil de administrador liberado. A pessoa já entra com o e-mail e a senha criados no dashboard.')
}

if (acao === 'desligar') {
  const usuario = await usuarioPorEmail()
  const { error } = await admin.from('perfis').update({ ativo: false }).eq('id', usuario.id)
  if (error) throw error
  await admin.auth.admin.signOut(usuario.id, 'global').catch(() => {})
  console.log('Acesso desligado e sessões encerradas. O histórico em Atividades continua.')
}
