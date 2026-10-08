'use client'

import { useActionState, useState } from 'react'
import { definirSenha } from '@/lib/acoes/acesso'
import { TAMANHO_MINIMO_SENHA } from '@/lib/senha'
import { Aviso, Campo, classeBotao, classeEntrada } from '@/components/ui'

/** Troca de senha pela Minha conta (a primeira senha vem do scripts/acesso.mjs). */
export function FormSenha({ titulo }: { titulo: string }) {
  const [estado, acao, enviando] = useActionState(definirSenha, undefined)
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const faltam = Math.max(TAMANHO_MINIMO_SENHA - senha.length, 0)

  return (
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">{titulo}</h2>
        <p className="mt-1 text-tinta-2">Use pelo menos {TAMANHO_MINIMO_SENHA} caracteres. Uma frase que só você conhece é mais forte e mais fácil de lembrar.</p>
      </div>

      {estado?.erro && <Aviso>{estado.erro}</Aviso>}

      <Campo
        id="senha"
        rotulo="Senha nova"
        ajuda={faltam > 0 ? `Faltam ${faltam} ${faltam === 1 ? 'caractere' : 'caracteres'}.` : 'Tamanho bom.'}
      >
        <input
          id="senha"
          name="senha"
          type={ver ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={TAMANHO_MINIMO_SENHA}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          aria-describedby="senha-ajuda"
          className={classeEntrada}
        />
      </Campo>

      <Campo id="confirmacao" rotulo="Repita a senha">
        <input id="confirmacao" name="confirmacao" type={ver ? 'text' : 'password'} autoComplete="new-password" required className={classeEntrada} />
      </Campo>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} className="size-5 accent-preto" />
        Mostrar as senhas
      </label>

      <button type="submit" disabled={enviando} className={classeBotao('escuro', false, 'w-full sm:w-auto')}>
        {enviando ? 'Salvando...' : 'Salvar a senha nova'}
      </button>
    </form>
  )
}
