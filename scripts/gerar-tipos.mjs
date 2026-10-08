/**
 * Gera os tipos TypeScript do banco (schema public) em compartilhado/tipos/banco.ts,
 * pela Management API (o mesmo que `supabase gen types`, sem instalar a CLI).
 *
 *   node --env-file=.env.supabase.local scripts/gerar-tipos.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { api } from './supabase-api.mjs'

const DESTINO = 'compartilhado/tipos/banco.ts'

const r = await api('/types/typescript?included_schemas=public')
if (!r.ok || typeof r.corpo?.types !== 'string') {
  console.error(`Não consegui gerar os tipos (${r.status}).`)
  process.exit(1)
}

mkdirSync('compartilhado/tipos', { recursive: true })
writeFileSync(DESTINO, `// Gerado por scripts/gerar-tipos.mjs. Não editar à mão.\n\n${r.corpo.types}`)
console.log(`ok ${DESTINO}`)
