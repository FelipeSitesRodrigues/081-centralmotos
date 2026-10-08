'use client'

import type { ReactNode } from 'react'
import { Campo, classeEntrada } from '@/components/ui'

/*
 * Campos do formulário da moto. Todos controlados pelo FormMoto (o estado mora
 * lá), com rótulo visível, erro ao lado do campo e área de toque de 44 px.
 */

type Opcao = { valor: string; rotulo: string }

export const opcoesDe = (rotulos: Record<string, string>): Opcao[] => Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }))

const descrito = (id: string, erro?: string, ajuda?: ReactNode) => (erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined)

export function CampoSelect({
  id,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  vazio = 'Escolha',
  erro,
  ajuda,
  opcional,
  desligado,
}: {
  id: string
  rotulo: string
  valor: string
  opcoes: Opcao[]
  aoMudar: (valor: string) => void
  vazio?: string
  erro?: string
  ajuda?: ReactNode
  opcional?: boolean
  desligado?: boolean
}) {
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} opcional={opcional}>
      <div className="relative">
        <select
          id={id}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={Boolean(erro)}
          aria-describedby={descrito(id, erro, ajuda)}
          disabled={desligado}
          className={`${classeEntrada} cursor-pointer appearance-none pr-11`}
        >
          <option value="">{vazio}</option>
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-tinta-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </Campo>
  )
}

export function CampoTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  aoSair,
  erro,
  ajuda,
  opcional,
  prefixo,
  sufixo,
  ...entrada
}: {
  id: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  aoSair?: () => void
  erro?: string
  ajuda?: ReactNode
  opcional?: boolean
  prefixo?: string
  sufixo?: string
} & Omit<React.ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'onBlur'>) {
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} opcional={opcional}>
      <div className="relative">
        {prefixo && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-bold text-tinta-2">
            {prefixo}
          </span>
        )}
        <input
          id={id}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onBlur={aoSair}
          aria-invalid={Boolean(erro)}
          aria-describedby={descrito(id, erro, ajuda)}
          className={`${classeEntrada} ${prefixo ? 'pl-11' : ''} ${sufixo ? 'pr-14' : ''}`}
          {...entrada}
        />
        {sufixo && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-bold text-tinta-2">
            {sufixo}
          </span>
        )}
      </div>
    </Campo>
  )
}

export function CampoAreaTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  maximo,
  erro,
  ajuda,
  opcional,
  linhas = 5,
}: {
  id: string
  rotulo: string
  valor: string
  aoMudar: (valor: string) => void
  maximo: number
  erro?: string
  ajuda?: ReactNode
  opcional?: boolean
  linhas?: number
}) {
  const restam = maximo - valor.length
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} ajuda={ajuda} opcional={opcional}>
      <textarea
        id={id}
        value={valor}
        rows={linhas}
        maxLength={maximo}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={Boolean(erro)}
        aria-describedby={`${id}-conta ${descrito(id, erro, ajuda) ?? ''}`.trim()}
        className={`${classeEntrada} min-h-32 py-3 leading-relaxed`}
      />
      <p id={`${id}-conta`} className={`text-right text-[13px] ${restam < 100 ? 'font-bold text-reservada-texto' : 'text-tinta-2'}`}>
        {restam} {restam === 1 ? 'caractere' : 'caracteres'} sobrando
      </p>
    </Campo>
  )
}

/** Escolha entre poucas opções (0 km ou seminova), em botões grandes. */
export function Opcoes({
  nome,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  erro,
}: {
  nome: string
  rotulo: string
  valor: string
  opcoes: Opcao[]
  aoMudar: (valor: string) => void
  erro?: string
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={erro ? `${nome}-erro` : undefined}>
      <legend className="mb-1.5 text-[15px] font-bold">{rotulo}</legend>
      <div className="grid grid-cols-2 gap-2">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className="flex min-h-12 cursor-pointer items-center justify-center rounded-botao border border-linha-forte bg-papel px-3 font-bold has-checked:border-preto has-checked:bg-preto has-checked:text-papel has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-preto"
          >
            <input type="radio" name={nome} value={o.valor} checked={valor === o.valor} onChange={() => aoMudar(o.valor)} className="sr-only" />
            {o.rotulo}
          </label>
        ))}
      </div>
      {erro && (
        <p id={`${nome}-erro`} className="text-[14px] font-semibold text-erro">
          {erro}
        </p>
      )}
    </fieldset>
  )
}

/** Sim ou não, em linha inteira clicável. */
export function Marcador({ id, rotulo, ajuda, marcado, aoMudar }: { id: string; rotulo: string; ajuda?: string; marcado: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-botao py-2.5">
      <input id={id} type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} className="mt-0.5 size-6 shrink-0 cursor-pointer accent-preto" />
      <span className="flex flex-col">
        <span className="font-bold">{rotulo}</span>
        {ajuda && <span className="text-[14px] text-tinta-2">{ajuda}</span>}
      </span>
    </label>
  )
}
