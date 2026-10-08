'use client'

import { House, Motorcycle, Plus, SignOut, UserCircle } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { sair } from '@/lib/acoes/acesso'
import { novaMoto } from '@/lib/acoes/motos'
import { Marca } from './Marca'

const ITENS = [
  { href: '/', rotulo: 'Início', Icone: House },
  { href: '/estoque', rotulo: 'Estoque', Icone: Motorcycle },
  { href: '/conta', rotulo: 'Conta', Icone: UserCircle },
] as const

const ativo = (caminho: string, href: string) => (href === '/' ? caminho === '/' : caminho === href || caminho.startsWith(`${href}/`))

function BotaoNovaMoto({ compacto = false }: { compacto?: boolean }) {
  const { pending } = useFormStatus()
  if (compacto) {
    return (
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[12px] font-bold text-papel disabled:opacity-60"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-vermelho">
          <Plus size={22} weight="bold" aria-hidden />
        </span>
        {pending ? 'Criando...' : 'Nova moto'}
      </button>
    )
  }
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-2 rounded-botao bg-vermelho px-4 font-bold text-papel hover:bg-vermelho-escuro disabled:opacity-60"
    >
      <Plus size={20} weight="bold" aria-hidden />
      {pending ? 'Criando...' : 'Nova moto'}
    </button>
  )
}

export function Navegacao({ nome }: { nome: string }) {
  const caminho = usePathname()

  return (
    <>
      {/* Topo: marca, atalhos no computador, quem está logado */}
      <header className="no-escuro sticky top-0 z-30 bg-preto text-papel">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="rounded-botao" aria-label="Painel Central Motos, início">
            <Marca pequeno />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {ITENS.slice(0, 2).map(({ href, rotulo }) => (
              <Link
                key={href}
                href={href}
                aria-current={ativo(caminho, href) ? 'page' : undefined}
                className="min-h-11 rounded-botao px-3 py-2.5 font-bold text-papel/75 hover:text-papel aria-[current=page]:bg-papel/12 aria-[current=page]:text-papel"
              >
                {rotulo}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <form action={novaMoto} className="hidden md:block">
              <BotaoNovaMoto />
            </form>
            <Link
              href="/conta"
              className="hidden min-h-11 items-center gap-2 rounded-botao px-3 font-semibold text-papel/80 hover:text-papel md:inline-flex"
            >
              <UserCircle size={22} aria-hidden />
              <span className="max-w-40 truncate">{nome}</span>
            </Link>
            <form action={sair}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-botao px-3 font-semibold text-papel/80 hover:text-papel"
              >
                <SignOut size={20} aria-hidden />
                <span className="sr-only md:not-sr-only">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Rodapé fixo no celular: o polegar alcança tudo */}
      <nav
        aria-label="Principal"
        className="no-escuro fixed inset-x-0 bottom-0 z-30 border-t border-papel/10 bg-preto pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ITENS.slice(0, 2).map(({ href, rotulo, Icone }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo(caminho, href) ? 'page' : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-bold text-papel/65 aria-[current=page]:text-papel"
              >
                <Icone size={24} weight={ativo(caminho, href) ? 'fill' : 'regular'} aria-hidden />
                {rotulo}
              </Link>
            </li>
          ))}
          <li>
            <form action={novaMoto}>
              <BotaoNovaMoto compacto />
            </form>
          </li>
          <li>
            <Link
              href="/conta"
              aria-current={ativo(caminho, '/conta') ? 'page' : undefined}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-bold text-papel/65 aria-[current=page]:text-papel"
            >
              <UserCircle size={24} weight={ativo(caminho, '/conta') ? 'fill' : 'regular'} aria-hidden />
              Conta
            </Link>
          </li>
        </ul>
      </nav>
    </>
  )
}
