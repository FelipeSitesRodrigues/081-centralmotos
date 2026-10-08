/**
 * /estoque (seção 8.4 do plano). O HTML já chega com as 24 primeiras motos na ordem
 * padrão: funciona sem JavaScript e é o que o Google lê. O estoque.json só baixa
 * depois do carregamento (ou no primeiro toque num filtro), fora da janela do LCP,
 * e o estoque.js filtra, ordena e pagina com o estado na URL.
 */
import { cardMoto } from '../../compartilhado/vitrine/card-moto.mjs'
import { cru, html } from '../../compartilhado/vitrine/html.mjs'
import { CATEGORIAS_NOME } from '../../compartilhado/vitrine/rotulos.mjs'
import { linkWhatsapp } from '../../compartilhado/vitrine/whatsapp.mjs'
import { SITE } from '../conteudo.mjs'

export const POR_PAGINA = 24

export const css = ['cards', 'estoque']
export const js = ['estoque']

const opcoes = (lista, rotulo) => html`<option value="">${rotulo}</option>${lista.map(([valor, texto]) => html`<option value="${valor}">${texto}</option>`)}`

export function render(dados, ctx) {
  const { icone } = ctx
  const motos = dados.aVenda
  const marcas = [...new Map(motos.map((m) => [m.marca_slug, m.marca])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const tipos = [...new Set(motos.map((m) => m.categoria).filter(Boolean))].map((c) => [c, CATEGORIAS_NOME[c] ?? c]).sort((a, b) => a[1].localeCompare(b[1]))
  const anos = [...new Set(motos.map((m) => m.ano_modelo))].sort((a, b) => b - a)
  const primeira = motos.slice(0, POR_PAGINA)
  const paginas = Math.max(1, Math.ceil(motos.length / POR_PAGINA))

  return html`<main id="conteudo" class="pagina-estoque secao secao--gelo">
  <div class="container">
    <nav class="migalhas" aria-label="Você está em"><ol role="list"><li><a href="/">Início</a></li><li aria-current="page">Estoque</li></ol></nav>
    <div class="pagina-estoque__topo">
      <h1 class="titulo"><span class="titulo__linha">Estoque de motos</span> <span class="titulo__linha"><span class="destaque">0 km e seminovas</span></span></h1>
      <p class="pagina-estoque__texto">${SITE.oQueE} Parcelas em ${ctx.prazo}x sem entrada, financiamento 100% online e a sua usada na troca.</p>
    </div>

    <details class="filtros" data-filtros>
      <summary class="filtros__abrir">${icone('sliders-horizontal', 'bold')}<span>Filtrar e ordenar</span><span class="filtros__quantos" data-quantos-filtros hidden></span></summary>
      <form class="filtros__form" action="/estoque" method="get" role="search" aria-label="Filtrar o estoque" data-filtros-form>
        <div class="filtros__busca">
          <label for="f-busca" class="filtros__rotulo">Buscar</label>
          <div class="filtros__campo-busca">${icone('magnifying-glass', 'bold')}<input id="f-busca" name="busca" type="search" placeholder="Modelo, ano ou código" enterkeyhint="search" autocomplete="off"></div>
        </div>
        <div class="filtros__campo"><label for="f-condicao" class="filtros__rotulo">Condição</label><select id="f-condicao" name="condicao">${opcoes([['0km', '0 km'], ['seminova', 'Seminova']], 'Todas')}</select></div>
        <div class="filtros__campo"><label for="f-marca" class="filtros__rotulo">Marca</label><select id="f-marca" name="marca">${opcoes(marcas, 'Todas')}</select></div>
        <div class="filtros__campo"><label for="f-tipo" class="filtros__rotulo">Tipo</label><select id="f-tipo" name="tipo">${opcoes(tipos, 'Todos')}</select></div>
        <div class="filtros__campo"><label for="f-cilindrada" class="filtros__rotulo">Cilindrada</label><select id="f-cilindrada" name="cilindrada">${opcoes(
          [
            ['ate-125', 'Até 125 cc'],
            ['150-190', '150 a 190 cc'],
            ['200-300', '200 a 300 cc'],
            ['acima-300', 'Acima de 300 cc'],
          ],
          'Todas',
        )}</select></div>
        <div class="filtros__campo"><label for="f-parcela" class="filtros__rotulo">Parcela até</label><select id="f-parcela" name="parcela">${opcoes(
          [
            ['ate-600', 'R$ 600'],
            ['ate-900', 'R$ 900'],
            ['ate-1200', 'R$ 1.200'],
            ['acima-1200', 'Acima de R$ 1.200'],
          ],
          'Qualquer',
        )}</select></div>
        <div class="filtros__campo"><label for="f-ano" class="filtros__rotulo">Ano a partir de</label><select id="f-ano" name="ano">${opcoes(
          anos.map((a) => [a, a]),
          'Qualquer',
        )}</select></div>
        <div class="filtros__campo"><label for="f-ordem" class="filtros__rotulo">Ordem</label><select id="f-ordem" name="ordem">${cru(
          [
            ['', 'Destaques'],
            ['menor-parcela', 'Menor parcela'],
            ['maior-parcela', 'Maior parcela'],
            ['mais-novas', 'Mais novas'],
            ['menor-km', 'Menor km'],
            ['recentes', 'Recém-chegadas'],
          ]
            .map(([v, t]) => `<option value="${v}">${t}</option>`)
            .join(''),
        )}</select></div>
        <div class="filtros__acoes">
          <button type="submit" class="botao botao--vermelho">Ver motos</button>
          <a class="botao botao--fantasma" href="/estoque" data-limpar>Limpar filtros</a>
        </div>
      </form>
    </details>

    <p class="pagina-estoque__contagem" data-contagem aria-live="polite">${motos.length === 1 ? '1 moto disponível' : `${motos.length} motos disponíveis`}</p>
    <p class="pagina-estoque__erro" data-erro hidden>Não foi possível carregar os filtros. <button type="button" class="link" data-tentar>Tentar de novo</button></p>

    ${
      motos.length
        ? html`<ul class="grade-cards" role="list" data-lista>${primeira.map((m, i) => html`<li>${cardMoto(m, ctx, { prioridade: i === 0, nivel: 2 })}</li>`)}</ul>`
        : html`<div class="estoque__vazio"><p>Estamos atualizando o estoque. Chame no WhatsApp que a gente mostra as motos disponíveis agora.</p><a class="botao botao--whats" href="${linkWhatsapp({ origem: 'estoque_vazio' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Ver as motos no WhatsApp</a></div>`
    }
    <div class="pagina-estoque__nada" data-nada hidden>
      <p>Nenhuma moto com esses filtros.</p>
      <a class="botao botao--escuro" href="/estoque" data-limpar>Limpar filtros</a>
    </div>

    <nav class="paginacao" aria-label="Páginas do estoque" data-paginacao${paginas > 1 ? '' : cru(' hidden')}>${
      paginas > 1 ? html`<span class="paginacao__info">Página 1 de ${paginas}</span><a class="botao botao--contorno-vermelho" href="/estoque?pagina=2" data-pagina="2">Próxima página${icone('caret-right', 'bold')}</a>` : ''
    }</nav>

    <p class="pagina-estoque__aviso">${SITE.avisoParcela}</p>
  </div>
</main>`
}

/**
 * Índice leve do estoque pro filtro (uns 300 bytes por moto). Só dado público, o
 * mesmo que já está nas páginas.
 */
export function indiceEstoque(motos) {
  return motos.map((m) => {
    const capa = m.fotos[0]
    return {
      id: m.id,
      s: m.slug,
      c: m.codigo,
      ma: m.marca,
      ms: m.marca_slug,
      mo: m.modelo,
      v: m.versao,
      a: m.ano_modelo,
      k: m.km,
      co: m.condicao,
      ca: m.categoria,
      ci: m.cilindrada,
      p: m.parcela_exibida,
      d: m.destaque ? 1 : 0,
      o: m.ordem ?? 0,
      t: m.publicado_em,
      st: m.status,
      cor: m.cor,
      b: m.busca,
      f: { id: capa.id, l: capa.larguras, fo: capa.formato, w: capa.largura, h: capa.altura, x: capa.foco_x ?? 50, y: capa.foco_y ?? 50, cm: capa.cor_media },
    }
  })
}
