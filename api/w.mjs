/**
 * Rota /api/w da vitrine na Vercel: monta o link do WhatsApp da loja certa com o
 * contatos.json do build. Só recebe ids (o, m, l), nunca número nem texto.
 * A contagem de cliques (registrar_clique) entra na etapa 5.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { mensagemWhatsapp, urlWaMe } from '../compartilhado/vitrine/whatsapp.mjs'

const contatos = JSON.parse(readFileSync(path.join(process.cwd(), 'site/dist/contatos.json'), 'utf8'))

export function GET(request) {
  const busca = new URL(request.url).searchParams
  const origem = busca.get('o') ?? 'outro'
  const moto = contatos.motos[busca.get('m') ?? ''] ?? null
  const loja = contatos.lojas[busca.get('l') ?? ''] ?? null
  const destino = loja ?? contatos.principal
  const texto = mensagemWhatsapp({ origem, moto, loja })
  return new Response(null, {
    status: 303,
    headers: { Location: urlWaMe(destino.whatsapp, texto), 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}
