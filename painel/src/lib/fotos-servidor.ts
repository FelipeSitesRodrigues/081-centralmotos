import 'server-only'
import { clienteAdmin } from '@/lib/supabase/admin'

/*
 * Arquivos de foto no Storage. Nenhum caminho é gravado no banco: eles saem
 * dos ids (seção 5.1 do plano), então montar o caminho aqui é a única fonte.
 *
 *   veiculos/{veiculo}/{foto}-{largura}.{webp|jpg}   e   veiculos/{veiculo}/{foto}-og.jpg
 *   entregas/{entrega}-{largura}.{webp|jpg}
 */

type FotoGuardada = { id: string; larguras: number[]; formato: 'webp' | 'jpeg' }

export type Bucket = 'veiculos' | 'entregas'

export function caminhosDaFoto(bucket: Bucket, dono: string, foto: FotoGuardada) {
  const extensao = foto.formato === 'jpeg' ? 'jpg' : 'webp'
  const base = bucket === 'veiculos' ? `${dono}/${foto.id}` : foto.id
  const caminhos = foto.larguras.map((largura) => `${base}-${largura}.${extensao}`)
  // A imagem de compartilhamento pode existir mesmo com og=false (upload sem o aviso final)
  if (bucket === 'veiculos') caminhos.push(`${base}-og.jpg`)
  return caminhos
}

/** Apaga os arquivos; se falhar, registra e segue (a limpeza diária pega os órfãos). */
export async function apagarArquivosDeFotos(bucket: Bucket, dono: string, fotos: FotoGuardada[]) {
  const caminhos = fotos.flatMap((foto) => caminhosDaFoto(bucket, dono, foto))
  if (!caminhos.length) return
  try {
    const { error } = await clienteAdmin().storage.from(bucket).remove(caminhos)
    if (error) throw error
  } catch (erro) {
    console.error(`Não apaguei ${caminhos.length} arquivo(s) do Storage:`, erro instanceof Error ? erro.message : erro)
  }
}
