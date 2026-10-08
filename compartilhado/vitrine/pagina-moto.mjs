/**
 * Miolo da página da moto (seção 11.4 do plano): galeria, nome, selos, parcela,
 * WhatsApp e troca; a ficha em grupos, a descrição e as motos parecidas.
 * Usado pelo build da vitrine e pela prévia do painel.
 */
import { altDaMoto, cardMoto } from './card-moto.mjs'
import { codigoMoto, km, nomeMoto, reais } from './formato.mjs'
import { dimensoes, srcsetFoto, TAMANHOS, urlFoto } from './fotos.mjs'
import { html, paragrafos } from './html.mjs'
import { CAMBIOS_NOME, CATEGORIAS_NOME, COMBUSTIVEIS_NOME, CORES_NOME, FREIOS_NOME, PARTIDAS_NOME } from './rotulos.mjs'
import { selosDaMoto } from './selos.mjs'
import { linkWhatsapp } from './whatsapp.mjs'

const sim = (v) => (v ? 'Sim' : 'Não')
const primeiraMaiuscula = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)

/** Linhas da ficha, em grupos. Campo vazio não aparece. */
export function fichaDaMoto(moto, anoAtual = new Date().getFullYear()) {
  const grupo = (titulo, linhas) => ({ titulo, linhas: linhas.filter(([, v]) => v !== null && v !== undefined && v !== '') })
  return [
    grupo('Identificação', [
      ['Marca', moto.marca],
      ['Modelo', moto.modelo],
      ['Versão', moto.versao],
      ['Ano', moto.ano_fabricacao && moto.ano_modelo ? `${moto.ano_fabricacao}/${moto.ano_modelo}` : moto.ano_modelo],
      ['Cor', moto.cor ? primeiraMaiuscula(CORES_NOME[moto.cor] ?? moto.cor) : null],
      ['Código', codigoMoto(moto.codigo)],
    ]),
    grupo('Motor e uso', [
      ['Quilometragem', moto.condicao === '0km' ? '0 km' : km(moto.km)],
      ['Cilindrada', moto.cilindrada ? `${moto.cilindrada} cc` : null],
      ['Tipo', CATEGORIAS_NOME[moto.categoria] ?? null],
      ['Combustível', COMBUSTIVEIS_NOME[moto.combustivel] ?? null],
      ['Partida', PARTIDAS_NOME[moto.partida] ?? null],
      ['Câmbio', CAMBIOS_NOME[moto.cambio] ?? null],
      ['Freio', FREIOS_NOME[moto.freio] ?? null],
    ]),
    grupo('Documentação', [
      ['IPVA', moto.ipva_pago_ate ? (moto.ipva_pago_ate >= anoAtual ? `Pago até ${moto.ipva_pago_ate}` : `Pago até ${moto.ipva_pago_ate}`) : null],
      ['Final da placa', moto.final_placa ?? null],
      ['Único dono', moto.unico_dono ? 'Sim' : null],
      ['Manual e chave reserva', moto.manual_chave ? 'Sim' : null],
      ['Revisada', moto.revisada ? 'Sim' : null],
      ['Documento', moto.so_transferir ? 'Em dia, só transferir' : null],
      ['Aceita troca', sim(moto.aceita_troca)],
    ]),
  ].filter((g) => g.linhas.length)
}

/**
 * @param {any} moto
 * @param {{ arquivos: string, prazo: number, icone: Function, aviso: string, parecidas: any[], cidades: string }} ctx
 */
export function paginaMoto(moto, ctx) {
  const nome = nomeMoto(moto)
  const fotos = moto.fotos ?? []
  const vendida = moto.status === 'vendido'
  const selos = selosDaMoto(moto)
  const ficha = fichaDaMoto(moto)
  const anos = moto.ano_fabricacao && moto.ano_modelo ? `${moto.ano_fabricacao}/${moto.ano_modelo}` : String(moto.ano_modelo ?? '')
  const resumo = [anos, moto.condicao === '0km' ? '0 km' : km(moto.km), moto.cor ? primeiraMaiuscula(CORES_NOME[moto.cor]) : null, codigoMoto(moto.codigo)].filter(Boolean)

  const slides = fotos.map((foto, i) => {
    const dim = dimensoes(foto)
    return html`<li class="galeria__slide" id="foto-${i + 1}" style="background-color:${foto.cor_media ?? '#16161a'}"><img src="${urlFoto(ctx.arquivos, moto.id, foto, 960)}" srcset="${srcsetFoto(ctx.arquivos, moto.id, foto)}" sizes="${TAMANHOS.principal}" width="${dim.largura}" height="${dim.altura}" alt="${altDaMoto(moto, fotos.length > 1 ? `, foto ${i + 1} de ${fotos.length}` : '')}" ${i === 0 ? html`fetchpriority="high"` : html`loading="lazy"`} decoding="async"></li>`
  })

  const miniaturas =
    fotos.length > 1
      ? html`<ol class="galeria__miniaturas" aria-label="Fotos da moto">${fotos.map(
          (foto, i) =>
            html`<li><a href="#foto-${i + 1}" class="galeria__miniatura" aria-label="Foto ${i + 1} de ${fotos.length}"${i === 0 ? html` aria-current="true"` : ''}><img src="${urlFoto(ctx.arquivos, moto.id, foto, 480)}" width="96" height="72" alt="" loading="lazy" decoding="async" style="object-position:${foto.foco_x ?? 50}% ${foto.foco_y ?? 50}%"></a></li>`,
        )}</ol>`
      : ''

  return html`<div class="moto">
  <div class="moto__galeria galeria" data-galeria>
    <ul class="galeria__trilho" role="list" aria-label="Fotos da ${nome}" tabindex="0">${slides}</ul>
    ${fotos.length > 1 ? html`<p class="galeria__contador" aria-hidden="true"><span data-galeria-atual>1</span> / ${fotos.length}</p>` : ''}
    ${miniaturas}
  </div>

  <div class="moto__info">
    <ul class="moto__selos" role="list">${selos.map((s) => html`<li class="selo selo--${s.tipo}">${s.texto}</li>`)}</ul>
    <h1 class="moto__nome">${nome}</h1>
    <p class="moto__resumo">${resumo.join(' · ')}</p>
    ${
      vendida
        ? html`<div class="moto__vendida" role="status">
      <p class="moto__vendida-titulo">Esta moto já foi vendida.</p>
      <p>Chame no WhatsApp que a gente procura uma parecida pra você, ou veja as motos disponíveis abaixo.</p>
    </div>
    <a class="botao botao--whats botao--grande" href="${linkWhatsapp({ origem: 'vendida', codigo: moto.codigo })}" target="_blank" rel="noopener nofollow">${ctx.icone('whatsapp-logo', 'fill')}Quero uma parecida</a>
    <a class="botao botao--contorno-claro botao--grande" href="/estoque">Ver as motos disponíveis</a>`
        : html`<div class="moto__parcela">
      <span class="moto__parcela-rotulo">${ctx.prazo}x de</span>
      <strong class="moto__parcela-valor">${moto.parcela_exibida ? reais(moto.parcela_exibida) : 'Consulte'}</strong>
      <span class="moto__parcela-nota">sem entrada</span>
    </div>
    <p class="moto__aviso">${ctx.aviso}</p>
    <div class="moto__acoes">
      <a class="botao botao--whats botao--grande" href="${linkWhatsapp({ origem: 'pagina_moto', codigo: moto.codigo })}" target="_blank" rel="noopener nofollow">${ctx.icone('whatsapp-logo', 'fill')}Chamar no WhatsApp</a>
      ${moto.aceita_troca ? html`<a class="botao botao--contorno-claro botao--grande" href="${linkWhatsapp({ origem: 'troca', codigo: moto.codigo })}" target="_blank" rel="noopener nofollow">${ctx.icone('arrows-left-right', 'bold')}Avaliar minha moto na troca</a>` : ''}
    </div>
    <p class="moto__onde">${ctx.icone('map-pin', 'fill')}${ctx.cidades}</p>`
    }
  </div>
</div>

<div class="moto-detalhes">
  <section class="moto-detalhes__ficha" aria-labelledby="titulo-ficha">
    <h2 class="titulo-bloco" id="titulo-ficha">Ficha da moto</h2>
    <div class="ficha">${ficha.map(
      (g) => html`<div class="ficha__grupo">
      <h3 class="ficha__titulo">${g.titulo}</h3>
      <dl class="ficha__lista">${g.linhas.map(([rotulo, valor]) => html`<div class="ficha__linha"><dt>${rotulo}</dt><dd>${valor}</dd></div>`)}</dl>
    </div>`,
    )}</div>
  </section>
  ${
    moto.descricao
      ? html`<section class="moto-detalhes__descricao" aria-labelledby="titulo-descricao">
    <h2 class="titulo-bloco" id="titulo-descricao">Sobre esta moto</h2>
    <div class="texto-corrido">${paragrafos(moto.descricao)}</div>
  </section>`
      : ''
  }
</div>

${
  ctx.parecidas.length
    ? html`<section class="parecidas" aria-labelledby="titulo-parecidas">
  <h2 class="titulo-bloco" id="titulo-parecidas">${vendida ? 'Motos disponíveis parecidas' : 'Motos parecidas'}</h2>
  <ul class="grade-cards" role="list">${ctx.parecidas.map((m) => html`<li>${cardMoto(m, ctx)}</li>`)}</ul>
</section>`
    : ''
}

${
  vendida
    ? ''
    : html`<div class="barra-moto" aria-hidden="false">
  <p class="barra-moto__parcela"><span>${ctx.prazo}x de</span> <strong>${moto.parcela_exibida ? reais(moto.parcela_exibida) : 'Consulte'}</strong></p>
  <a class="botao botao--whats" href="${linkWhatsapp({ origem: 'pagina_moto', codigo: moto.codigo })}" target="_blank" rel="noopener nofollow">${ctx.icone('whatsapp-logo', 'fill')}WhatsApp</a>
</div>`
}`
}
