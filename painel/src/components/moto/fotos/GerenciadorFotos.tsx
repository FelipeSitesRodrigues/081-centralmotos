'use client'

import { ArrowClockwise, Camera, DotsSixVertical, Warning, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { concluirEnvio, excluirFotos, marcarOg, prepararEnvio, prepararOg, reordenarFotos } from '@/lib/acoes/fotos'
import { srcsetFotoMoto, urlFotoMoto } from '@/lib/fotos'
import { enviarArquivo } from '@/lib/imagem/envio'
import { gerarOg } from '@/lib/imagem/processar'
import { ErroFoto, processar } from '@/lib/imagem/processador'
import { Aviso, Botao, Cartao, TituloSecao } from '@/components/ui'
import { AjusteFoco } from './AjusteFoco'

export type FotoTela = {
  id: string
  posicao: number
  larguras: number[]
  formato: string
  largura_original: number
  altura_original: number
  foco_x: number
  foco_y: number
  cor_media: string | null
  og: boolean
}

type Envio = {
  chave: string
  arquivo: File
  previa: string
  etapa: 'esperando' | 'processando' | 'enviando' | 'cadastrando' | 'erro'
  progresso: number
  erro?: string
}

const MAX_FOTOS = 20
const UM_ANO = 31_536_000
const UM_DIA = 86_400

export function GerenciadorFotos({
  veiculo,
  fotosIniciais,
  aoMudarTotal,
  aoMudarEnvio,
}: {
  veiculo: string
  fotosIniciais: FotoTela[]
  aoMudarTotal: (total: number) => void
  aoMudarEnvio: (enviando: boolean) => void
}) {
  const [fotos, setFotos] = useState<FotoTela[]>(fotosIniciais)
  // A fila mora na referência (a ordem de processamento não depende do React) e é espelhada no estado pra tela
  const filaRef = useRef<Envio[]>([])
  const [envios, setEnviosTela] = useState<Envio[]>([])
  const setEnvios = useCallback((mudar: (lista: Envio[]) => Envio[]) => {
    filaRef.current = mudar(filaRef.current)
    setEnviosTela(filaRef.current)
  }, [])
  const [erro, setErro] = useState<string | null>(null)
  const [escolhida, setEscolhida] = useState<FotoTela | null>(null)
  const [focando, setFocando] = useState<FotoTela | null>(null)
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const fila = useRef(false)
  const acoes = useRef<HTMLDialogElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  // O servidor é a fonte da verdade: cada refresh traz a lista nova (menos durante o arrasto)
  useEffect(() => {
    if (!arrastando) setFotos(fotosIniciais)
  }, [fotosIniciais, arrastando])

  useEffect(() => aoMudarTotal(fotos.length), [fotos.length, aoMudarTotal])
  const enviando = envios.some((e) => e.etapa !== 'erro')
  useEffect(() => aoMudarEnvio(enviando), [enviando, aoMudarEnvio])

  const atualizar = (chave: string, mudanca: Partial<Envio>) => setEnvios((lista) => lista.map((e) => (e.chave === chave ? { ...e, ...mudanca } : e)))

  /** Refaz a imagem de compartilhamento da capa (capa nova ou foco novo). */
  const refazerOg = useCallback(
    async (foto: FotoTela) => {
      try {
        const maior = Math.max(...foto.larguras)
        const resposta = await fetch(urlFotoMoto(veiculo, foto, maior), { mode: 'cors' })
        const bitmap = await createImageBitmap(await resposta.blob())
        const og = await gerarOg(bitmap, bitmap.width, bitmap.height, foto.foco_x, foto.foco_y)
        bitmap.close()
        const r = await prepararOg(veiculo, foto.id)
        if (!r.ok) return
        await enviarArquivo({ bucket: 'veiculos', caminho: r.caminho, token: r.token, blob: og, cache: UM_DIA, substituir: true })
        await marcarOg(veiculo, foto.id)
      } catch (e) {
        // Sem a imagem de compartilhamento o site usa a padrão da loja: não trava nada
        console.warn('Imagem de compartilhamento não refeita:', e)
      }
    },
    [veiculo],
  )

  // ---- Envio: uma foto por vez, na ordem escolhida (a primeira de uma moto sem foto vira capa)
  async function enviarUma(envio: Envio) {
    const { chave, arquivo } = envio
    try {
      atualizar(chave, { etapa: 'processando', progresso: 0, erro: undefined })
      const virouCapa = fotosRef.current.length === 0
      const foto = await processar(arquivo, virouCapa)

      const preparo = await prepararEnvio({
        veiculo,
        fotos: [{ larguras: foto.variantes.map((v) => v.largura), formato: foto.formato, og: Boolean(foto.og) }],
      })
      if (!preparo.ok) throw new ErroFoto(preparo.erro)
      const [{ id, envios: alvos }] = preparo.fotos as [(typeof preparo.fotos)[number]]

      atualizar(chave, { etapa: 'enviando' })
      const tamanhos = alvos.map((a) => (a.largura === 'og' ? (foto.og?.size ?? 0) : (foto.variantes.find((v) => v.largura === a.largura)?.blob.size ?? 0)))
      const total = tamanhos.reduce((s, t) => s + t, 0) || 1
      const enviados = alvos.map(() => 0)
      await Promise.all(
        alvos.map((alvo, i) =>
          enviarArquivo({
            bucket: 'veiculos',
            caminho: alvo.caminho,
            token: alvo.token,
            blob: alvo.largura === 'og' ? (foto.og as Blob) : (foto.variantes.find((v) => v.largura === alvo.largura) as { blob: Blob }).blob,
            cache: alvo.largura === 'og' ? UM_DIA : UM_ANO,
            substituir: alvo.largura === 'og',
            aoProgresso: (fracao) => {
              enviados[i] = fracao * (tamanhos[i] ?? 0)
              atualizar(chave, { progresso: enviados.reduce((s, t) => s + t, 0) / total })
            },
          }),
        ),
      )

      atualizar(chave, { etapa: 'cadastrando', progresso: 1 })
      const r = await concluirEnvio({
        veiculo,
        fotos: [
          {
            id,
            larguras: foto.variantes.map((v) => v.largura),
            formato: foto.formato,
            largura_original: foto.largura,
            altura_original: foto.altura,
            cor_media: foto.corMedia,
            og: Boolean(foto.og),
          },
        ],
      })
      if (!r.ok) throw new ErroFoto(r.erro)

      // Aparece na hora; o refresh do servidor confirma em seguida
      setFotos((lista) => [
        ...lista,
        {
          id,
          posicao: lista.length,
          larguras: foto.variantes.map((v) => v.largura),
          formato: foto.formato,
          largura_original: foto.largura,
          altura_original: foto.altura,
          foco_x: 50,
          foco_y: 50,
          cor_media: foto.corMedia,
          og: Boolean(foto.og),
        },
      ])
      URL.revokeObjectURL(envio.previa)
      setEnvios((lista) => lista.filter((e) => e.chave !== chave))
    } catch (e) {
      atualizar(chave, { etapa: 'erro', erro: e instanceof Error ? e.message : 'O envio falhou. Tente de novo.' })
    }
  }

  async function rodarFila() {
    if (fila.current) return
    fila.current = true
    try {
      for (;;) {
        const proximo = filaRef.current.find((e) => e.etapa === 'esperando')
        if (!proximo) break
        await enviarUma(proximo)
      }
    } finally {
      fila.current = false
    }
  }

  function escolherArquivos(lista: FileList | null) {
    if (!lista?.length) return
    setErro(null)
    const livres = MAX_FOTOS - fotos.length - envios.filter((e) => e.etapa !== 'erro').length
    const arquivos = [...lista].slice(0, Math.max(livres, 0))
    if (lista.length > arquivos.length) {
      setErro(livres <= 0 ? 'Esta moto já tem 20 fotos, o máximo.' : `Cabem só mais ${livres} fotos. As primeiras ${livres} entraram na fila.`)
    }
    setEnvios((atual) => [
      ...atual,
      ...arquivos.map((arquivo) => ({
        chave: `${arquivo.name}-${arquivo.size}-${Math.random().toString(36).slice(2)}`,
        arquivo,
        previa: URL.createObjectURL(arquivo),
        etapa: 'esperando' as const,
        progresso: 0,
      })),
    ])
    if (entrada.current) entrada.current.value = ''
    setTimeout(rodarFila, 0)
  }

  function tentarDeNovo(chave: string) {
    atualizar(chave, { etapa: 'esperando', erro: undefined, progresso: 0 })
    setTimeout(rodarFila, 0)
  }

  function desistir(envio: Envio) {
    URL.revokeObjectURL(envio.previa)
    setEnvios((lista) => lista.filter((e) => e.chave !== envio.chave))
  }

  // ---- Ordem
  async function gravarOrdem(nova: FotoTela[], antiga: FotoTela[]) {
    setFotos(nova)
    const r = await reordenarFotos(
      veiculo,
      nova.map((f) => f.id),
    )
    if (!r.ok) {
      setFotos(antiga)
      setErro(r.erro)
      return
    }
    const capa = nova[0]
    if (capa && capa.id !== antiga[0]?.id && !capa.og) void refazerOg(capa)
  }

  function mover(foto: FotoTela, para: number) {
    const antiga = fotos
    const de = antiga.findIndex((f) => f.id === foto.id)
    if (de < 0 || para < 0 || para >= antiga.length || de === para) return
    const nova = [...antiga]
    const [tirada] = nova.splice(de, 1)
    nova.splice(para, 0, tirada as FotoTela)
    void gravarOrdem(nova, antiga)
  }

  // ---- Arrastar pela alça (o resto da foto continua rolando a página)
  const ordemAntesDoArrasto = useRef<FotoTela[]>([])
  function comecarArrasto(e: React.PointerEvent, foto: FotoTela) {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ordemAntesDoArrasto.current = fotos
    setArrastando(foto.id)
  }
  function moverArrasto(e: React.PointerEvent) {
    if (!arrastando) return
    const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-foto]')
    const para = alvo ? Number(alvo.dataset.indice) : -1
    if (para < 0) return
    setFotos((lista) => {
      const de = lista.findIndex((f) => f.id === arrastando)
      if (de === para || de < 0) return lista
      const nova = [...lista]
      const [tirada] = nova.splice(de, 1)
      nova.splice(para, 0, tirada as FotoTela)
      return nova
    })
  }
  function soltarArrasto() {
    if (!arrastando) return
    setArrastando(null)
    const antiga = ordemAntesDoArrasto.current
    if (antiga.map((f) => f.id).join() !== fotos.map((f) => f.id).join()) void gravarOrdem(fotos, antiga)
  }

  // ---- Ações de uma foto (folha que abre ao tocar)
  function abrir(foto: FotoTela) {
    setEscolhida(foto)
    setConfirmarApagar(false)
    acoes.current?.showModal()
  }
  const fechar = () => acoes.current?.close()

  async function apagar(foto: FotoTela) {
    fechar()
    const antiga = fotos
    setFotos(antiga.filter((f) => f.id !== foto.id))
    const r = await excluirFotos(veiculo, [foto.id])
    if (!r.ok) {
      setFotos(antiga)
      setErro(r.erro)
      return
    }
    const novaCapa = antiga.filter((f) => f.id !== foto.id)[0]
    if (antiga[0]?.id === foto.id && novaCapa && !novaCapa.og) void refazerOg(novaCapa)
  }

  const indiceEscolhida = escolhida ? fotos.findIndex((f) => f.id === escolhida.id) : -1
  const livres = MAX_FOTOS - fotos.length - envios.filter((e) => e.etapa !== 'erro').length

  return (
    <Cartao>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <TituloSecao>Fotos</TituloSecao>
        <span className="text-[15px] font-semibold text-tinta-2 tabular-nums">
          {fotos.length} de {MAX_FOTOS}
        </span>
      </div>
      <p className="mt-1 text-[15px] text-tinta-2">Fotografe de lado, com o celular deitado. A primeira foto é a capa do anúncio.</p>

      {erro && (
        <div className="mt-3">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" onPointerMove={moverArrasto} onPointerUp={soltarArrasto} onPointerCancel={soltarArrasto}>
        {fotos.map((foto, indice) => (
          <li
            key={foto.id}
            data-foto
            data-indice={indice}
            className={`relative overflow-hidden rounded-botao border bg-gelo ${arrastando === foto.id ? 'border-preto opacity-70 ring-2 ring-preto' : 'border-linha'}`}
          >
            <button type="button" onClick={() => abrir(foto)} className="block w-full cursor-pointer" aria-label={`Foto ${indice + 1}${indice === 0 ? ', capa' : ''}: abrir ações`}>
              <span className="block aspect-[4/3]" style={{ background: foto.cor_media ?? '#ebe8e3' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- já reduzida no upload */}
                <img
                  src={urlFotoMoto(veiculo, foto, 480)}
                  srcSet={srcsetFotoMoto(veiculo, foto)}
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 46vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="size-full object-cover"
                  style={{ objectPosition: `${foto.foco_x}% ${foto.foco_y}%` }}
                />
              </span>
            </button>
            <span className={`pointer-events-none absolute top-2 left-2 rounded-selo px-2 py-0.5 text-[13px] font-bold ${indice === 0 ? 'bg-vermelho text-papel' : 'bg-preto/75 text-papel'}`}>
              {indice === 0 ? 'Capa' : indice + 1}
            </span>
            {fotos.length > 1 && (
              <span
                role="button"
                tabIndex={-1}
                aria-hidden
                onPointerDown={(e) => comecarArrasto(e, foto)}
                className="absolute top-1 right-1 flex size-11 cursor-grab touch-none items-center justify-center rounded-botao bg-preto/60 text-papel active:cursor-grabbing"
                title="Arraste pra mudar a ordem"
              >
                <DotsSixVertical size={22} weight="bold" />
              </span>
            )}
          </li>
        ))}

        {envios.map((envio) => (
          <li key={envio.chave} className="relative overflow-hidden rounded-botao border border-linha bg-gelo">
            <span className="block aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local do arquivo escolhido */}
              <img src={envio.previa} alt="" className={`size-full object-cover ${envio.etapa === 'erro' ? 'opacity-40' : 'opacity-60'}`} />
            </span>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-papel/92 p-2">
              {envio.etapa === 'erro' ? (
                <>
                  <p className="flex items-start gap-1 text-[13px] leading-snug font-bold text-erro">
                    <Warning size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                    {envio.erro}
                  </p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => tentarDeNovo(envio.chave)} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-botao bg-preto text-[14px] font-bold text-papel">
                      <ArrowClockwise size={16} weight="bold" aria-hidden /> De novo
                    </button>
                    <button type="button" onClick={() => desistir(envio)} className="flex size-11 items-center justify-center rounded-botao border border-linha-forte" aria-label="Tirar da fila">
                      <X size={16} weight="bold" aria-hidden />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-bold">
                    {{ esperando: 'Na fila', processando: 'Preparando...', enviando: `Enviando ${Math.round(envio.progresso * 100)}%`, cadastrando: 'Quase lá...' }[envio.etapa]}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-linha" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(envio.progresso * 100)} aria-label="Envio da foto">
                    <div className="h-full origin-left bg-verde transition-transform duration-200" style={{ transform: `scaleX(${envio.etapa === 'enviando' || envio.etapa === 'cadastrando' ? envio.progresso : 0.04})` }} />
                  </div>
                </>
              )}
            </div>
          </li>
        ))}

        {livres > 0 && (
          <li>
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-botao border-2 border-dashed border-linha-forte bg-papel text-center font-bold hover:border-tinta has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-preto">
              <Camera size={30} aria-hidden />
              <span>{fotos.length || envios.length ? 'Mais fotos' : 'Adicionar fotos'}</span>
              <input ref={entrada} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => escolherArquivos(e.target.files)} />
            </label>
          </li>
        )}
      </ul>

      {enviando && <p className="mt-3 text-[14px] font-semibold text-tinta-2">Não feche esta tela até as fotos terminarem de subir.</p>}

      {/* Folha de ações da foto */}
      <dialog
        ref={acoes}
        aria-labelledby="titulo-foto"
        className="m-0 mt-auto w-full max-w-none rounded-t-cartao bg-papel p-0 text-tinta backdrop:bg-preto/55 sm:m-auto sm:max-w-md sm:rounded-cartao"
      >
        <div className="flex items-center justify-between border-b border-linha px-4 py-3">
          <h2 id="titulo-foto" className="text-lg font-extrabold">
            {indiceEscolhida === 0 ? 'Capa' : `Foto ${indiceEscolhida + 1}`}
          </h2>
          <button type="button" onClick={fechar} className="flex size-11 items-center justify-center rounded-botao hover:bg-tinta/5" aria-label="Fechar">
            <X size={22} weight="bold" aria-hidden />
          </button>
        </div>
        {escolhida && !confirmarApagar && (
          <ul className="flex flex-col p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {indiceEscolhida > 0 && (
              <li>
                <button type="button" onClick={() => (fechar(), mover(escolhida, 0))} className="flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold hover:bg-tinta/5">
                  Usar como capa
                </button>
              </li>
            )}
            {indiceEscolhida > 0 && (
              <li>
                <button type="button" onClick={() => (fechar(), mover(escolhida, indiceEscolhida - 1))} className="flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold hover:bg-tinta/5">
                  Mover pra antes
                </button>
              </li>
            )}
            {indiceEscolhida < fotos.length - 1 && (
              <li>
                <button type="button" onClick={() => (fechar(), mover(escolhida, indiceEscolhida + 1))} className="flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold hover:bg-tinta/5">
                  Mover pra depois
                </button>
              </li>
            )}
            <li>
              <button type="button" onClick={() => (fechar(), setFocando(escolhida))} className="flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold hover:bg-tinta/5">
                Ajustar o enquadramento
              </button>
            </li>
            <li>
              <button type="button" onClick={() => setConfirmarApagar(true)} className="flex min-h-12 w-full items-center rounded-botao px-3 text-left font-bold text-erro hover:bg-erro-fundo">
                Apagar a foto
              </button>
            </li>
          </ul>
        )}
        {escolhida && confirmarApagar && (
          <div className="flex flex-col gap-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <p className="text-tinta-2">A foto some do anúncio e do celular de quem for ver. Não dá pra desfazer.</p>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Botao variante="perigo" onClick={() => void apagar(escolhida)} className="flex-1">
                Apagar a foto
              </Botao>
              <Botao variante="fantasma" onClick={() => setConfirmarApagar(false)} className="flex-1">
                Voltar
              </Botao>
            </div>
          </div>
        )}
      </dialog>

      {focando && (
        <AjusteFoco
          veiculo={veiculo}
          foto={focando}
          aoFechar={() => setFocando(null)}
          aoSalvar={(x, y) => {
            const atualizada = { ...focando, foco_x: x, foco_y: y }
            setFotos((lista) => lista.map((f) => (f.id === focando.id ? atualizada : f)))
            setFocando(null)
            // Foco novo na capa: a imagem de compartilhamento acompanha
            if (fotos[0]?.id === focando.id) void refazerOg(atualizada)
          }}
        />
      )}
    </Cartao>
  )
}
