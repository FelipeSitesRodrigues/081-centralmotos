import type { Metadata } from 'next'
import { sair } from '@/lib/acoes/acesso'
import { classeBotao } from '@/components/ui'

export const metadata: Metadata = { title: 'Sem acesso' }

export default function PaginaSemAcesso() {
  return (
    <div className="flex flex-col gap-5 rounded-cartao bg-papel p-5 sm:p-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Esta conta não tem acesso ao painel</h1>
        <p className="mt-1 text-tinta-2">Se você trabalha na loja, peça a quem cuida do site pra liberar o seu acesso.</p>
      </div>
      <form action={sair}>
        <button type="submit" className={classeBotao('escuro', false, 'w-full')}>
          Sair
        </button>
      </form>
    </div>
  )
}
