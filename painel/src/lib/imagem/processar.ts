/*
 * Processamento da foto no aparelho do lojista (seção 5.1 do plano). Roda num
 * Web Worker quando dá (foto.worker.ts) e na página quando não dá; o código é
 * o mesmo nos dois lugares.
 *
 * - createImageBitmap com imageOrientation "from-image" desvira a foto em pé;
 * - recusa foto com lado menor que 800 px e acima de 60 megapixels;
 * - gera 480, 960 e 1440 px de largura, nunca ampliando;
 * - WebP 0,78; se o navegador devolver outro tipo (o Safari não codifica WebP
 *   e devolve PNG), refaz tudo em JPEG 0,82. Na 057, 197 fotos subiram como
 *   PNG de até 3,3 MB com nome .webp;
 * - o reencode apaga EXIF e GPS: a localização do celular não vai pro site.
 */

export const LARGURAS = [480, 960, 1440] as const
const MAIOR_LARGURA = 1440
export const LADO_MINIMO = 800
const MAX_PIXELS = 60_000_000
const MAX_BYTES_ARQUIVO = 40 * 1024 * 1024
const MAX_BYTES_VARIANTE = 2 * 1024 * 1024
const OG = { largura: 1200, altura: 630 }

export type Variante = { largura: number; blob: Blob }

export type FotoProcessada = {
  largura: number
  altura: number
  formato: 'webp' | 'jpeg'
  variantes: Variante[]
  corMedia: string
  og: Blob | null
}

export class ErroFoto extends Error {}

/** Larguras reais: as padrão menores que a foto, mais a própria largura se couber (até 3). */
export function escolherLarguras(largura: number) {
  const menores: number[] = LARGURAS.filter((l) => l < largura)
  if (largura <= MAIOR_LARGURA) menores.push(largura)
  return menores.slice(-3)
}

type Tela = OffscreenCanvas | HTMLCanvasElement

function novaTela(largura: number, altura: number): Tela {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(largura, altura)
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  return tela
}

function contexto(tela: Tela) {
  const ctx = tela.getContext('2d', { alpha: false }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!ctx) throw new ErroFoto('Este aparelho não conseguiu processar a foto.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return ctx
}

function codificar(tela: Tela, tipo: string, qualidade: number): Promise<Blob> {
  if ('convertToBlob' in tela) return tela.convertToBlob({ type: tipo, quality: qualidade })
  return new Promise((resolve, reject) =>
    tela.toBlob((blob) => (blob ? resolve(blob) : reject(new ErroFoto('Não consegui gerar a foto.'))), tipo, qualidade),
  )
}

/**
 * Reduz em degraus de no máximo metade por vez: ir de 4000 px direto pra 480
 * deixa a foto serrilhada em alguns navegadores.
 */
function reduzir(origem: CanvasImageSource, largOrigem: number, altOrigem: number, largura: number): Tela {
  let fonte: CanvasImageSource = origem
  let l = largOrigem
  let a = altOrigem
  while (l / 2 > largura) {
    const proxL = Math.round(l / 2)
    const proxA = Math.round(a / 2)
    const meio = novaTela(proxL, proxA)
    contexto(meio).drawImage(fonte, 0, 0, proxL, proxA)
    fonte = meio
    l = proxL
    a = proxA
  }
  const altura = Math.round((altOrigem * largura) / largOrigem)
  const tela = novaTela(largura, altura)
  contexto(tela).drawImage(fonte, 0, 0, largura, altura)
  return tela
}

/** Cor média (fundo do card enquanto a foto carrega). */
function corMediaDe(origem: CanvasImageSource) {
  const tela = novaTela(8, 8)
  const ctx = contexto(tela)
  ctx.drawImage(origem, 0, 0, 8, 8)
  const { data } = ctx.getImageData(0, 0, 8, 8)
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i] ?? 0
    g += data[i + 1] ?? 0
    b += data[i + 2] ?? 0
  }
  const n = data.length / 4
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/**
 * Imagem de compartilhamento 1200x630 em JPEG (o WhatsApp nem sempre mostra
 * prévia de WebP), recortada em volta do ponto de foco.
 */
export async function gerarOg(origem: CanvasImageSource, largura: number, altura: number, focoX = 50, focoY = 50): Promise<Blob> {
  const escala = Math.max(OG.largura / largura, OG.altura / altura)
  const visivelL = OG.largura / escala
  const visivelA = OG.altura / escala
  const x = Math.min(Math.max((largura * focoX) / 100 - visivelL / 2, 0), largura - visivelL)
  const y = Math.min(Math.max((altura * focoY) / 100 - visivelA / 2, 0), altura - visivelA)
  const tela = novaTela(OG.largura, OG.altura)
  contexto(tela).drawImage(origem, x, y, visivelL, visivelA, 0, 0, OG.largura, OG.altura)
  return codificar(tela, 'image/jpeg', 0.85)
}

async function variantes(bitmap: ImageBitmap, larguras: number[], tipo: string, qualidade: number) {
  const lista: Variante[] = []
  // Da maior pra menor: cada redução parte da anterior, que já está perto do tamanho
  let fonte: CanvasImageSource = bitmap
  let largFonte = bitmap.width
  let altFonte = bitmap.height
  for (const largura of [...larguras].reverse()) {
    const tela = reduzir(fonte, largFonte, altFonte, largura)
    let q = qualidade
    let blob = await codificar(tela, tipo, q)
    while (blob.size > MAX_BYTES_VARIANTE && q > 0.5) {
      q -= 0.08
      blob = await codificar(tela, tipo, q)
    }
    lista.unshift({ largura, blob })
    fonte = tela as CanvasImageSource
    largFonte = tela.width
    altFonte = tela.height
  }
  return lista
}

export async function processarFoto(arquivo: Blob, comOg: boolean): Promise<FotoProcessada> {
  if (arquivo.size > MAX_BYTES_ARQUIVO) throw new ErroFoto('Arquivo grande demais (mais de 40 MB).')

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErroFoto('Formato não suportado. Mande a foto em JPG.')
  }

  try {
    const { width: largura, height: altura } = bitmap
    if (largura * altura > MAX_PIXELS) throw new ErroFoto('Foto grande demais (mais de 60 megapixels).')
    if (Math.min(largura, altura) < LADO_MINIMO) {
      throw new ErroFoto(`Foto pequena demais (${largura} × ${altura}). O lado menor precisa de pelo menos ${LADO_MINIMO} px.`)
    }

    const larguras = escolherLarguras(largura)
    let formato: 'webp' | 'jpeg' = 'webp'
    let lista = await variantes(bitmap, larguras, 'image/webp', 0.78)
    // Trava do Safari: pediu WebP e veio outra coisa (PNG) → tudo em JPEG
    if (lista.some((v) => v.blob.type !== 'image/webp')) {
      formato = 'jpeg'
      lista = await variantes(bitmap, larguras, 'image/jpeg', 0.82)
      if (lista.some((v) => v.blob.type !== 'image/jpeg')) throw new ErroFoto('Este navegador não conseguiu gerar a foto. Tente pelo Chrome.')
    }

    return {
      largura,
      altura,
      formato,
      variantes: lista,
      corMedia: corMediaDe(bitmap),
      og: comOg ? await gerarOg(bitmap, largura, altura) : null,
    }
  } finally {
    bitmap.close()
  }
}
