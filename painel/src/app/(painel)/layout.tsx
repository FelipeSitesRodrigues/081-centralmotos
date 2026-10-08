import { Navegacao } from '@/components/Navegacao'
import { exigirAdmin } from '@/lib/acesso'

/*
 * Moldura do painel. A conferência de acesso daqui é só pra mostrar o nome:
 * layout não roda de novo a cada navegação, então cada página e cada ação
 * chamam exigirAdmin() por conta própria (seção 6.2 do plano).
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { usuario } = await exigirAdmin()

  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-botao bg-papel px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Navegacao nome={usuario.nome} />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pt-8 md:pb-16">
        {children}
      </main>
    </div>
  )
}
