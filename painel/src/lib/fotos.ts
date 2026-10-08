import { URL_ARQUIVOS } from '@/lib/ambiente'

/*
 * Endereço público de cada foto. Os caminhos saem dos ids (nada de caminho
 * gravado no banco), igual ao lib/fotos-servidor.ts e ao build da vitrine.
 */

export type FotoPublica = { id: string; larguras: number[]; formato: 'webp' | 'jpeg' | string }

const extensao = (formato: string) => (formato === 'jpeg' ? 'jpg' : 'webp')

export function urlFotoMoto(veiculo: string, foto: FotoPublica, largura?: number) {
  const tamanho = largura && foto.larguras.includes(largura) ? largura : (foto.larguras[0] ?? 480)
  return `${URL_ARQUIVOS}/veiculos/${veiculo}/${foto.id}-${tamanho}.${extensao(foto.formato)}`
}

export function srcsetFotoMoto(veiculo: string, foto: FotoPublica) {
  return foto.larguras.map((l) => `${urlFotoMoto(veiculo, foto, l)} ${l}w`).join(', ')
}
