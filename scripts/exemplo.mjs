/**
 * Dados de exemplo da vitrine (node site/build.mjs --exemplo), pra desenvolver e comparar
 * com o mockup antes do catálogo real entrar pelo painel.
 *
 *   node scripts/exemplo.mjs
 *
 * Só as 3 motos reais que a loja mandou, uma pasta por moto em Recursos Site/Motos (prints
 * do Instagram, com preço e ficha da legenda). Nada de moto inventada pra encher a grade:
 * o Felipe pediu o estoque fiel ao que a loja tem. As fotos são de baixa resolução (prints de celular): servem pra
 * desenvolver, não pro site. O build no domínio de verdade recusa este modo.
 */
import { randomUUID } from 'node:crypto'
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const PRINTS = '../081-Central Motos/Recursos Site/Motos'
const SAIDA = 'site/exemplo'
rmSync(`${SAIDA}/fotos`, { recursive: true, force: true })
mkdirSync(`${SAIDA}/fotos/veiculos`, { recursive: true })

const COEFICIENTE = 0.0537
const parcela = (reais) => Math.ceil((reais * COEFICIENTE) / 10) * 10

/** Foto a partir do print: corta a legenda do Instagram quando tem (topo = fração da altura). */
async function foto(veiculo, pasta, arquivo, { topo = 1, focoX = 50, focoY = 56 } = {}) {
  const id = randomUUID()
  const nome = readdirSync(`${PRINTS}/${pasta}`).find((n) => n.startsWith(`Captura de tela 2026-10-07 ${arquivo}`))
  if (!nome) throw new Error(`Print ${arquivo} não está em ${PRINTS}/${pasta}`)
  const caminho = `${PRINTS}/${pasta}/${nome}`
  const meta = await sharp(caminho).metadata()
  const altura = Math.round(meta.height * topo)
  const base = await sharp(caminho).extract({ left: 0, top: 0, width: meta.width, height: altura }).toBuffer()
  const larguras = [Math.min(meta.width, 480)]
  mkdirSync(`${SAIDA}/fotos/veiculos/${veiculo}`, { recursive: true })
  for (const l of larguras) {
    await sharp(base).resize({ width: l }).webp({ quality: 78 }).toFile(`${SAIDA}/fotos/veiculos/${veiculo}/${id}-${l}.webp`)
  }
  const { dominant } = await sharp(base).stats()
  const hex = (v) => v.toString(16).padStart(2, '0')
  return { id, larguras, formato: 'webp', largura: meta.width, altura, foco_x: focoX, foco_y: focoY, cor_media: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`, og: false }
}

const agora = Date.now()
const dia = 86_400_000
let codigo = 0

async function moto(m, pasta, fotos) {
  const id = randomUUID()
  codigo += 1
  const lista = []
  for (const [arquivo, opcoes] of fotos) lista.push(await foto(id, pasta, arquivo, opcoes))
  const slugBase = `${m.marca_slug}-${m.modelo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${m.versao ? `-${m.versao.toLowerCase()}` : ''}-${m.ano_modelo}`
  return {
    id,
    codigo,
    slug: `${slugBase}-${codigo}`,
    status: m.status ?? 'publicado',
    marca: m.marca,
    marca_slug: m.marca_slug,
    modelo: m.modelo,
    modelo_slug: m.modelo.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    versao: m.versao ?? null,
    ano_fabricacao: m.ano_fabricacao,
    ano_modelo: m.ano_modelo,
    condicao: m.condicao,
    km: m.km,
    cor: m.cor,
    cilindrada: m.cilindrada,
    categoria: m.categoria,
    combustivel: 'gasolina',
    partida: m.partida ?? 'eletrica',
    freio: m.freio ?? null,
    cambio: m.cambio ?? 'manual',
    final_placa: null,
    ipva_pago_ate: m.ipva_pago_ate ?? null,
    unico_dono: m.unico_dono ?? false,
    manual_chave: m.manual_chave ?? false,
    revisada: m.revisada ?? false,
    so_transferir: m.so_transferir ?? false,
    aceita_troca: true,
    descricao: m.descricao ?? null,
    destaque: m.destaque ?? false,
    ordem: 0,
    parcela_exibida: parcela(m.preco),
    busca: `${m.marca} ${m.modelo} ${m.versao ?? ''} ${m.ano_fabricacao} ${m.ano_modelo} ${m.condicao === '0km' ? '0km zero nova' : 'seminova usada'} ${m.cor} ${m.categoria} ${m.cilindrada}cc cm-${String(codigo).padStart(4, '0')} ${codigo}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
    publicado_em: new Date(agora - codigo * dia).toISOString(),
    vendido_em: m.status === 'vendido' ? new Date(agora - 2 * dia).toISOString() : null,
    atualizado_em: new Date(agora - codigo * dia).toISOString(),
    fotos: lista,
  }
}

const POP = [['150104', {}], ['150108', { focoY: 52 }], ['150117', {}], ['150112', { focoY: 40 }], ['150126', { focoY: 50 }]]
const BROS = [['150212', { topo: 0.6, focoY: 58 }], ['150223', { focoY: 55 }], ['150218', { focoY: 45 }], ['150227', { focoY: 50 }]]
const BIZ = [['150250', { focoY: 55 }], ['150243', { topo: 0.6, focoY: 58 }], ['150259', { focoY: 45 }]]

const motos = [
  await moto(
    {
      marca: 'Honda', marca_slug: 'honda', modelo: 'Pop 110i', ano_fabricacao: 2025, ano_modelo: 2025, condicao: 'seminova', km: 4000, cor: 'branca',
      cilindrada: 109, categoria: 'street', preco: 14500, ipva_pago_ate: 2026, so_transferir: true, destaque: true,
      descricao: 'Pop 110i ano 2025 com apenas 4 mil km rodados.\nIPVA 2026 pago, documento em branco: é só transferir.',
    },
    'pop 110 2025',
    POP,
  ),
  await moto(
    {
      marca: 'Honda', marca_slug: 'honda', modelo: 'Bros 160', versao: 'ESDD', ano_fabricacao: 2026, ano_modelo: 2026, condicao: '0km', km: 0, cor: 'azul',
      cilindrada: 162, categoria: 'trail', preco: 28900, ipva_pago_ate: 2026, so_transferir: true, freio: 'cbs', destaque: true,
      descricao: 'Bros 160 2026 zero quilômetro, lançamento.\nIPVA 2026 pago, placa Mercosul, só transferir. Pegamos sua moto na troca.',
    },
    'BROS 2026',
    BROS,
  ),
  await moto(
    {
      marca: 'Honda', marca_slug: 'honda', modelo: 'Biz 100', ano_fabricacao: 2015, ano_modelo: 2015, condicao: 'seminova', km: 29000, cor: 'vermelha',
      cilindrada: 97, categoria: 'motoneta', preco: 12900, ipva_pago_ate: 2026, so_transferir: true,
      descricao: 'Biz 100 2015 extra, com apenas 29 mil km.\nIPVA 2026 pago, só transferir. Pegamos sua moto na troca.',
    },
    'Honda Biz 100 Vermelha 2015',
    BIZ,
  ),
]

const dados = {
  motos,
  lojas: [
    { id: 1, nome: 'Central Motos Irecê', cidade: 'Irecê', uf: 'BA', endereco: 'R. Antônio Carlos Magalhães, 41', bairro: null, cep: '44860-069', whatsapp: '5574999936265', maps_url: null, latitude: null, longitude: null, horario: null, principal: false, posicao: 1, ativa: true },
    { id: 2, nome: 'Central Motos LEM', cidade: 'Luís Eduardo Magalhães', uf: 'BA', endereco: 'Endereço a confirmar com a loja', bairro: null, cep: null, whatsapp: '5577981503989', maps_url: null, latitude: null, longitude: null, horario: null, principal: true, posicao: 2, ativa: true },
  ],
  config: { prazo_padrao: 48, aviso_site: null, instagram: 'centralmotoslem' },
  entregas: [],
}

writeFileSync(`${SAIDA}/dados.json`, JSON.stringify(dados, null, 1))
console.log(`ok ${SAIDA}/dados.json: ${motos.length} motos, ${motos.reduce((s, m) => s + m.fotos.length, 0)} fotos`)
