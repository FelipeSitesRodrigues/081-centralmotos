import type { Metadata } from 'next'
import { FormEntrar } from '@/components/acesso/FormEntrar'
import { destinoSeguro } from '@/lib/seguranca/destino'

export const metadata: Metadata = { title: 'Entrar' }

const AVISOS: Record<string, string> = {
  expirou: 'Por segurança, cada aparelho fica conectado por até 7 dias. Entre de novo.',
  saiu: 'Você saiu do painel.',
}

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ para?: string; motivo?: string }> }) {
  const { para, motivo } = await searchParams
  return <FormEntrar para={destinoSeguro(para)} aviso={motivo ? AVISOS[motivo] : undefined} />
}
