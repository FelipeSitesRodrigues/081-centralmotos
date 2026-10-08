import type { Metadata } from 'next'
import { FormSenha } from '@/components/acesso/FormSenha'
import { Aviso, Cartao, classeBotao, TituloSecao } from '@/components/ui'
import { exigirAdmin } from '@/lib/acesso'
import { sairDeTodos } from '@/lib/acoes/acesso'

export const metadata: Metadata = { title: 'Minha conta' }

const AVISOS: Record<string, string> = {
  senha: 'Senha trocada.',
}

export default async function MinhaConta({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { usuario } = await exigirAdmin()
  const { ok } = await searchParams

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Minha conta</h1>
        <p className="mt-1 text-tinta-2">
          {usuario.nome} · {usuario.email}
        </p>
      </div>

      {ok && AVISOS[ok] && <Aviso tipo="ok">{AVISOS[ok]}</Aviso>}

      <Cartao>
        <FormSenha titulo="Trocar a senha" />
      </Cartao>

      <Cartao>
        <TituloSecao>Aparelhos conectados</TituloSecao>
        <p className="mt-1 text-tinta-2">
          Cada aparelho fica conectado por até 7 dias. Perdeu o celular ou alguém saiu da loja? Desconecte todos; quem precisar entra de novo com e-mail e senha.
        </p>
        <form action={sairDeTodos} className="mt-4">
          <button type="submit" className={classeBotao('perigo')}>
            Sair de todos os aparelhos
          </button>
        </form>
      </Cartao>
    </div>
  )
}
