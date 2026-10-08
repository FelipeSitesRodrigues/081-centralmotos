/** 404: busca no estoque e o caminho de volta (seção 14 do plano). */
import { html } from '../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../compartilhado/vitrine/whatsapp.mjs'

export const css = ['texto']

export function render(_dados, { icone }) {
  return html`<main id="conteudo" class="pagina-texto secao secao--gelo">
  <div class="container texto texto--404">
    <p class="texto__codigo" aria-hidden="true">404</p>
    <h1 class="titulo">Essa página não existe</h1>
    <p>A moto pode ter sido vendida ou o endereço está incompleto. Procure no estoque:</p>
    <form class="busca-404" action="/estoque" method="get" role="search">
      <label for="busca-404" class="sr-only">Buscar no estoque</label>
      <input id="busca-404" name="busca" type="search" placeholder="Modelo, ano ou código" enterkeyhint="search">
      <button type="submit" class="botao botao--vermelho">${icone('magnifying-glass', 'bold')}Buscar</button>
    </form>
    <div class="texto__botoes">
      <a class="botao botao--escuro" href="/estoque">Ver todo o estoque</a>
      <a class="botao botao--whats" href="${linkWhatsapp({ origem: 'outro' })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}Falar no WhatsApp</a>
    </div>
  </div>
</main>`
}
