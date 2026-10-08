import { codigoMoto, nomeMoto } from '@central/vitrine/formato'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EstadoSite } from '@/components/EstadoSite'
import { Cartao, TituloSecao } from '@/components/ui'
import { exigirAdmin } from '@/lib/acesso'

export const metadata: Metadata = { title: 'Início' }

type Resumo = {
  no_ar: number
  reservadas: number
  rascunhos: number
  vendidas_mes: number
  atencao: { id: string; codigo: number; marca: string | null; modelo: string | null; ano_modelo: number | null; motivo: string }[]
  cliques_7_dias: { id: string; codigo: number; marca: string | null; modelo: string | null; ano_modelo: number | null; cliques: number }[]
  cliques_total_7_dias: number
  site: { status: string; pendente: boolean; publicado_em: string | null; erro: string | null } | null
}

const MOTIVOS: Record<string, string> = {
  sem_foto: 'Sem foto',
  sem_preco: 'Sem preço',
  parada: 'No ar há mais de 60 dias',
}

export default async function Inicio() {
  const { supabase, usuario } = await exigirAdmin()
  const { data, error } = await supabase.rpc('painel_resumo')
  if (error) throw new Error(`Não consegui ler o resumo: ${error.message}`)
  const r = data as unknown as Resumo

  const numeros = [
    { rotulo: 'No ar', valor: r.no_ar, href: '/estoque?status=publicado' },
    { rotulo: 'Reservadas', valor: r.reservadas, href: '/estoque?status=reservado' },
    { rotulo: 'Rascunhos', valor: r.rascunhos, href: '/estoque?status=rascunho' },
    { rotulo: 'Vendidas no mês', valor: r.vendidas_mes, href: '/estoque?status=vendido' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Olá, {usuario.nome.split(' ')[0]}</h1>
        <EstadoSite site={r.site} />
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link href={n.href} className="flex min-h-24 flex-col justify-between rounded-cartao border border-linha bg-papel p-4 hover:border-tinta">
              <span className="text-[15px] font-bold text-tinta-2">{n.rotulo}</span>
              <span className="text-4xl leading-none font-extrabold tabular-nums">{n.valor}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao>
          <TituloSecao>Precisam de atenção</TituloSecao>
          {r.atencao.length === 0 ? (
            <p className="mt-2 text-tinta-2">Nada pendente. Toda moto no ar tem foto e preço.</p>
          ) : (
            <ul className="mt-3 divide-y divide-linha">
              {r.atencao.map((m) => (
                <li key={m.id}>
                  <Link href={`/estoque/${m.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 hover:underline">
                    <span className="font-semibold">
                      {nomeMoto(m) || 'Moto sem modelo'} <span className="font-normal text-tinta-2">{codigoMoto(m.codigo)}</span>
                    </span>
                    <span className="shrink-0 rounded-selo bg-reservada px-2 py-0.5 text-[13px] font-bold text-reservada-texto">
                      {MOTIVOS[m.motivo] ?? m.motivo}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <Cartao>
          <TituloSecao>Cliques no WhatsApp, últimos 7 dias</TituloSecao>
          <p className="mt-1 text-tinta-2">
            {r.cliques_total_7_dias === 0
              ? 'Nenhum clique ainda. A contagem começa quando o site for pro ar.'
              : `${r.cliques_total_7_dias} ${r.cliques_total_7_dias === 1 ? 'clique' : 'cliques'} no total.`}
          </p>
          {r.cliques_7_dias.length > 0 && (
            <ol className="mt-3 divide-y divide-linha">
              {r.cliques_7_dias.map((m) => (
                <li key={m.id}>
                  <Link href={`/estoque/${m.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 hover:underline">
                    <span className="font-semibold">{nomeMoto(m)}</span>
                    <span className="shrink-0 font-extrabold tabular-nums">{m.cliques}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Cartao>
      </div>
    </div>
  )
}
