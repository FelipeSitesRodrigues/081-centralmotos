/// <reference lib="webworker" />
import { ErroFoto, processarFoto } from './processar'

/*
 * Processa a foto fora da página: decodificar uma foto de 12 MP trava um
 * celular simples por quase um segundo, e aqui isso não congela a tela.
 */

type Pedido = { id: number; arquivo: Blob; comOg: boolean }

self.onmessage = async (evento: MessageEvent<Pedido>) => {
  const { id, arquivo, comOg } = evento.data
  try {
    const foto = await processarFoto(arquivo, comOg)
    self.postMessage({ id, ok: true, foto })
  } catch (erro) {
    const mensagem = erro instanceof ErroFoto ? erro.message : 'Não consegui processar esta foto. Tente outra.'
    self.postMessage({ id, ok: false, erro: mensagem })
  }
}
