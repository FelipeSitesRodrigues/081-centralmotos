import { nomeMoto } from '@central/vitrine/formato'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { FormMoto } from '@/components/moto/FormMoto'
import { exigirAdmin } from '@/lib/acesso'
import { SITE_URL } from '@/lib/ambiente'
import { lerCatalogo, lerFinanciamento, lerMoto } from '@/lib/dados/motos'

type Parametros = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return { title: 'Moto' }
  const { supabase } = await exigirAdmin()
  const dados = await lerMoto(supabase, id)
  return { title: dados ? nomeMoto(dados.moto) || 'Moto nova' : 'Moto' }
}

export default async function PaginaMoto({ params }: Parametros) {
  const { supabase } = await exigirAdmin()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const [dados, catalogo, financiamento] = await Promise.all([lerMoto(supabase, id), lerCatalogo(supabase), lerFinanciamento(supabase)])
  if (!dados) notFound()

  return (
    <FormMoto
      moto={dados.moto}
      fotos={dados.fotos}
      catalogo={catalogo}
      financiamento={financiamento}
      siteUrl={SITE_URL}
    />
  )
}
