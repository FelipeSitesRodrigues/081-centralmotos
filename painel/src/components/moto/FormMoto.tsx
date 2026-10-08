'use client'

import { codigoMoto, nomeMoto, reais } from '@central/vitrine/formato'
import { parcelaExibida } from '@central/vitrine/parcela'
import { ArrowLeft, ArrowSquareOut, CheckCircle, Circle } from '@phosphor-icons/react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { excluirMoto, mudarStatus, salvarMoto } from '@/lib/acoes/motos'
import type { Catalogo, Financiamento, LinhaPainel } from '@/lib/dados/motos'
import { anoMaximoFabricacao, errosPorCampo, esquemaMoto } from '@/lib/esquemas/moto'
import { escreverInteiro, escreverReais, lerInteiro, lerReais } from '@/lib/numeros'
import { CAMBIOS, CATEGORIAS, COMBUSTIVEIS, CONDICOES, CORES, FREIOS, PARTIDAS, PENDENCIAS, type Status } from '@/lib/rotulos'
import { Aviso, Cartao, SeloStatus, TituloSecao } from '@/components/ui'
import { BarraAcoes } from './BarraAcoes'
import { type FotoTela, GerenciadorFotos } from './fotos/GerenciadorFotos'
import { CampoAreaTexto, CampoSelect, CampoTexto, Marcador, Opcoes, opcoesDe } from './campos'
import { CAMPOS_DA_TELA, dadosDe, formularioDe, type Formulario } from './formulario'
import { SeletorModelo, type MarcaCatalogo, type ModeloCatalogo } from './SeletorModelo'

type Mensagem = { tipo: 'ok' | 'erro' | 'info'; texto: string } | null

const MENSAGENS_STATUS: Partial<Record<Status, string>> = {
  publicado: 'Publicada! Em 1 a 3 minutos ela aparece no site.',
  reservado: 'Reservada. No site ela aparece com o selo RESERVADA.',
  vendido: 'Marcada como vendida. Ela sai das listas do site.',
  rascunho: 'Fora do ar. Ela está em Rascunhos.',
  arquivado: 'Arquivada.',
}

export function FormMoto({
  moto,
  fotos,
  catalogo,
  financiamento,
  siteUrl,
}: {
  moto: LinhaPainel
  fotos: FotoTela[]
  catalogo: Catalogo
  financiamento: Financiamento
  siteUrl: string | null
}) {
  const id = moto.id as string
  const inicial = useMemo(() => formularioDe(moto), [moto])

  const [form, setForm] = useState<Formulario>(inicial)
  const [salvo, setSalvo] = useState<Formulario>(inicial)
  const [editadoEm, setEditadoEm] = useState(moto.editado_em as string)
  const [status, setStatus] = useState<Status>(moto.status as Status)
  const [slug, setSlug] = useState(moto.slug)
  const [jaFoiPublicada, setJaFoiPublicada] = useState(Boolean(moto.publicado_em))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [resumoErro, setResumoErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [marcas, setMarcas] = useState<MarcaCatalogo[]>(catalogo.marcas)
  const [modelos, setModelos] = useState<ModeloCatalogo[]>(catalogo.modelos)
  const [rascunhoLocal, setRascunhoLocal] = useState<Formulario | null>(null)
  const [totalFotos, setTotalFotos] = useState(fotos.length)
  const [enviandoFotos, setEnviandoFotos] = useState(false)
  const [ocupado, iniciar] = useTransition()
  const resumo = useRef<HTMLDivElement>(null)

  const sujo = JSON.stringify(form) !== JSON.stringify(salvo)
  const chaveLocal = `central:moto:${id}`

  // ---- Rascunho no aparelho: sessão que venceu no meio não perde o que foi digitado
  // Só ao abrir a moto: o refresh do envio de foto troca o `inicial` e acusaria o que está sendo digitado
  const inicialAtual = useRef(inicial)
  inicialAtual.current = inicial
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(chaveLocal)
      if (!guardado) return
      const { form: antigo } = JSON.parse(guardado) as { form: Formulario }
      if (JSON.stringify(antigo) !== JSON.stringify(inicialAtual.current)) setRascunhoLocal(antigo)
      else localStorage.removeItem(chaveLocal)
    } catch {}
  }, [chaveLocal])

  useEffect(() => {
    if (!sujo) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(chaveLocal, JSON.stringify({ form, em: Date.now() }))
      } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [form, sujo, chaveLocal])

  useEffect(() => {
    if (!sujo) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sujo])

  const mudar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setMensagem(null)
  }

  // ---- Parcela ao vivo: a mesma conta do banco
  const precoCentavos = lerReais(form.preco)
  const parcelaManual = form.usar_parcela_manual ? lerInteiro(form.parcela_manual) : null
  const parcela = parcelaExibida(precoCentavos, parcelaManual, financiamento.coeficiente, financiamento.arredondar)
  const parcelaCalculada = parcelaExibida(precoCentavos, null, financiamento.coeficiente, financiamento.arredondar)

  // ---- O que falta pra publicar (o banco confere de novo)
  const pendencias = [
    totalFotos === 0 && 'capa',
    !form.modelo_id && 'modelo',
    (!form.ano_fabricacao || !form.ano_modelo) && 'ano',
    !form.condicao && 'condicao',
    form.condicao === 'seminova' && (lerInteiro(form.km) ?? 0) === 0 && 'km',
    !form.cor && 'cor',
    !form.categoria && 'categoria',
    precoCentavos === null && 'preco',
  ].filter(Boolean) as (keyof typeof PENDENCIAS)[]

  // ---- Anos: fabricação até o ano que vem; modelo igual ou um a mais
  const anoMax = anoMaximoFabricacao()
  const anosFabricacao = Array.from({ length: anoMax - 1980 + 1 }, (_, i) => String(anoMax - i)).map((a) => ({ valor: a, rotulo: a }))
  const anosModelo = form.ano_fabricacao
    ? [Number(form.ano_fabricacao) + 1, Number(form.ano_fabricacao)].map((a) => ({ valor: String(a), rotulo: String(a) }))
    : anosFabricacao
  const anosIpva = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + 1 - i)).map((a) => ({ valor: a, rotulo: a }))

  function escolherModelo(modelo: ModeloCatalogo | null) {
    setForm((f) => ({
      ...f,
      modelo_id: modelo ? String(modelo.id) : '',
      // Tipo e cilindrada vêm do modelo; o lojista ajusta se precisar
      categoria: modelo ? modelo.categoria : f.categoria,
      cilindrada: modelo?.cilindrada ? String(modelo.cilindrada) : modelo ? '' : f.cilindrada,
      combustivel: modelo?.categoria === 'eletrica' ? 'eletrica' : f.combustivel === 'eletrica' ? 'gasolina' : f.combustivel,
    }))
    setMensagem(null)
  }

  // ---- Salvar
  function validar() {
    const { dados, ilegiveis } = dadosDe(form)
    const validado = esquemaMoto.safeParse(dados)
    const campos = { ...(validado.success ? {} : errosPorCampo(validado.error)), ...ilegiveis }
    return { dados, campos, ok: Object.keys(campos).length === 0 }
  }

  function mostrarErros(campos: Record<string, string>, texto = 'Confira os campos marcados.') {
    setErros(campos)
    setResumoErro(texto)
    setMensagem(null)
    requestAnimationFrame(() => resumo.current?.focus())
  }

  async function gravar(): Promise<boolean> {
    const { dados, campos, ok } = validar()
    if (!ok) {
      mostrarErros(campos)
      return false
    }
    const r = await salvarMoto(id, dados, editadoEm)
    if (!r.ok) {
      mostrarErros(r.campos ?? {}, r.erro)
      return false
    }
    // O que foi gravado vira a referência; números voltam formatados
    const gravado: Formulario = {
      ...form,
      km: escreverInteiro(dados.km || null),
      preco: escreverReais(dados.preco.preco_centavos),
      custo: escreverReais(dados.preco.custo_centavos),
    }
    setForm(gravado)
    setSalvo(gravado)
    setEditadoEm(r.editadoEm)
    setErros({})
    setResumoErro(null)
    try {
      localStorage.removeItem(chaveLocal)
    } catch {}
    return true
  }

  const salvar = () =>
    iniciar(async () => {
      if (await gravar()) {
        setMensagem({
          tipo: 'ok',
          texto: status === 'publicado' || status === 'reservado' ? 'Salvo. Em 1 a 3 minutos o site mostra a mudança.' : 'Rascunho salvo.',
        })
      }
    })

  const mudarSituacao = (para: Status | 'excluir') =>
    iniciar(async () => {
      if (para === 'excluir') {
        const r = await excluirMoto(id)
        // Deu certo: o servidor já mandou pra lista
        if (r && !r.ok) setMensagem({ tipo: 'erro', texto: r.erro })
        return
      }
      if (sujo && !(await gravar())) return
      const r = await mudarStatus(id, para)
      if (!r.ok) {
        setResumoErro(r.erro)
        requestAnimationFrame(() => resumo.current?.focus())
        return
      }
      setStatus(r.status)
      setSlug(r.slug)
      setEditadoEm(r.editadoEm)
      if (r.status === 'publicado' || r.status === 'reservado') setJaFoiPublicada(true)
      if (r.status !== 'publicado' && r.status !== 'reservado') {
        setForm((f) => ({ ...f, destaque: false }))
        setSalvo((f) => ({ ...f, destaque: false }))
      }
      setResumoErro(null)
      setMensagem({ tipo: 'ok', texto: MENSAGENS_STATUS[r.status] ?? 'Situação atualizada.' })
    })

  const nome = nomeMoto({
    marca: marcas.find((m) => String(m.id) === form.marca_id)?.nome,
    modelo: modelos.find((m) => String(m.id) === form.modelo_id)?.nome,
    versao: form.versao.trim(),
    ano_modelo: form.ano_modelo ? Number(form.ano_modelo) : null,
  })
  const noAr = status === 'publicado' || status === 'reservado'
  const linkSite = siteUrl && slug && (noAr || status === 'vendido') ? `${siteUrl}/estoque/${slug}` : null

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3">
        <Link href="/estoque" className="inline-flex min-h-11 w-fit items-center gap-2 font-bold text-tinta-2 hover:text-tinta">
          <ArrowLeft size={20} weight="bold" aria-hidden /> Estoque
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{nome || 'Moto nova'}</h1>
          <SeloStatus status={status} />
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-tinta-2">
          <span className="font-semibold">{codigoMoto(moto.codigo as number)}</span>
          {linkSite && (
            <a href={linkSite} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-bold text-tinta underline underline-offset-4">
              Ver no site <ArrowSquareOut size={18} aria-hidden />
            </a>
          )}
        </p>
      </div>

      {rascunhoLocal && (
        <div className="flex flex-col gap-3 rounded-cartao border border-reservada-texto/30 bg-reservada p-4 text-reservada-texto">
          <p className="font-bold">Este aparelho guardou alterações que não foram salvas (a sessão pode ter vencido no meio).</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(rascunhoLocal)
                setRascunhoLocal(null)
              }}
              className="min-h-11 rounded-botao bg-preto px-4 font-bold text-papel"
            >
              Recuperar as alterações
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(chaveLocal)
                } catch {}
                setRascunhoLocal(null)
              }}
              className="min-h-11 rounded-botao px-4 font-bold underline underline-offset-4"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Erros (com foco, pra o leitor de tela anunciar) e mensagens */}
      {resumoErro && (
        <div ref={resumo} tabIndex={-1} role="alert" className="rounded-cartao border border-erro/40 bg-erro-fundo p-4 text-erro outline-none">
          <p className="font-extrabold">{resumoErro}</p>
          {Object.keys(erros).length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {Object.entries(erros).map(([chave, texto]) => {
                const campo = CAMPOS_DA_TELA[chave]
                return (
                  <li key={chave}>
                    {campo ? (
                      <a href={`#${campo.id}`} className="font-semibold underline underline-offset-4">
                        {campo.rotulo}: {texto}
                      </a>
                    ) : (
                      texto
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
      <div aria-live="polite">{mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}</div>

      {/* O que falta pra publicar */}
      {status === 'rascunho' && (
        <Cartao>
          <TituloSecao>{pendencias.length ? 'Pra publicar, falta' : 'Pronta pra publicar'}</TituloSecao>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(PENDENCIAS) as (keyof typeof PENDENCIAS)[]).map((chave) => {
              const falta = pendencias.includes(chave)
              if (chave === 'km' && !falta) return null
              return (
                <li key={chave} className={`flex items-center gap-2 ${falta ? 'font-bold' : 'text-tinta-2'}`}>
                  {falta ? (
                    <Circle size={20} weight="bold" className="shrink-0 text-erro" aria-hidden />
                  ) : (
                    <CheckCircle size={20} weight="fill" className="shrink-0 text-verde" aria-hidden />
                  )}
                  <span>
                    <span className="sr-only">{falta ? 'Falta: ' : 'Ok: '}</span>
                    {PENDENCIAS[chave].charAt(0).toUpperCase() + PENDENCIAS[chave].slice(1)}
                  </span>
                </li>
              )
            })}
          </ul>
        </Cartao>
      )}
      {noAr && (
        <p className="rounded-botao bg-no-ar px-3.5 py-2.5 text-[15px] font-semibold text-no-ar-texto">
          Esta moto está no site. O que você salvar aqui entra no site em 1 a 3 minutos.
        </p>
      )}

      <GerenciadorFotos veiculo={id} fotosIniciais={fotos} aoMudarTotal={setTotalFotos} aoMudarEnvio={setEnviandoFotos} />

      <Cartao>
        <TituloSecao>A moto</TituloSecao>
        <div className="mt-4 flex flex-col gap-5">
          <SeletorModelo
            marcas={marcas}
            modelos={modelos}
            marcaId={form.marca_id}
            modeloId={form.modelo_id}
            erro={erros.modelo_id}
            aoEscolherMarca={(v) => {
              setForm((f) => ({ ...f, marca_id: v, modelo_id: '' }))
              setMensagem(null)
            }}
            aoEscolherModelo={escolherModelo}
            aoCriarMarca={(marca) => {
              setMarcas((lista) => [...lista, marca].sort((a, b) => a.nome.localeCompare(b.nome)))
              setForm((f) => ({ ...f, marca_id: String(marca.id), modelo_id: '' }))
            }}
            aoCriarModelo={(modelo) => {
              setModelos((lista) => [...lista, modelo])
              escolherModelo(modelo)
            }}
          />

          <CampoTexto
            id="versao"
            rotulo="Versão"
            valor={form.versao}
            aoMudar={(v) => mudar('versao', v)}
            erro={erros.versao}
            ajuda="Como aparece no documento ou no anúncio: ESDD, CBS, ABS, Start..."
            maxLength={60}
            autoComplete="off"
            opcional
          />

          <div className="grid grid-cols-2 gap-4">
            <CampoSelect
              id="ano-fabricacao"
              rotulo="Ano de fabricação"
              valor={form.ano_fabricacao}
              opcoes={anosFabricacao}
              erro={erros.ano_fabricacao}
              aoMudar={(v) =>
                setForm((f) => ({
                  ...f,
                  ano_fabricacao: v,
                  // Ano do modelo: o mesmo ou um a mais; fora disso, sugere o mesmo
                  ano_modelo: !v || f.ano_modelo === v || f.ano_modelo === String(Number(v) + 1) ? f.ano_modelo || v : v,
                }))
              }
            />
            <CampoSelect
              id="ano-modelo"
              rotulo="Ano do modelo"
              valor={form.ano_modelo}
              opcoes={anosModelo}
              erro={erros.ano_modelo}
              aoMudar={(v) => mudar('ano_modelo', v)}
            />
          </div>

          <Opcoes
            nome="condicao"
            rotulo="0 km ou seminova"
            valor={form.condicao}
            opcoes={opcoesDe(CONDICOES)}
            erro={erros.condicao}
            aoMudar={(v) => mudar('condicao', v as Formulario['condicao'])}
          />

          <div className="grid grid-cols-2 gap-4">
            <CampoTexto
              id="km"
              rotulo="Quilometragem"
              valor={form.km}
              aoMudar={(v) => mudar('km', v.replace(/[^\d.]/g, '').slice(0, 9))}
              aoSair={() => mudar('km', escreverInteiro(lerInteiro(form.km)))}
              erro={erros.km}
              inputMode="numeric"
              sufixo="km"
              autoComplete="off"
            />
            <CampoSelect id="cor" rotulo="Cor" valor={form.cor} opcoes={opcoesDe(CORES)} erro={erros.cor} aoMudar={(v) => mudar('cor', v)} />
          </div>
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Ficha técnica</TituloSecao>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <CampoSelect
            id="categoria"
            rotulo="Tipo"
            valor={form.categoria}
            opcoes={opcoesDe(CATEGORIAS)}
            erro={erros.categoria}
            aoMudar={(v) => mudar('categoria', v)}
          />
          <CampoTexto
            id="cilindrada"
            rotulo="Cilindrada"
            valor={form.cilindrada}
            aoMudar={(v) => mudar('cilindrada', v.replace(/\D/g, '').slice(0, 4))}
            erro={erros.cilindrada}
            inputMode="numeric"
            sufixo="cc"
            opcional
          />
          <CampoSelect id="partida" rotulo="Partida" valor={form.partida} opcoes={opcoesDe(PARTIDAS)} erro={erros.partida} aoMudar={(v) => mudar('partida', v)} opcional />
          <CampoSelect id="freio" rotulo="Freio" valor={form.freio} opcoes={opcoesDe(FREIOS)} erro={erros.freio} aoMudar={(v) => mudar('freio', v)} opcional />
          <CampoSelect
            id="cambio"
            rotulo="Câmbio"
            valor={form.cambio}
            opcoes={opcoesDe(CAMBIOS)}
            vazio="Manual"
            aoMudar={(v) => mudar('cambio', v || 'manual')}
          />
          <CampoSelect
            id="combustivel"
            rotulo="Combustível"
            valor={form.combustivel}
            opcoes={opcoesDe(COMBUSTIVEIS)}
            vazio="Gasolina"
            aoMudar={(v) => mudar('combustivel', v || 'gasolina')}
          />
          <CampoSelect
            id="final-placa"
            rotulo="Final da placa"
            valor={form.final_placa}
            opcoes={Array.from({ length: 10 }, (_, i) => ({ valor: String(i), rotulo: String(i) }))}
            vazio="Não informar"
            erro={erros.final_placa}
            ajuda="Só o último número (calendário do licenciamento)."
            aoMudar={(v) => mudar('final_placa', v)}
            opcional
          />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Documentos e diferenciais</TituloSecao>
        <div className="mt-4 flex flex-col gap-2">
          <div className="max-w-xs">
            <CampoSelect
              id="ipva"
              rotulo="IPVA pago até"
              valor={form.ipva_pago_ate}
              opcoes={anosIpva}
              vazio="Não informar"
              erro={erros.ipva_pago_ate}
              aoMudar={(v) => mudar('ipva_pago_ate', v)}
              opcional
            />
          </div>
          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <Marcador id="unico-dono" rotulo="Único dono" marcado={form.unico_dono} aoMudar={(v) => mudar('unico_dono', v)} />
            <Marcador id="manual-chave" rotulo="Manual e chave reserva" marcado={form.manual_chave} aoMudar={(v) => mudar('manual_chave', v)} />
            <Marcador id="revisada" rotulo="Revisada" marcado={form.revisada} aoMudar={(v) => mudar('revisada', v)} />
            <Marcador
              id="so-transferir"
              rotulo="Documento em dia, só transferir"
              marcado={form.so_transferir}
              aoMudar={(v) => mudar('so_transferir', v)}
            />
            <Marcador
              id="aceita-troca"
              rotulo="Aceita troca"
              ajuda="A moto usada do cliente entra como entrada."
              marcado={form.aceita_troca}
              aoMudar={(v) => mudar('aceita_troca', v)}
            />
          </div>
        </div>
      </Cartao>

      <Cartao className="border-preto/25">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <TituloSecao>Preço e parcela</TituloSecao>
          <span className="rounded-selo bg-preto px-2 py-0.5 text-[13px] font-bold text-papel">Só o painel vê o preço</span>
        </div>
        <div className="mt-4 flex flex-col gap-5">
          <CampoTexto
            id="preco"
            rotulo="Preço à vista"
            valor={form.preco}
            aoMudar={(v) => mudar('preco', v.replace(/[^\d.,]/g, '').slice(0, 14))}
            aoSair={() => {
              const c = lerReais(form.preco)
              if (c !== null) mudar('preco', escreverReais(c))
            }}
            erro={erros['preco.preco_centavos']}
            ajuda="O site nunca mostra este valor, só a parcela."
            inputMode="decimal"
            prefixo="R$"
            autoComplete="off"
          />

          <div className="rounded-cartao bg-preto p-4 text-papel">
            <p className="text-[14px] font-bold text-papel/70">O site mostra</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">
              {parcela ? (
                <>
                  {financiamento.prazo}x de <span className="text-vermelho">{reais(parcela)}</span>
                </>
              ) : (
                <span className="text-papel/60">Digite o preço</span>
              )}
            </p>
            <p className="mt-1 text-[13px] text-papel/70">
              {financiamento.prazo}x sem entrada, simulação sujeita à análise de crédito.
              {financiamento.coeficiente === null && ' Coeficiente da parcela não configurado.'}
            </p>
          </div>

          <Marcador
            id="usar-parcela-manual"
            rotulo="Usar outra parcela"
            ajuda={
              parcelaCalculada
                ? `Quando o banco cotar diferente da conta automática (${financiamento.prazo}x de ${reais(parcelaCalculada)}).`
                : 'Quando o banco cotar diferente da conta automática.'
            }
            marcado={form.usar_parcela_manual}
            aoMudar={(v) => mudar('usar_parcela_manual', v)}
          />
          {form.usar_parcela_manual && (
            <div className="max-w-xs">
              <CampoTexto
                id="parcela-manual"
                rotulo={`Parcela em ${financiamento.prazo}x`}
                valor={form.parcela_manual}
                aoMudar={(v) => mudar('parcela_manual', v.replace(/\D/g, '').slice(0, 5))}
                erro={erros['preco.parcela_manual']}
                inputMode="numeric"
                prefixo="R$"
                autoComplete="off"
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoTexto
              id="custo"
              rotulo="Quanto a loja pagou"
              valor={form.custo}
              aoMudar={(v) => mudar('custo', v.replace(/[^\d.,]/g, '').slice(0, 14))}
              aoSair={() => {
                const c = lerReais(form.custo)
                if (c !== null) mudar('custo', escreverReais(c))
              }}
              erro={erros['preco.custo_centavos']}
              inputMode="decimal"
              prefixo="R$"
              autoComplete="off"
              opcional
            />
          </div>
          <CampoAreaTexto
            id="observacao"
            rotulo="Observação interna"
            valor={form.observacao}
            aoMudar={(v) => mudar('observacao', v)}
            maximo={1000}
            linhas={3}
            erro={erros['preco.observacao']}
            ajuda="Só a equipe vê. Ex.: pneu traseiro trocado, cliente que deixou na troca."
            opcional
          />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Descrição no site</TituloSecao>
        <div className="mt-4">
          <CampoAreaTexto
            id="descricao"
            rotulo="Texto da página da moto"
            valor={form.descricao}
            aoMudar={(v) => mudar('descricao', v)}
            maximo={2000}
            erro={erros.descricao}
            ajuda="Conte o estado da moto, o que foi revisado e o que ela tem de diferente. Sem preço aqui."
            opcional
          />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Destaque</TituloSecao>
        <div className="mt-2">
          {noAr ? (
            <Marcador
              id="destaque"
              rotulo="Mostrar entre as primeiras na página inicial do site"
              ajuda={`Até ${financiamento.limiteDestaques} motos em destaque ao mesmo tempo.`}
              marcado={form.destaque}
              aoMudar={(v) => mudar('destaque', v)}
            />
          ) : (
            <p className="text-tinta-2">O destaque vale pra moto no ar. Publique antes.</p>
          )}
        </div>
      </Cartao>

      <BarraAcoes
        status={status}
        jaFoiPublicada={jaFoiPublicada}
        sujo={sujo}
        ocupado={ocupado || enviandoFotos}
        aoSalvar={salvar}
        aoPublicar={() => mudarSituacao('publicado')}
        aoMudar={mudarSituacao}
      />
    </div>
  )
}
