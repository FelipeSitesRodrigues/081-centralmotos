import { ErroFoto, type FotoProcessada, processarFoto } from './processar'

/*
 * Escolhe onde processar: no Web Worker quando o navegador tem OffscreenCanvas
 * dentro do worker (Chrome, Android, Safari 16.4+), na página quando não tem.
 */

type Resposta = { id: number; ok: true; foto: FotoProcessada } | { id: number; ok: false; erro: string }

let trabalhador: Worker | null | undefined
let proximo = 0
const esperando = new Map<number, (r: Resposta) => void>()

function obterTrabalhador() {
  if (trabalhador !== undefined) return trabalhador
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') throw new Error('sem worker')
    trabalhador = new Worker(new URL('./foto.worker.ts', import.meta.url), { type: 'module' })
    trabalhador.onmessage = (e: MessageEvent<Resposta>) => {
      esperando.get(e.data.id)?.(e.data)
      esperando.delete(e.data.id)
    }
    trabalhador.onerror = () => {
      // Worker que não sobe (CSP, navegador antigo): cai pra página daqui pra frente
      trabalhador?.terminate()
      trabalhador = null
      for (const [id, responder] of esperando) responder({ id, ok: false, erro: '__sem_worker__' })
      esperando.clear()
    }
  } catch {
    trabalhador = null
  }
  return trabalhador
}

export async function processar(arquivo: Blob, comOg: boolean): Promise<FotoProcessada> {
  const w = obterTrabalhador()
  if (w) {
    const id = ++proximo
    const resposta = await new Promise<Resposta>((resolve) => {
      esperando.set(id, resolve)
      w.postMessage({ id, arquivo, comOg })
    })
    if (resposta.ok) return resposta.foto
    if (resposta.erro !== '__sem_worker__') throw new ErroFoto(resposta.erro)
  }
  return processarFoto(arquivo, comOg)
}

export { ErroFoto }
