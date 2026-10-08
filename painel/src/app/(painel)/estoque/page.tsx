import { codigoMoto, km, nomeMoto, reais } from '@central/vitrine/formato'
import { Camera, MagnifyingGlass } from '@phosphor-icons/react/ssr'
import type { Metadata } from 'next'
import Link from 'next/link'
import { EstrelaDestaque } from '@/components/estoque/EstrelaDestaque'
import { Aviso, classeBotao, classeEntrada, SeloStatus } from '@/components/ui'
import { exigirAdmin } from '@/lib/acesso'
import { novaMoto } from '@/lib/acoes/motos'
import { type Capa, contarPorStatus, listarMotos } from '@/lib/dados/motos'
import { urlFotoMoto } from '@/lib/fotos'
import { STATUS, type Status } from '@/lib/rotulos'

export const metadata: Metadata = { title: 'Estoque' }

const ABAS: { status: Status; rotulo: string }[] = [
  { status: 'publicado', rotulo: 'No ar' },
  { status: 'rascunho', rotulo: 'Rascunhos' },
  { status: 'reservado', rotulo: 'Reservadas' },
  { status: 'vendido', rotulo: 'Vendidas' },
  { status: 'arquivado', rotulo: 'Arquivadas' },
]

const VAZIO: Record<Status, string> = {
  publicado: 'Nenhuma moto no ar ainda. Cadastre uma moto, ponha as fotos e o preço, e publique.',
  rascunho: 'Nenhum rascunho. Moto nova começa aqui e só aparece no site quando você publica.',
  reservado: 'Nenhuma moto reservada.',
  vendido: 'Nenhuma moto vendida ainda.',
  arquivado: 'Nada arquivado.',
}

const AVISOS: Record<string, { tipo: 'ok' | 'erro'; texto: string }> = {
  excluida: { tipo: 'ok', texto: 'Moto excluída de vez, com as fotos.' },
  nova: { tipo: 'erro', texto: 'Não foi possível criar a moto agora. Tente de novo em instantes.' },
}

type Busca = { status?: string; busca?: string; ok?: string; erro?: string }

export default async function Estoque({ searchParams }: { searchParams: Promise<Busca> }) {
  const { supabase } = await exigirAdmin()
  const busca = await searchParams
  const contagens = await contarPorStatus(supabase)

  // Sem aba escolhida: "No ar", ou "Rascunhos" enquanto nada foi publicado
  const pedido = busca.status && busca.status in STATUS ? (busca.status as Status) : null
  const status: Status = pedido ?? (contagens.publicado === 0 && contagens.rascunho > 0 ? 'rascunho' : 'publicado')
  const termo = typeof busca.busca === 'string' ? busca.busca.slice(0, 60) : ''
  const motos = await listarMotos(supabase, { status, busca: termo })
  const aviso = AVISOS[busca.ok ?? busca.erro ?? '']

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Estoque</h1>
        <form action={novaMoto}>
          <button type="submit" className={classeBotao('principal', true)}>
            + Nova moto
          </button>
        </form>
      </div>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}

      <nav aria-label="Situação" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2">
          {ABAS.map((aba) => (
            <li key={aba.status}>
              <Link
                href={`/estoque?status=${aba.status}`}
                aria-current={aba.status === status ? 'page' : undefined}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-linha-forte bg-papel px-4 font-bold text-tinta-2 hover:border-tinta aria-[current=page]:border-preto aria-[current=page]:bg-preto aria-[current=page]:text-papel"
              >
                {aba.rotulo}
                <span className="tabular-nums opacity-80">{contagens[aba.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form role="search" className="flex gap-2" action="/estoque">
        <input type="hidden" name="status" value={status} />
        <label htmlFor="busca" className="sr-only">
          Buscar no estoque
        </label>
        <input
          id="busca"
          name="busca"
          type="search"
          defaultValue={termo}
          placeholder="Modelo, ano, cor ou código (CM-0042)"
          enterKeyHint="search"
          className={`${classeEntrada} flex-1`}
        />
        <button type="submit" className={classeBotao('escuro', false, 'px-3.5')} aria-label="Buscar">
          <MagnifyingGlass size={22} weight="bold" aria-hidden />
        </button>
      </form>

      {motos.length === 0 ? (
        <div className="rounded-cartao border border-dashed border-linha-forte bg-papel p-6 text-center text-tinta-2">
          {termo ? `Nenhuma moto com “${termo}” em ${STATUS[status].toLowerCase()}.` : VAZIO[status]}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {motos.map((moto) => {
            const nome = nomeMoto(moto) || 'Moto sem modelo'
            const capa = moto.capa as Capa | null
            const anos = moto.ano_fabricacao && moto.ano_modelo ? `${moto.ano_fabricacao}/${moto.ano_modelo}` : null
            return (
              <li key={moto.id} className="relative flex gap-3 rounded-cartao border border-linha bg-papel p-3 hover:border-tinta">
                <div className="relative h-[72px] w-24 shrink-0 overflow-hidden rounded-botao sm:h-24 sm:w-32" style={{ background: capa?.cor_media ?? '#ebe8e3' }}>
                  {capa && moto.id ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto já reduzida no upload, sem o otimizador da Vercel
                    <img
                      src={urlFotoMoto(moto.id, capa, 480)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                      style={{ objectPosition: `${capa.foco_x}% ${capa.foco_y}%` }}
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center text-tinta-2">
                      <Camera size={28} aria-hidden />
                      <span className="sr-only">Sem foto</span>
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link href={`/estoque/${moto.id}`} className="font-extrabold leading-snug after:absolute after:inset-0 after:content-['']">
                    {nome}
                  </Link>
                  <p className="text-[14px] text-tinta-2">
                    {[anos, moto.km !== null ? km(moto.km) : null, moto.codigo ? codigoMoto(moto.codigo) : null].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    {moto.status && <SeloStatus status={moto.status as Status} />}
                    <span className="text-[15px] font-bold">
                      {moto.parcela_exibida ? `48x ${reais(moto.parcela_exibida)}` : <span className="text-erro">Sem preço</span>}
                    </span>
                    {(moto.total_fotos ?? 0) === 0 && <span className="text-[14px] font-semibold text-erro">Sem foto</span>}
                  </div>
                </div>

                {(moto.status === 'publicado' || moto.status === 'reservado') && moto.id && moto.editado_em && (
                  <div className="relative z-10">
                    <EstrelaDestaque id={moto.id} destaque={Boolean(moto.destaque)} editadoEm={moto.editado_em} nome={nome} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
