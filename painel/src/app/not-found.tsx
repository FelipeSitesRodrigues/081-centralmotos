import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Página não encontrada</h1>
      <p className="text-tinta-2">Esse endereço não existe no painel.</p>
      <Link href="/" className="min-h-11 rounded-botao bg-preto px-4 py-2.5 font-bold text-papel">
        Ir pro início
      </Link>
    </main>
  )
}
