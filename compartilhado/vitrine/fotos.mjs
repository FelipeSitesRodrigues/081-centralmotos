/**
 * Endereços das fotos das motos. Toda URL de foto nasce aqui: se um dia as
 * fotos forem pro Cloudflare R2 (seção 5.3 do plano), a troca é neste arquivo.
 *
 * Caminho no bucket "veiculos": {veiculo}/{foto}-{largura}.{webp|jpg}
 */

/** @typedef {{ id: string, larguras: number[], formato: string, largura?: number, altura?: number, foco_x?: number, foco_y?: number, cor_media?: string | null, og?: boolean }} Foto */

const extensao = (formato) => (formato === 'jpeg' ? 'jpg' : 'webp')

/**
 * @param {string} base  ex.: https://xxx.supabase.co/storage/v1/object/public
 * @param {string} veiculo
 * @param {Foto} foto
 * @param {number} [largura] a largura pedida, ou a mais próxima que existe abaixo dela
 */
export function urlFoto(base, veiculo, foto, largura) {
  const larguras = [...foto.larguras].sort((a, b) => a - b)
  const escolhida = largura ? ([...larguras].reverse().find((l) => l <= largura) ?? larguras[0]) : larguras[0]
  return `${base}/veiculos/${veiculo}/${foto.id}-${escolhida}.${extensao(foto.formato)}`
}

/** @param {string} base @param {string} veiculo @param {Foto} foto @param {number} [ate] */
export function srcsetFoto(base, veiculo, foto, ate = Infinity) {
  return [...foto.larguras]
    .sort((a, b) => a - b)
    .filter((l) => l <= ate)
    .map((l) => `${base}/veiculos/${veiculo}/${foto.id}-${l}.${extensao(foto.formato)} ${l}w`)
    .join(', ')
}

/** Imagem de compartilhamento (JPEG 1200x630), quando existe. @param {string} base @param {string} veiculo @param {Foto} foto */
export const urlOg = (base, veiculo, foto) => `${base}/veiculos/${veiculo}/${foto.id}-og.jpg`

/** Largura e altura da maior versão, pra reservar o espaço (zero CLS). @param {Foto} foto */
export function dimensoes(foto) {
  const maior = Math.max(...foto.larguras)
  const proporcao = foto.largura && foto.altura ? foto.altura / foto.largura : 3 / 4
  return { largura: maior, altura: Math.round(maior * proporcao) }
}

/** Tamanhos de exibição por lugar (plano, seção 5.1). */
export const TAMANHOS = {
  card: '(min-width: 1240px) 290px, (min-width: 1180px) calc(25vw - 40px), (min-width: 900px) calc(33vw - 40px), (min-width: 600px) calc(50vw - 44px), calc(100vw - 32px)',
  principal: '(min-width: 1240px) 720px, (min-width: 1024px) 58vw, 100vw',
  miniatura: '96px',
}

/** Foto de entrega (bucket "entregas"): {entrega}-{largura}.{webp|jpg} @param {string} base @param {Foto} foto @param {number} [largura] */
export function urlEntrega(base, foto, largura) {
  const larguras = [...foto.larguras].sort((a, b) => a - b)
  const escolhida = largura ? ([...larguras].reverse().find((l) => l <= largura) ?? larguras[0]) : larguras[0]
  return `${base}/entregas/${foto.id}-${escolhida}.${extensao(foto.formato)}`
}

/** @param {string} base @param {Foto} foto */
export const srcsetEntrega = (base, foto) =>
  [...foto.larguras]
    .sort((a, b) => a - b)
    .map((l) => `${base}/entregas/${foto.id}-${l}.${extensao(foto.formato)} ${l}w`)
    .join(', ')
