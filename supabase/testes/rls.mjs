/**
 * Teste de fora pra dentro, como um visitante qualquer: chave pública (anon)
 * contra a API do Supabase (PostgREST, Storage e GraphQL).
 *
 * Cria motos de teste pelo SQL (uma no ar, um rascunho, uma vendida esta
 * semana, uma vendida há 31 dias e uma arquivada, todas com preço, custo e
 * observação privados), tenta ler e escrever de todos os jeitos e apaga tudo
 * no fim, devolvendo a fila de publicação ao estado de antes.
 *
 *   node --env-file=.env.local --env-file=.env.supabase.local supabase/testes/rls.mjs
 *
 * Pronto quando (arquitetura.md, seção 21, etapa 1): o visitante não lê preço
 * por nenhum caminho, não escreve em nada e não lista o Storage.
 */
import { sql } from '../../scripts/supabase-api.mjs'

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const CHAVE = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL_BASE || !CHAVE) {
  console.error('Rode com --env-file=.env.local --env-file=.env.supabase.local')
  process.exit(1)
}

const MARCA = 'TESTE-RLS'
// Preços com dígitos que não aparecem por acaso numa resposta
const PRECOS = {
  publicado: 1987654,
  rascunho: 2876543,
  vendido: 3765432,
  vendido_antigo: 4654321,
  arquivado: 5543219,
}
const SEGREDOS = [
  ...Object.values(PRECOS).flatMap((c) => [String(c), String(c - 300000), (c / 100).toFixed(2)]),
  'observação privada',
]

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

async function criarFixtures() {
  const [{ fixtures }] = await sql(`
    create function pg_temp.fixture(p_status text, p_preco bigint) returns jsonb language plpgsql as $f$
    declare
      v_r jsonb;
      v_id uuid;
      v_modelo integer := (select mo.id from public.modelos mo join public.marcas ma on ma.id = mo.marca_id
                            where ma.slug = 'honda' and mo.slug = 'pop-110i');
    begin
      v_r := public.criar_rascunho();
      v_id := (v_r ->> 'id')::uuid;
      perform public.salvar_veiculo(v_id, jsonb_build_object(
        'modelo_id', v_modelo, 'ano_fabricacao', 2022, 'ano_modelo', 2023, 'condicao', 'seminova',
        'km', 15000, 'cor', 'azul', 'descricao', '${MARCA}',
        'preco', jsonb_build_object('preco_centavos', p_preco, 'custo_centavos', p_preco - 300000,
                                    'observacao', '${MARCA} observação privada')
      ), (v_r ->> 'editado_em')::timestamptz);
      perform public.adicionar_fotos(v_id, jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid(), 'larguras', jsonb_build_array(480, 960), 'formato', 'webp',
        'largura_original', 1200, 'altura_original', 900)));
      if p_status <> 'rascunho' then
        perform public.alterar_status(v_id, 'publicado');
      end if;
      if p_status in ('vendido', 'vendido_antigo') then
        perform public.alterar_status(v_id, 'vendido');
      end if;
      if p_status = 'vendido_antigo' then
        update public.veiculos set vendido_em = now() - interval '31 days' where id = v_id;
      end if;
      if p_status = 'arquivado' then
        perform public.alterar_status(v_id, 'arquivado');
      end if;
      return jsonb_build_object('id', v_id, 'codigo', (select codigo from public.veiculos where id = v_id));
    end
    $f$;
    select jsonb_build_object(
      'publicado', pg_temp.fixture('publicado', ${PRECOS.publicado}),
      'rascunho', pg_temp.fixture('rascunho', ${PRECOS.rascunho}),
      'vendido', pg_temp.fixture('vendido', ${PRECOS.vendido}),
      'vendido_antigo', pg_temp.fixture('vendido_antigo', ${PRECOS.vendido_antigo}),
      'arquivado', pg_temp.fixture('arquivado', ${PRECOS.arquivado})
    ) as fixtures;
  `)
  return fixtures
}

async function apagarFixtures(antes) {
  await sql(`
    create temp table ids_teste as select id::text as id from public.veiculos where descricao = '${MARCA}';
    delete from public.veiculos where descricao = '${MARCA}';
    -- O histórico das motos de teste (inclusive o da exclusão) sai junto
    delete from public.atividades where entidade_id in (select id from ids_teste);
    update public.site_publicacao
       set pendente = ${antes.pendente}, status = '${antes.status}',
           pedido_em = ${antes.pedido_em ? `'${antes.pedido_em}'` : 'null'}
     where id;
  `)
}

// ----------------------------------------------------------------------------
// Visitante
// ----------------------------------------------------------------------------

const cabecalhos = { apikey: CHAVE }
// Chave antiga (JWT) também vai no Authorization; a nova (sb_publishable_) não
if (CHAVE.startsWith('eyJ')) cabecalhos.Authorization = `Bearer ${CHAVE}`

async function visitante(caminho, { metodo = 'GET', corpo, extras = {} } = {}) {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    method: metodo,
    headers: {
      ...cabecalhos,
      ...(corpo !== undefined && !(corpo instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}),
      ...extras,
    },
    body: corpo === undefined ? undefined : corpo instanceof Uint8Array ? corpo : JSON.stringify(corpo),
  })
  const texto = await resposta.text()
  let json = null
  try {
    json = JSON.parse(texto)
  } catch {}
  return { ok: resposta.ok, status: resposta.status, texto, json }
}

const resultados = []
function conferir(nome, ok, detalhe = '') {
  resultados.push({ nome, ok: Boolean(ok), detalhe })
}
const semSegredo = (texto) => !SEGREDOS.some((s) => texto.includes(s))
const recusado = (r) => !r.ok
const vazioOuRecusado = (r) => !r.ok || (Array.isArray(r.json) && r.json.length === 0)

async function testar(f) {
  const ids = Object.values(f).map((m) => m.id)
  const emIds = `in.(${ids.join(',')})`

  // ---- Leitura: preço por nenhum caminho ---------------------------------
  let r = await visitante('/rest/v1/veiculos_precos?select=*')
  conferir('preços: SELECT direto é recusado', recusado(r) && semSegredo(r.texto), `${r.status} ${r.texto.slice(0, 160)}`)

  r = await visitante(`/rest/v1/veiculos_precos?select=preco_centavos&veiculo_id=eq.${f.publicado.id}`)
  conferir('preços: filtro pela moto no ar é recusado', recusado(r) && semSegredo(r.texto), `${r.status}`)

  r = await visitante(`/rest/v1/veiculos?select=id,veiculos_precos(preco_centavos,custo_centavos)&id=${emIds}`)
  conferir('preços: embutir a tabela de preço na consulta da moto não traz preço', semSegredo(r.texto) && (recusado(r) || !r.texto.includes('preco_centavos')), `${r.status} ${r.texto.slice(0, 160)}`)

  r = await visitante(`/rest/v1/veiculos?select=*&id=${emIds}`)
  conferir('motos: select=* é recusado (colunas privadas não estão liberadas)', recusado(r) && semSegredo(r.texto), `${r.status} ${r.texto.slice(0, 160)}`)

  r = await visitante(`/rest/v1/veiculos?select=criado_por&id=${emIds}`)
  conferir('motos: autoria (criado_por) é recusada', recusado(r), `${r.status}`)

  r = await visitante(`/rest/v1/painel_motos?select=*`)
  conferir('painel_motos (com preço) é recusada', recusado(r) && semSegredo(r.texto), `${r.status} ${r.texto.slice(0, 160)}`)

  r = await visitante(`/rest/v1/vitrine_motos?select=*&id=${emIds}`)
  const vitrine = Array.isArray(r.json) ? r.json : []
  const idsVisiveis = new Set(vitrine.map((m) => m.id))
  conferir('vitrine: mostra a moto no ar e a vendida desta semana, e só elas',
    r.ok && idsVisiveis.size === 2 && idsVisiveis.has(f.publicado.id) && idsVisiveis.has(f.vendido.id),
    `${r.status} ${[...idsVisiveis].length} motos`)
  conferir('vitrine: nenhuma coluna de preço, custo, observação ou autoria',
    vitrine.every((m) => !['preco_centavos', 'custo_centavos', 'observacao', 'parcela_manual', 'criado_por', 'atualizado_por'].some((c) => c in m)),
    Object.keys(vitrine[0] ?? {}).join(','))
  conferir('vitrine: nenhum valor privado na resposta', semSegredo(r.texto))
  const noAr = vitrine.find((m) => m.id === f.publicado.id)
  conferir('vitrine: a parcela pública está lá (R$ 19.876,54 × 0,0537 → 48x de R$ 1.070)',
    noAr?.parcela_exibida === 1070 && Array.isArray(noAr?.fotos) && noAr.fotos.length === 1, JSON.stringify(noAr?.parcela_exibida))

  r = await visitante(`/rest/v1/veiculos?select=id,status,parcela_exibida&id=${emIds}`)
  conferir('motos: rascunho, arquivada e vendida há mais de 30 dias não aparecem nem pela tabela',
    r.ok && Array.isArray(r.json) && r.json.length === 2 && r.json.every((m) => [f.publicado.id, f.vendido.id].includes(m.id)),
    `${r.status} ${r.texto.slice(0, 200)}`)

  r = await visitante(`/rest/v1/veiculo_fotos?select=id,veiculo_id&veiculo_id=${emIds}`)
  conferir('fotos: só as das motos que o visitante vê',
    r.ok && Array.isArray(r.json) && r.json.length === 2 && r.json.every((x) => [f.publicado.id, f.vendido.id].includes(x.veiculo_id)),
    `${r.status} ${r.texto.slice(0, 200)}`)

  for (const tabela of ['atividades', 'limites', 'cliques_whatsapp_dia', 'site_publicacao', 'perfis', 'financiamento_coeficientes']) {
    r = await visitante(`/rest/v1/${tabela}?select=*`)
    conferir(`${tabela}: leitura recusada`, vazioOuRecusado(r) && semSegredo(r.texto), `${r.status} ${r.texto.slice(0, 120)}`)
  }

  r = await visitante('/rest/v1/configuracoes?select=prazo_padrao,aviso_site,instagram')
  conferir('configurações: o visitante lê prazo, aviso e Instagram', r.ok && r.json?.[0]?.prazo_padrao === 48, `${r.status} ${r.texto.slice(0, 120)}`)
  r = await visitante('/rest/v1/configuracoes?select=limite_destaques,arredondar_para')
  conferir('configurações: o resto é recusado', recusado(r), `${r.status}`)

  r = await visitante('/rest/v1/lojas?select=nome,cidade,whatsapp')
  conferir('lojas: o visitante lê as duas', r.ok && r.json?.length === 2, `${r.status}`)

  // ---- Funções -----------------------------------------------------------
  const chamadas = {
    salvar_veiculo: { p_id: f.publicado.id, p_dados: { km: 1 }, p_editado_em: new Date().toISOString() },
    alterar_status: { p_veiculo: f.publicado.id, p_status: 'arquivado' },
    criar_rascunho: {},
    adicionar_fotos: { p_veiculo: f.publicado.id, p_fotos: [] },
    reordenar_fotos: { p_veiculo: f.publicado.id, p_ids: [] },
    excluir_fotos: { p_veiculo: f.publicado.id, p_ids: [] },
    reordenar_veiculos: { p_ids: [f.publicado.id] },
    excluir_veiculo: { p_veiculo: f.arquivado.id },
    definir_loja_principal: { p_loja: 1 },
    painel_resumo: {},
    pendencias_publicacao: { p_veiculo: f.rascunho.id },
    editado_em_veiculo: { p_veiculo: f.publicado.id },
    recalcular_parcela: { p_veiculo: f.publicado.id },
    calcular_parcela: { p_preco_centavos: 100, p_coeficiente: 0.05, p_arredondar: 10 },
    consumir_limite: { p_chave: 'x', p_maximo: 1, p_janela_segundos: 1 },
    registrar_clique: { p_codigo: f.publicado.codigo, p_loja: null, p_origem: 'card', p_chave: 'chave-de-teste-rls-0001' },
    registrar_acesso: { p_usuario: null, p_email: 'x@x.com', p_resultado: 'entrou', p_ip: '1.1.1.1', p_agente: 'teste' },
    processar_publicacao: {},
    limpeza_diaria: {},
    eh_admin: {},
    pode_gerenciar: {},
    sem_acento: { p_texto: 'á' },
    slug_de: { p_texto: 'á' },
    transicao_permitida: { p_de: 'rascunho', p_para: 'publicado' },
  }
  const liberadas = []
  for (const [funcao, args] of Object.entries(chamadas)) {
    r = await visitante(`/rest/v1/rpc/${funcao}`, { metodo: 'POST', corpo: args })
    if (r.ok) liberadas.push(`${funcao} (${r.status})`)
  }
  conferir(`funções do painel e do servidor: as ${Object.keys(chamadas).length} recusam o visitante`, liberadas.length === 0, liberadas.join(', '))

  r = await visitante('/rest/v1/rpc/registrar_publicacao', { metodo: 'POST', corpo: { p_segredo: 'x'.repeat(40) } })
  conferir('registrar_publicacao com segredo errado não faz nada', r.ok && r.json === false, `${r.status} ${r.texto}`)

  // ---- Escrita -----------------------------------------------------------
  const escritas = [
    ['veiculos', 'POST', '', { status: 'rascunho' }],
    ['veiculos', 'PATCH', `?id=eq.${f.publicado.id}`, { descricao: 'invadido' }],
    ['veiculos', 'PATCH', `?id=eq.${f.publicado.id}`, { status: 'vendido' }],
    ['veiculos', 'DELETE', `?id=eq.${f.publicado.id}`],
    ['veiculos_precos', 'POST', '', { veiculo_id: f.publicado.id, preco_centavos: 100000 }],
    ['veiculos_precos', 'PATCH', `?veiculo_id=eq.${f.publicado.id}`, { preco_centavos: 100000 }],
    ['veiculos_precos', 'DELETE', `?veiculo_id=eq.${f.publicado.id}`],
    ['veiculo_fotos', 'POST', '', { veiculo_id: f.publicado.id, posicao: 5, larguras: [480], formato: 'webp', largura_original: 800, altura_original: 600 }],
    ['veiculo_fotos', 'DELETE', `?veiculo_id=eq.${f.publicado.id}`],
    ['lojas', 'PATCH', '?id=eq.1', { whatsapp: '5511999999999' }],
    ['lojas', 'POST', '', { nome: 'Loja falsa', cidade: 'X', endereco: 'Rua falsa, 1', whatsapp: '5511999999999' }],
    ['configuracoes', 'PATCH', '?id=eq.true', { aviso_site: 'invadido' }],
    ['financiamento_coeficientes', 'PATCH', '?prazo=eq.48', { coeficiente: 0.02 }],
    ['entregas', 'POST', '', { larguras: [480], formato: 'webp', largura_original: 800, altura_original: 600 }],
    ['marcas', 'POST', '', { nome: 'Falsa', slug: 'falsa' }],
    ['modelos', 'POST', '', { marca_id: 1, nome: 'Falso', slug: 'falso', categoria: 'street' }],
    ['cliques_whatsapp_dia', 'POST', '', { dia: '2026-10-07', origem: 'card', cliques: 999 }],
    ['atividades', 'POST', '', { acao: 'x', entidade: 'x' }],
    ['limites', 'POST', '', { chave: 'x', contagem: 0, janela_inicio: new Date().toISOString() }],
    ['site_publicacao', 'PATCH', '?id=eq.true', { pendente: true }],
    ['perfis', 'POST', '', { id: f.publicado.id, nome: 'Invasor' }],
  ]
  const aceitas = []
  for (const [tabela, metodo, filtro, corpo] of escritas) {
    r = await visitante(`/rest/v1/${tabela}${filtro}`, { metodo, corpo, extras: { Prefer: 'return=representation' } })
    // 2xx com lista vazia ainda é "não escreveu"; qualquer linha devolvida é falha
    if (r.ok && !(Array.isArray(r.json) && r.json.length === 0)) aceitas.push(`${metodo} ${tabela} (${r.status})`)
  }
  conferir(`escrita: as ${escritas.length} tentativas em ${new Set(escritas.map((e) => e[0])).size} tabelas são recusadas`, aceitas.length === 0, aceitas.join(', '))

  const [conferencia] = await sql(`
    select
      (select count(*) from public.veiculos where descricao = '${MARCA}')::int as motos,
      (select status from public.veiculos where id = '${f.publicado.id}') as status_no_ar,
      (select preco_centavos from public.veiculos_precos where veiculo_id = '${f.publicado.id}')::bigint as preco_no_ar,
      (select count(*) from public.veiculo_fotos where veiculo_id = '${f.publicado.id}')::int as fotos_no_ar,
      (select count(*) from public.lojas)::int as lojas,
      (select whatsapp from public.lojas where id = 1) as whatsapp_loja1,
      (select coalesce(aviso_site, '') from public.configuracoes where id) as aviso,
      (select coeficiente from public.financiamento_coeficientes where prazo = 48)::text as coeficiente,
      (select count(*) from public.marcas where slug = 'falsa')::int as marca_falsa
  `)
  conferir('escrita: o banco continua igual depois das tentativas',
    conferencia.motos === 5 && conferencia.status_no_ar === 'publicado' && Number(conferencia.preco_no_ar) === PRECOS.publicado
    && conferencia.fotos_no_ar === 1 && conferencia.lojas === 2 && conferencia.whatsapp_loja1 === '5574999936265'
    && conferencia.aviso === '' && conferencia.coeficiente === '0.053700' && conferencia.marca_falsa === 0,
    JSON.stringify(conferencia))

  // ---- Storage -----------------------------------------------------------
  r = await visitante('/storage/v1/bucket')
  conferir('storage: o visitante não lista os buckets', vazioOuRecusado(r), `${r.status} ${r.texto.slice(0, 120)}`)

  for (const bucket of ['veiculos', 'entregas']) {
    r = await visitante(`/storage/v1/object/list/${bucket}`, { metodo: 'POST', corpo: { prefix: '', limit: 100 } })
    conferir(`storage: o visitante não lista o bucket ${bucket}`, vazioOuRecusado(r), `${r.status} ${r.texto.slice(0, 120)}`)
  }

  // WebP de 1 pixel, válido
  const webp = Uint8Array.from(Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'))
  r = await visitante(`/storage/v1/object/veiculos/${f.publicado.id}/invasor-480.webp`, { metodo: 'POST', corpo: webp, extras: { 'Content-Type': 'image/webp' } })
  conferir('storage: o visitante não sobe arquivo', recusado(r), `${r.status} ${r.texto.slice(0, 120)}`)

  r = await visitante(`/storage/v1/object/upload/sign/veiculos/${f.publicado.id}/invasor-960.webp`, { metodo: 'POST', corpo: {} })
  conferir('storage: o visitante não gera URL assinada de upload', recusado(r), `${r.status} ${r.texto.slice(0, 120)}`)

  r = await visitante('/storage/v1/object/veiculos', { metodo: 'DELETE', corpo: { prefixes: [`${f.publicado.id}/x-480.webp`] } })
  conferir('storage: o visitante não apaga arquivo', vazioOuRecusado(r), `${r.status} ${r.texto.slice(0, 120)}`)

  // ---- GraphQL e documentação da API ------------------------------------
  r = await visitante('/graphql/v1', { metodo: 'POST', corpo: { query: '{ __schema { types { name } } }' } })
  conferir('graphql: não expõe a tabela de preços', !/veiculos_?[Pp]recos/.test(r.texto) && semSegredo(r.texto), `${r.status} ${r.texto.slice(0, 120)}`)

  r = await visitante('/rest/v1/')
  conferir('documentação da API (OpenAPI): não mostra a tabela de preços', !r.texto.includes('veiculos_precos') && !r.texto.includes('painel_motos'), `${r.status}`)
}

// ----------------------------------------------------------------------------

const [antes] = await sql(`select pendente, status, pedido_em from public.site_publicacao where id`)
let fixtures
try {
  fixtures = await criarFixtures()
  await testar(fixtures)
} catch (erro) {
  conferir('o teste rodou até o fim', false, erro.message)
} finally {
  await apagarFixtures(antes)
}

const [sobrou] = await sql(`select count(*)::int as motos from public.veiculos where descricao = '${MARCA}'`)
conferir('limpeza: nenhuma moto de teste ficou no banco', sobrou.motos === 0, JSON.stringify(sobrou))

let falhas = 0
for (const r of resultados) {
  if (!r.ok) falhas++
  console.log(`${r.ok ? 'ok  ' : 'FALHOU'} ${r.nome}${!r.ok && r.detalhe ? `\n       ${r.detalhe}` : ''}`)
}
console.log(`\n${resultados.length - falhas} de ${resultados.length} conferências como visitante${falhas ? `, ${falhas} falharam` : ''}.`)
process.exitCode = falhas ? 1 : 0
