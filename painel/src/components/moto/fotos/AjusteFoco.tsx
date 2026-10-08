'use client'

import { X } from '@phosphor-icons/react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { definirFoco } from '@/lib/acoes/fotos'
import { srcsetFotoMoto, urlFotoMoto } from '@/lib/fotos'
import { Aviso, Botao } from '@/components/ui'
import type { FotoTela } from './GerenciadorFotos'

const limitar = (v: number) => Math.min(100, Math.max(0, Math.round(v)))

/**
 * Ponto de foco: o centro do enquadramento quando a foto é cortada no card do
 * site (foto em pé num card deitado não corta a moto ao meio).
 */
export function AjusteFoco({
  veiculo,
  foto,
  aoFechar,
  aoSalvar,
}: {
  veiculo: string
  foto: FotoTela
  aoFechar: () => void
  aoSalvar: (x: number, y: number) => void
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [x, setX] = useState(foto.foco_x)
  const [y, setY] = useState(foto.foco_y)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciar] = useTransition()

  useEffect(() => {
    dialogo.current?.showModal()
  }, [])

  function marcar(e: React.PointerEvent<HTMLDivElement>) {
    const caixa = e.currentTarget.getBoundingClientRect()
    setX(limitar(((e.clientX - caixa.left) / caixa.width) * 100))
    setY(limitar(((e.clientY - caixa.top) / caixa.height) * 100))
  }

  function teclado(e: React.KeyboardEvent) {
    const passo = e.shiftKey ? 10 : 5
    const mapa: Record<string, () => void> = {
      ArrowLeft: () => setX((v) => limitar(v - passo)),
      ArrowRight: () => setX((v) => limitar(v + passo)),
      ArrowUp: () => setY((v) => limitar(v - passo)),
      ArrowDown: () => setY((v) => limitar(v + passo)),
    }
    if (mapa[e.key]) {
      e.preventDefault()
      mapa[e.key]?.()
    }
  }

  function salvar() {
    setErro(null)
    iniciar(async () => {
      const r = await definirFoco(veiculo, foto.id, x, y)
      if (!r.ok) return setErro(r.erro)
      dialogo.current?.close()
      aoSalvar(x, y)
    })
  }

  const fundo = foto.cor_media ?? '#ebe8e3'
  const posicao = `${x}% ${y}%`

  return (
    <dialog
      ref={dialogo}
      onClose={aoFechar}
      aria-labelledby="titulo-foco"
      className="m-auto max-h-[92dvh] w-[min(640px,calc(100%-1.5rem))] rounded-cartao bg-papel p-0 text-tinta backdrop:bg-preto/60"
    >
      <div className="flex items-center justify-between border-b border-linha px-4 py-3">
        <h2 id="titulo-foco" className="text-lg font-extrabold">
          Enquadramento
        </h2>
        <button type="button" onClick={() => dialogo.current?.close()} className="flex size-11 items-center justify-center rounded-botao hover:bg-tinta/5" aria-label="Fechar">
          <X size={22} weight="bold" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <p className="text-[15px] text-tinta-2">Toque no ponto que não pode sumir quando a foto for cortada, normalmente o meio da moto.</p>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Ponto de foco da foto"
          aria-valuetext={`${x}% da esquerda, ${y}% de cima`}
          aria-valuenow={x}
          aria-valuemin={0}
          aria-valuemax={100}
          onPointerDown={marcar}
          onKeyDown={teclado}
          className="relative cursor-crosshair touch-none overflow-hidden rounded-botao select-none"
          style={{ background: fundo }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- já reduzida no upload */}
          <img
            src={urlFotoMoto(veiculo, foto, 960)}
            srcSet={srcsetFotoMoto(veiculo, foto)}
            sizes="(min-width: 640px) 600px, 92vw"
            width={foto.largura_original}
            height={foto.altura_original}
            alt="Foto inteira, pra escolher o ponto de foco"
            draggable={false}
            className="pointer-events-none block h-auto max-h-[50dvh] w-full object-contain"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-papel shadow-[0_0_0_2px_rgba(11,11,13,0.8)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-tinta-2">No card do site</span>
            <span className="block aspect-[4/3] w-36 overflow-hidden rounded-botao border border-linha" style={{ background: fundo }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia do corte */}
              <img src={urlFotoMoto(veiculo, foto, 480)} alt="" className="size-full object-cover" style={{ objectPosition: posicao }} />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold text-tinta-2">Na prévia do WhatsApp</span>
            <span className="block aspect-[1.91/1] w-44 overflow-hidden rounded-botao border border-linha" style={{ background: fundo }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia do corte */}
              <img src={urlFotoMoto(veiculo, foto, 480)} alt="" className="size-full object-cover" style={{ objectPosition: posicao }} />
            </span>
          </div>
        </div>

        {erro && <Aviso>{erro}</Aviso>}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Botao variante="escuro" onClick={salvar} disabled={salvando} className="flex-1">
            {salvando ? 'Salvando...' : 'Salvar o enquadramento'}
          </Botao>
          <Botao variante="fantasma" onClick={() => dialogo.current?.close()} disabled={salvando} className="flex-1">
            Cancelar
          </Botao>
        </div>
      </div>
    </dialog>
  )
}
