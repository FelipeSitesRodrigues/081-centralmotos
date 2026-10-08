/**
 * Política de privacidade (seção 6.6 do plano). A vitrine não coleta dado pessoal:
 * não tem formulário, não usa cookie e o clique no WhatsApp guarda só a contagem
 * por dia.
 */
import { telefone } from '../../compartilhado/vitrine/formato.mjs'
import { html } from '../../compartilhado/vitrine/html.mjs'
import { linkWhatsapp } from '../../compartilhado/vitrine/whatsapp.mjs'

export const css = ['texto']

export const ATUALIZADA_EM = '07/10/2026'

export function render(dados) {
  const lojas = dados.lojas
  return html`<main id="conteudo" class="pagina-texto secao secao--gelo">
  <article class="container texto">
    <nav class="migalhas" aria-label="Você está em"><ol role="list"><li><a href="/">Início</a></li><li aria-current="page">Política de privacidade</li></ol></nav>
    <h1 class="titulo">Política de privacidade</h1>
    <p class="texto__data">Atualizada em ${ATUALIZADA_EM}.</p>

    <h2>Quem somos</h2>
    <p>Este site é da Central Motos, loja de motos 0 km e seminovas com lojas em ${lojas.map((l) => l.cidade).join(' e ')}, na Bahia. A Central Motos é a responsável pelo tratamento dos dados descritos aqui.</p>

    <h2>O que este site coleta</h2>
    <p>Nada que identifique você. O site não tem formulário, não pede nome, telefone nem e-mail, e não usa cookies de rastreamento nem de publicidade.</p>
    <p>Quando você toca num botão de WhatsApp, o site conta o clique para a loja saber quais motos despertam mais interesse. Guardamos apenas o número de cliques por dia e por moto. Para evitar abuso, o endereço de internet do aparelho é transformado num código que não pode ser revertido e é descartado em até um dia; ele nunca é guardado em texto.</p>

    <h2>A conversa no WhatsApp</h2>
    <p>Ao tocar no botão, você abre uma conversa no WhatsApp com a loja. A partir daí, o que você envia segue também as regras do WhatsApp. Usamos o que você mandar só para atender o seu pedido: simulação de financiamento, avaliação da sua moto na troca e informações sobre as motos.</p>

    <h2>Fotos de clientes</h2>
    <p>As fotos de entrega que aparecem no site são publicadas com autorização de quem aparece nelas. Se você aparece numa foto e quer que ela saia do site, peça pelo WhatsApp e a foto é retirada.</p>

    <h2>Seus direitos</h2>
    <p>Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir para saber quais dados seus a loja tem, corrigir ou apagar esses dados. Fale com a loja pelo WhatsApp:</p>
    <ul>${lojas.map((l) => html`<li>${l.cidade}: <a href="${linkWhatsapp({ origem: 'outro', loja: l.id })}" target="_blank" rel="noopener nofollow">${telefone(l.whatsapp)}</a></li>`)}</ul>

    <h2>Mudanças nesta política</h2>
    <p>Se a forma de tratar dados mudar (por exemplo, se o site passar a usar alguma ferramenta de anúncios), esta página será atualizada antes, com a nova data no topo.</p>
  </article>
</main>`
}
