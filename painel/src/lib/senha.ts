/*
 * Regras da senha do painel. O Supabase já exige 12 caracteres (configurado no
 * projeto): aqui é pra avisar antes de enviar, em português.
 * Sem exigência de símbolo e maiúscula: uma frase longa é mais forte e mais
 * fácil de lembrar pra quem usa o painel no balcão.
 */

export const TAMANHO_MINIMO_SENHA = 12

/** O bcrypt do Supabase só considera os primeiros 72 bytes. */
const MAX_BYTES_SENHA = 72

const FRACAS = ['123456789012', 'centralmotos', 'senhasenha12', 'qwertyuiop12']

export function problemaDaSenha(senha: string) {
  if (senha.length < TAMANHO_MINIMO_SENHA) return `A senha precisa de pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  if (new TextEncoder().encode(senha).length > MAX_BYTES_SENHA) return 'A senha pode ter no máximo 72 caracteres.'
  if (new Set(senha).size < 5) return 'Essa senha repete os mesmos caracteres. Use uma frase ou mais variedade.'
  if (FRACAS.some((f) => senha.toLowerCase().includes(f))) return 'Essa senha é fácil de adivinhar. Escolha outra.'
  return null
}
