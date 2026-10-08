import { Marca } from '@/components/Marca'

/** Telas de entrada: fundo preto da marca, cartão branco no meio. */
export default function LayoutEntrada({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-preto">
      <header className="no-escuro px-4 pt-10 pb-7 text-center sm:pt-16">
        <Marca />
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-12">{children}</main>
    </div>
  )
}
