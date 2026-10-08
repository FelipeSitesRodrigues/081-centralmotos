import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '@/lib/ambiente'
import { COOKIE_PAINEL, sessaoVencida } from '@/lib/supabase/cookie'

/*
 * Proxy do painel (1ª das três camadas da seção 6.2 do plano).
 *
 * 1. Renova a sessão do Supabase antes da página rodar e grava o cookie novo.
 * 2. Filtro rápido: sem login vai pra /entrar; sessão com mais de 7 dias entra
 *    de novo. É só a primeira porta: toda página e ação conferem a sessão de
 *    novo (exigirAdmin) e o banco confere mais uma vez (RLS).
 * 3. CSP com nonce por request: nenhum script inline sem o nonce roda. Por
 *    isso o painel é todo dinâmico (nonce não convive com página estática).
 * 4. Nada do painel é indexado nem guardado em cache.
 */

/** Abrem sem login. */
const ROTAS_PUBLICAS = ['/entrar', '/sem-acesso', '/sair']

const casa = (caminho: string, rotas: string[]) => rotas.some((r) => caminho === r || caminho.startsWith(`${r}/`))

function montarCsp(nonce: string) {
  const producao = process.env.NODE_ENV === 'production'
  const supabase = new URL(SUPABASE_URL).origin
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${producao ? '' : " 'unsafe-eval'"}`,
    // Atributo style (foco da foto, barra de progresso) não aceita nonce
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`,
    "font-src 'self'",
    // O navegador sobe a foto direto pro Storage, pela URL assinada
    `connect-src 'self' ${supabase}`,
    // Worker que processa as fotos: com 'strict-dynamic' o script-src ignora 'self'
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Só em produção: no celular pela rede local (teste da etapa 2) o painel roda em http
    ...(producao ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const csp = montarCsp(nonce)

  // Os cabeçalhos da página saem do request atual: se a sessão for renovada,
  // o cookie novo já chega na página neste mesmo request.
  const seguir = () => {
    const cabecalhos = new Headers(request.headers)
    cabecalhos.set('x-nonce', nonce)
    cabecalhos.set('Content-Security-Policy', csp)
    return NextResponse.next({ request: { headers: cabecalhos } })
  }

  let resposta = seguir()
  let cabecalhosSessao: Record<string, string> = {}

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    cookieOptions: COOKIE_PAINEL,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista, cabecalhos) {
        for (const { name, value } of lista) request.cookies.set(name, value)
        resposta = seguir()
        for (const { name, value, options } of lista) resposta.cookies.set(name, value, options)
        cabecalhosSessao = { ...cabecalhosSessao, ...cabecalhos }
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const caminho = request.nextUrl.pathname

  /** Resposta final: cabeçalhos de segurança e os cookies da sessão renovada. */
  const finalizar = (saida: NextResponse) => {
    if (saida !== resposta) {
      for (const cookie of resposta.cookies.getAll()) saida.cookies.set(cookie)
    }
    for (const [chave, valor] of Object.entries(cabecalhosSessao)) saida.headers.set(chave, valor)
    saida.headers.set('Content-Security-Policy', csp)
    saida.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    saida.headers.set('Cache-Control', 'private, no-store')
    return saida
  }

  const irPara = (destino: string, para?: string) => {
    const url = new URL(destino, request.url)
    if (para && para !== '/') url.searchParams.set('para', para)
    return finalizar(NextResponse.redirect(url, 303))
  }

  if (!claims) {
    return casa(caminho, ROTAS_PUBLICAS) ? finalizar(resposta) : irPara('/entrar', caminho)
  }

  if (sessaoVencida(claims.amr) && caminho !== '/sair') {
    await supabase.auth.signOut({ scope: 'local' })
    return irPara('/entrar?motivo=expirou')
  }

  // Já entrou: a tela de login não faz sentido
  if (caminho === '/entrar') return irPara('/')

  return finalizar(resposta)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icone.svg|robots.txt).*)'],
}
