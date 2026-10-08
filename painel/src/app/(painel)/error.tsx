'use client'

import { useEffect } from 'react'
import { Botao } from '@/components/ui'

export default function ErroDoPainel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded-cartao border border-erro/40 bg-papel p-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Algo deu errado nesta tela</h1>
      <p className="text-tinta-2">Pode ser a internet oscilando. O que já estava salvo continua salvo.</p>
      <Botao variante="escuro" onClick={reset}>
        Tentar de novo
      </Botao>
    </div>
  )
}
