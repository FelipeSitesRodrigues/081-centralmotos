'use client'

import { Star } from '@phosphor-icons/react'
import { useState, useTransition } from 'react'
import { alternarDestaque } from '@/lib/acoes/motos'

/** Estrela da lista: liga e desliga o destaque sem abrir a moto. */
export function EstrelaDestaque({ id, destaque, editadoEm, nome }: { id: string; destaque: boolean; editadoEm: string; nome: string }) {
  const [ligado, setLigado] = useState(destaque)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, iniciar] = useTransition()

  function alternar() {
    const novo = !ligado
    setLigado(novo)
    setErro(null)
    iniciar(async () => {
      const r = await alternarDestaque(id, novo, editadoEm)
      if (!r.ok) {
        setLigado(!novo)
        setErro(r.erro)
      }
    })
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={alternar}
        disabled={salvando}
        aria-pressed={ligado}
        aria-label={`${ligado ? 'Tirar' : 'Pôr'} ${nome} em destaque`}
        title={ligado ? 'Em destaque na página inicial do site' : 'Pôr em destaque'}
        className="flex size-11 items-center justify-center rounded-botao text-tinta-2 hover:bg-tinta/5 disabled:opacity-60 aria-pressed:text-[#b45309]"
      >
        <Star size={26} weight={ligado ? 'fill' : 'regular'} aria-hidden />
      </button>
      {erro && (
        <p role="alert" className="max-w-56 text-right text-[13px] font-semibold text-erro">
          {erro}
        </p>
      )}
    </div>
  )
}
