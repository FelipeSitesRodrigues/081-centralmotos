import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { STATUS, type Status } from '@/lib/rotulos'

/*
 * Peças de interface do painel. Sem estado próprio: servem em página do
 * servidor e em componente do navegador.
 */

const VARIANTES = {
  principal: 'bg-vermelho text-papel hover:bg-vermelho-escuro active:bg-vermelho-escuro',
  escuro: 'bg-preto text-papel hover:bg-grafite',
  secundario: 'bg-papel text-tinta border border-linha-forte hover:border-tinta',
  perigo: 'bg-papel text-erro border border-erro/60 hover:border-erro hover:bg-erro-fundo',
  fantasma: 'text-tinta hover:bg-tinta/5',
} as const

type Variante = keyof typeof VARIANTES

const base =
  'inline-flex items-center justify-center gap-2 rounded-botao px-4 font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer select-none'

export function classeBotao(variante: Variante = 'secundario', pequeno = false, extra = '') {
  return `${base} ${pequeno ? 'min-h-11 text-[15px]' : 'min-h-12 text-base'} ${VARIANTES[variante]} ${extra}`
}

export function Botao({
  variante = 'secundario',
  pequeno = false,
  className = '',
  ...props
}: ComponentProps<'button'> & { variante?: Variante; pequeno?: boolean }) {
  return <button type="button" className={classeBotao(variante, pequeno, className)} {...props} />
}

export function BotaoLink({
  variante = 'secundario',
  pequeno = false,
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; pequeno?: boolean }) {
  return <Link className={classeBotao(variante, pequeno, className)} {...props} />
}

const CORES_SELO: Record<Status, string> = {
  publicado: 'bg-no-ar text-no-ar-texto',
  rascunho: 'bg-rascunho text-rascunho-texto',
  reservado: 'bg-reservada text-reservada-texto',
  vendido: 'bg-vendida text-vendida-texto',
  arquivado: 'bg-arquivada text-arquivada-texto',
}

/** Situação da moto: cor e texto (nunca só a cor). */
export function SeloStatus({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-selo px-2 py-0.5 text-[13px] font-bold ${CORES_SELO[status]}`}>
      {STATUS[status]}
    </span>
  )
}

/** Mensagem curta: erro (lido na hora pelo leitor de tela) ou aviso de sucesso. */
export function Aviso({ tipo = 'erro', children, id }: { tipo?: 'erro' | 'ok' | 'info'; children: ReactNode; id?: string }) {
  const cores = {
    erro: 'border-erro/40 bg-erro-fundo text-erro',
    ok: 'border-verde/40 bg-ok-fundo text-no-ar-texto',
    info: 'border-linha bg-papel text-tinta-2',
  }[tipo]
  return (
    <div id={id} role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-botao border px-4 py-3 text-[15px] font-semibold ${cores}`}>
      {children}
    </div>
  )
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-cartao border border-linha bg-papel p-4 sm:p-5 ${className}`}>{children}</section>
}

export function TituloSecao({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-lg font-extrabold tracking-tight">
      {children}
    </h2>
  )
}

/** Caixa de campo: rótulo em cima, ajuda embaixo, erro em vermelho ligado ao campo. */
export function Campo({
  id,
  rotulo,
  ajuda,
  erro,
  children,
  opcional = false,
}: {
  id: string
  rotulo: string
  ajuda?: ReactNode
  erro?: string
  children: ReactNode
  opcional?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {rotulo}
        {opcional && <span className="ml-1.5 font-semibold text-tinta-2">(opcional)</span>}
      </label>
      {children}
      {ajuda && !erro && (
        <p id={`${id}-ajuda`} className="text-[14px] text-tinta-2">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="text-[14px] font-semibold text-erro">
          {erro}
        </p>
      )}
    </div>
  )
}

export const classeEntrada =
  'min-h-12 w-full rounded-botao border border-linha-forte bg-papel px-3.5 text-base text-tinta placeholder:text-tinta-2/70 aria-[invalid=true]:border-erro aria-[invalid=true]:bg-erro-fundo/40 disabled:bg-gelo disabled:text-tinta-2'
