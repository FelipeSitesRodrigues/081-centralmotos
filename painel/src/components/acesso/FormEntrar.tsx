'use client'

import { useActionState, useState } from 'react'
import { entrar } from '@/lib/acoes/acesso'
import { Aviso, Campo, classeBotao, classeEntrada } from '@/components/ui'

export function FormEntrar({ para, aviso }: { para: string; aviso?: string }) {
  const [estado, acao, enviando] = useActionState(entrar, undefined)
  const [verSenha, setVerSenha] = useState(false)

  return (
    <form action={acao} className="flex flex-col gap-5 rounded-cartao bg-papel p-5 sm:p-7" noValidate>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Entrar no painel</h1>
        <p className="mt-1 text-tinta-2">Estoque, fotos e publicação do site.</p>
      </div>

      {estado?.erro ? <Aviso>{estado.erro}</Aviso> : aviso ? <Aviso tipo="info">{aviso}</Aviso> : null}

      <input type="hidden" name="para" value={para} />

      <Campo id="email" rotulo="E-mail">
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={estado?.email}
          className={classeEntrada}
        />
      </Campo>

      <Campo id="senha" rotulo="Senha">
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={verSenha ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className={`${classeEntrada} pr-24`}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-pressed={verSenha}
            className="absolute inset-y-1 right-1 min-w-20 rounded-botao px-3 text-[15px] font-bold text-tinta-2 hover:bg-tinta/5"
          >
            {verSenha ? 'Esconder' : 'Mostrar'}
          </button>
        </div>
      </Campo>

      <button type="submit" disabled={enviando} className={classeBotao('principal', false, 'w-full')}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-[14px] text-tinta-2">
        Esqueceu a senha? Peça uma senha nova pra quem cuida do site.
      </p>
    </form>
  )
}
