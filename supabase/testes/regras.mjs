/**
 * Roda supabase/testes/regras.sql e mostra o placar. O SQL termina sempre em
 * erro de propósito ('RESULTADO:' com o placar), pra transação ser desfeita e
 * nada ficar no banco.
 *
 *   node --env-file=.env.supabase.local supabase/testes/regras.mjs
 */
import { readFileSync } from 'node:fs'
import { sql } from '../../scripts/supabase-api.mjs'

let mensagem = ''
try {
  await sql(readFileSync(new URL('./regras.sql', import.meta.url), 'utf8'))
  console.error('O teste terminou sem o placar: o último comando deveria levantar RESULTADO.')
  process.exit(1)
} catch (erro) {
  mensagem = erro.message
}

const inicio = mensagem.indexOf('RESULTADO:')
if (inicio < 0) {
  console.error('O teste quebrou antes do fim:\n' + mensagem)
  process.exit(1)
}
const json = mensagem.slice(inicio + 'RESULTADO:'.length).split('\nCONTEXT:')[0].trim()
const resultados = JSON.parse(json)

let falhas = 0
for (const r of resultados) {
  if (!r.ok) falhas++
  console.log(`${r.ok ? 'ok  ' : 'FALHOU'} ${r.nome}${!r.ok && r.detalhe ? `\n       ${r.detalhe}` : ''}`)
}
console.log(`\n${resultados.length - falhas} de ${resultados.length} regras conferidas${falhas ? `, ${falhas} falharam` : ''}.`)
// exitCode em vez de process.exit(): no Windows, sair no meio do fechamento do fetch derruba o Node
process.exitCode = falhas ? 1 : 0
