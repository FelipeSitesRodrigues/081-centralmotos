import { dataHora } from '@central/vitrine/formato'

type Site = { status: string; pendente: boolean; publicado_em: string | null; erro: string | null } | null

/** Uma linha dizendo se o site já mostra o que o lojista mudou. */
export function EstadoSite({ site }: { site: Site }) {
  if (!site) return null

  const { status, publicado_em, erro } = site
  let texto: string
  let cor = 'bg-rascunho text-rascunho-texto'

  if (status === 'sem_hook') {
    texto = 'O site ainda não está ligado ao painel. As mudanças ficam guardadas e entram quando ele for pro ar.'
  } else if (status === 'aguardando' || status === 'publicando') {
    texto = 'Atualizando o site. Leva cerca de 2 minutos.'
    cor = 'bg-reservada text-reservada-texto'
  } else if (status === 'falhou' || status === 'teto_diario') {
    texto = erro ?? 'A última atualização do site falhou. O painel tenta de novo sozinho.'
    cor = 'bg-erro-fundo text-erro'
  } else {
    texto = publicado_em ? `Site atualizado em ${dataHora(publicado_em)}.` : 'Site em dia.'
    cor = 'bg-no-ar text-no-ar-texto'
  }

  return (
    <p role="status" className={`rounded-botao px-3.5 py-2.5 text-[15px] font-semibold ${cor}`}>
      {texto}
    </p>
  )
}
