/**
 * As duas lojas (ajuste 5 da seção 11.3): cidade, endereço, horário, o WhatsApp da
 * própria loja e "Como chegar" (abre o Google Maps). Sem iframe de mapa (derruba o
 * PageSpeed) e sem foto de fachada inventada: a foto real entra quando o dono mandar.
 */
import { telefone } from '../../../compartilhado/vitrine/formato.mjs'
import { html } from '../../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../../compartilhado/vitrine/whatsapp.mjs'
import { LOJAS } from '../../conteudo.mjs'
import { rotulo, titulo } from '../comum.mjs'

export const css = ['home-lojas']

const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** [{dias:[1,2,3,4,5], abre:"08:00", fecha:"18:00"}] → "Segunda a sexta, das 8h às 18h" */
export function textoHorario(horario) {
  if (!Array.isArray(horario) || !horario.length) return []
  const hora = (h) => h.replace(/^0/, '').replace(':00', 'h').replace(':', 'h')
  return horario.map((h) => {
    const dias = [...(h.dias ?? [])].sort((a, b) => a - b)
    const seguidos = dias.length > 2 && dias.every((d, i) => i === 0 || d === dias[i - 1] + 1)
    const nomes = seguidos ? `${NOMES_DIAS[dias[0]]} a ${NOMES_DIAS[dias.at(-1)]}` : dias.map((d) => NOMES_DIAS[d]).join(', ')
    return `${nomes.charAt(0).toUpperCase()}${nomes.slice(1)}, das ${hora(h.abre)} às ${hora(h.fecha)}`
  })
}

export const comoChegar = (loja) =>
  loja.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Central Motos, ${loja.endereco}, ${loja.cidade} - ${loja.uf}`)}`

export function render(dados, { icone }) {
  return html`<section class="lojas secao secao--preta" id="lojas" aria-labelledby="titulo-lojas">
  <div class="container lojas__grade">
    <div class="lojas__cabeca">
      ${rotulo(LOJAS.rotulo)}
      ${titulo(LOJAS.titulo, { id: 'titulo-lojas' })}
      <p class="lojas__texto">${LOJAS.texto}</p>
    </div>
    <ul class="lojas__lista" role="list">${dados.lojas.map(
      (loja) => html`<li class="loja">
      <h3 class="loja__cidade">${loja.cidade}</h3>
      <p class="loja__endereco">${icone('map-pin', 'fill', 'loja__pino')}<span>${loja.endereco}${loja.bairro ? `, ${loja.bairro}` : ''}<br>${loja.cidade}, ${loja.uf}${loja.cep ? `, CEP ${loja.cep}` : ''}</span></p>
      ${textoHorario(loja.horario).map((linha) => html`<p class="loja__horario">${icone('clock', 'regular', 'loja__relogio')}<span>${linha}</span></p>`)}
      <p class="loja__telefone">${telefone(loja.whatsapp)}</p>
      <div class="loja__botoes">
        <a class="botao botao--whats" href="${linkWhatsapp({ origem: 'lojas', loja: loja.id })}" target="_blank" rel="noopener nofollow">${icone('whatsapp-logo', 'fill')}WhatsApp da loja</a>
        <a class="botao botao--contorno-claro" href="${comoChegar(loja)}" target="_blank" rel="noopener">${icone('map-trifold')}Como chegar</a>
      </div>
    </li>`,
    )}</ul>
  </div>
</section>`
}
