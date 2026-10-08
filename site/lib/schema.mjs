/**
 * Dados estruturados (JSON-LD) pro Google e pras respostas de IA (seção 10 do plano).
 *
 * - Home: uma MotorcycleDealer por loja, o WebSite e as dúvidas (FAQPage).
 * - Moto: Motorcycle e as migalhas. Sem "offers": sem preço não há oferta válida, e
 *   inventar um preço violaria o pedido do dono.
 * - Estoque: CollectionPage com a lista das motos e as migalhas.
 *
 * <script type="application/ld+json"> é bloco de dados, não script: a CSP sem
 * 'unsafe-inline' não bloqueia.
 */
import { cru } from '../../compartilhado/vitrine/html.mjs'
import { nomeMoto } from '../../compartilhado/vitrine/formato.mjs'
import { urlFoto, urlOg } from '../../compartilhado/vitrine/fotos.mjs'
import { CORES_NOME } from '../../compartilhado/vitrine/rotulos.mjs'

const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** JSON dentro de <script>: "</" vira "<\/" pra nenhum texto do banco fechar a tag. */
export const blocoJsonLd = (grafo) => cru(`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': grafo }).replace(/<\//g, '<\\/')}</script>`)

export function lojaJsonLd(loja, base, instagram) {
  const negocio = {
    '@type': 'MotorcycleDealer',
    '@id': `${base}/#loja-${loja.id}`,
    name: loja.nome,
    description: `Loja de motos 0 km e seminovas em ${loja.cidade}, ${loja.uf}. Compra, venda e troca, com financiamento 100% online.`,
    url: `${base}/`,
    image: `${base}/assets/img/og-central-motos.jpg`,
    logo: `${base}/assets/img/icone-512.png`,
    telephone: `+${loja.whatsapp}`,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: loja.endereco,
      ...(loja.bairro ? { addressNeighborhood: loja.bairro } : {}),
      addressLocality: loja.cidade,
      addressRegion: loja.uf,
      ...(loja.cep ? { postalCode: loja.cep } : {}),
      addressCountry: 'BR',
    },
    areaServed: [{ '@type': 'City', name: loja.cidade }, { '@type': 'State', name: 'Bahia' }],
    sameAs: [`https://www.instagram.com/${instagram}/`],
  }
  if (loja.latitude && loja.longitude) negocio.geo = { '@type': 'GeoCoordinates', latitude: Number(loja.latitude), longitude: Number(loja.longitude) }
  if (loja.maps_url) negocio.hasMap = loja.maps_url
  if (Array.isArray(loja.horario) && loja.horario.length) {
    negocio.openingHoursSpecification = loja.horario.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: (h.dias ?? []).map((d) => `https://schema.org/${DIAS[d]}`),
      opens: h.abre,
      closes: h.fecha,
    }))
  }
  return negocio
}

export function siteJsonLd(base) {
  return { '@type': 'WebSite', '@id': `${base}/#site`, name: 'Central Motos', url: `${base}/`, inLanguage: 'pt-BR' }
}

export function faqJsonLd(itens, url) {
  return {
    '@type': 'FAQPage',
    '@id': `${url}#duvidas`,
    mainEntity: itens.map((q) => ({ '@type': 'Question', name: q.pergunta, acceptedAnswer: { '@type': 'Answer', text: q.resposta } })),
  }
}

export function migalhasJsonLd(itens, url) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#migalhas`,
    itemListElement: itens.map(([nome, endereco], i) => ({ '@type': 'ListItem', position: i + 1, name: nome, item: endereco })),
  }
}

export function motoJsonLd(moto, { base, arquivos, url }) {
  const capa = moto.fotos[0]
  const imagens = moto.fotos.slice(0, 8).map((f) => urlFoto(arquivos, moto.id, f, 1440))
  if (capa?.og) imagens.unshift(urlOg(arquivos, moto.id, capa))
  const item = {
    '@type': 'Motorcycle',
    '@id': `${url}#moto`,
    name: nomeMoto(moto),
    url,
    sku: `CM-${String(moto.codigo).padStart(4, '0')}`,
    brand: { '@type': 'Brand', name: moto.marca },
    model: [moto.modelo, moto.versao].filter(Boolean).join(' '),
    vehicleModelDate: String(moto.ano_modelo),
    ...(moto.ano_fabricacao ? { productionDate: String(moto.ano_fabricacao) } : {}),
    itemCondition: moto.condicao === '0km' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: moto.km, unitCode: 'KMT' },
    ...(moto.cor && moto.cor !== 'outra' ? { color: CORES_NOME[moto.cor] } : {}),
    ...(moto.cilindrada ? { vehicleEngine: { '@type': 'EngineSpecification', engineDisplacement: { '@type': 'QuantitativeValue', value: moto.cilindrada, unitCode: 'CMQ' } } } : {}),
    ...(moto.cambio ? { vehicleTransmission: moto.cambio === 'automatico' ? 'Automático' : 'Manual' } : {}),
    ...(moto.unico_dono ? { numberOfPreviousOwners: 1 } : {}),
    image: imagens,
  }
  return item
}

export function estoqueJsonLd(motos, { base, url }) {
  return {
    '@type': 'CollectionPage',
    '@id': `${url}#pagina`,
    url,
    name: 'Estoque de motos 0 km e seminovas',
    isPartOf: { '@id': `${base}/#site` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: motos.length,
      itemListElement: motos.slice(0, 60).map((m, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/estoque/${m.slug}`, name: nomeMoto(m) })),
    },
  }
}
