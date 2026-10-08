import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/lib/ambiente'

/*
 * Envio direto do navegador pro Storage, pela URL assinada que o servidor do
 * painel emitiu (vale pra um caminho só). Nada passa pelo servidor da Vercel,
 * que corta requisição acima de 4,5 MB (lição da 057 e da 070).
 *
 * XMLHttpRequest em vez de fetch: é o que dá o progresso do envio, pra mostrar
 * a barra em cada foto.
 */

export type Envio = {
  bucket: 'veiculos' | 'entregas'
  caminho: string
  token: string
  blob: Blob
  /** Segundos de cache: o nome nunca se repete, então um ano. A imagem de compartilhamento pode ser refeita: um dia. */
  cache: number
  substituir?: boolean
  aoProgresso?: (fracao: number) => void
}

export function enviarArquivo({ bucket, caminho, token, blob, cache, substituir = false, aoProgresso }: Envio) {
  return new Promise<void>((resolve, reject) => {
    const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${caminho}?token=${encodeURIComponent(token)}`
    const corpo = new FormData()
    corpo.append('cacheControl', String(cache))
    corpo.append('', blob)

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('apikey', SUPABASE_CHAVE_PUBLICA)
    if (SUPABASE_CHAVE_PUBLICA.startsWith('eyJ')) xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_CHAVE_PUBLICA}`)
    xhr.setRequestHeader('x-upsert', String(substituir))
    xhr.timeout = 120_000
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgresso?.(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      reject(new Error(xhr.status === 413 ? 'Arquivo acima de 2 MB.' : `O envio falhou (${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Sem conexão. Confira a internet e tente de novo.'))
    xhr.ontimeout = () => reject(new Error('A internet está lenta demais. Tente de novo.'))
    xhr.send(corpo)
  })
}
