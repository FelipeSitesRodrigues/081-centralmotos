/**
 * /estoque/{slug}: uma página por moto no ar, e as vendidas dos últimos 30 dias
 * (com o aviso de vendida, sugestões e noindex: quem chega por um post antigo do
 * Instagram não cai num erro).
 */
import { nomeMoto } from '../../compartilhado/vitrine/formato.mjs'
import { html } from '../../compartilhado/vitrine/html.mjs'
import { paginaMoto } from '../../compartilhado/vitrine/pagina-moto.mjs'
import { SITE } from '../conteudo.mjs'
import { parecidas } from '../dados.mjs'

export const css = ['cards', 'moto']
export const js = ['galeria']

export function render(moto, dados, ctx) {
  const nome = nomeMoto(moto)
  const cidades = dados.lojas.length > 1 ? `Nas lojas de ${dados.lojas.map((l) => l.cidade).join(' e ')}` : dados.lojas[0] ? `Na loja de ${dados.lojas[0].cidade}` : ''
  return html`<main id="conteudo" class="pagina-moto">
  <div class="container">
    <nav class="migalhas migalhas--escura" aria-label="Você está em"><ol role="list"><li><a href="/">Início</a></li><li><a href="/estoque">Estoque</a></li><li aria-current="page">${nome}</li></ol></nav>
    ${paginaMoto(moto, { ...ctx, aviso: SITE.avisoParcela, parecidas: parecidas(moto, dados.aVenda), cidades })}
  </div>
</main>`
}
