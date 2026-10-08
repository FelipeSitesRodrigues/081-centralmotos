/*
 * Endereço e chave pública do Supabase. As duas iriam pro navegador de qualquer
 * jeito (é o papel delas): quem protege os dados são as regras do banco, não o
 * segredo da chave. A chave secreta fica só em supabase/admin.ts.
 */

function exigir(nome: string, valor: string | undefined) {
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}. Confira o painel/.env.local.`)
  return valor
}

// process.env.NEXT_PUBLIC_* escrito por extenso: o Next só embute assim
export const SUPABASE_URL = exigir('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
export const SUPABASE_CHAVE_PUBLICA = exigir('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

/** Vitrine publicada, pro botão "ver no site". Vazio até o site ir pro ar. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || null

/** Arquivos públicos do Storage (os dois buckets são só leitura pela URL). */
export const URL_ARQUIVOS = `${SUPABASE_URL}/storage/v1/object/public`
