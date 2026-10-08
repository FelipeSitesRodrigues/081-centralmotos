/**
 * Textos fixos da vitrine, tirados do mockup aprovado (sites/081-Central Motos/Recursos Site).
 * O que é dado da loja (endereço, WhatsApp, horário, motos) vem do banco.
 *
 * Nos títulos, o trecho entre *asteriscos* sai em vermelho (como no mockup).
 *
 * confirmado: false = texto provisório que o dono ainda precisa confirmar. O build no
 * domínio de verdade recusa publicar enquanto houver algum (trava de lançamento, seção 8.1).
 */

export const SITE = {
  nome: 'Central Motos',
  // Frase de GEO: o que é, onde e pra quem, com todas as letras (passo 8 da skill /seo)
  oQueE: 'Loja de motos 0 km e seminovas em Irecê e Luís Eduardo Magalhães, na Bahia.',
  descricaoCurta: 'Motos 0 km e seminovas com procedência, financiamento 100% online e sua usada na troca.',
  avisoParcela: 'Parcelas simuladas em 48x sem entrada, sujeitas à análise de crédito. Não é oferta de crédito.',
}

export const HERO = {
  rotulo: 'Sua próxima moto está aqui',
  titulo: ['Qualidade,', '*confiança*', 'e liberdade'],
  sub: 'Motos 0 km e seminovas com procedência, financiamento 100% online, aprovação em 10 minutos e sua usada na troca.',
}

export const FAIXA = [
  { icone: 'wallet', linha1: 'Financiamento', linha2: '100% online' },
  { icone: 'clock', linha1: 'Aprovação em', linha2: '10 minutos' },
  { icone: 'arrows-left-right', linha1: 'Sua usada', linha2: 'na troca' },
  { icone: 'credit-card', linha1: 'Parcelas em', linha2: 'até 48x' },
]

export const ESTOQUE = {
  rotulo: 'Estoque atual',
  titulo: ['As melhores motos', 'de *Irecê e região.*'],
  texto: 'Das principais marcas, com procedência e documento em dia.',
}

export const TROCA = {
  titulo: ['Sua moto usada', '*vale na troca.*'],
  texto: 'Traga sua moto usada e saia com uma ainda melhor. Avaliação justa, rápida e sem complicação.',
}

export const PORQUE = {
  titulo: ['A escolha certa', 'em Irecê.'],
  itens: [
    { icone: 'shield-check', texto: 'Motos com procedência' },
    { icone: 'file-text', texto: 'Documento em dia' },
    { icone: 'handshake', texto: 'Atendimento transparente' },
    { icone: 'users-three', texto: 'Suporte após a venda' },
  ],
}

export const CLIENTES = {
  rotulo: 'Nossos clientes',
  titulo: ['Quem compra,', '*aprova.*'],
  texto: 'Veja algumas entregas feitas na nossa loja. Gente de Irecê e região que já saiu de moto nova.',
  // Sem fotos de entrega cadastradas no painel: chama pro Instagram, sem inventar cliente
  semFotos: 'As entregas vão pro nosso Instagram toda semana. São mais de 24 mil pessoas acompanhando a loja por lá.',
}

export const FINANCIAMENTO = {
  titulo: ['Financiamento', '*100% online.*'],
  sub: 'Simples, rápido e sem sair de casa.',
  passos: [
    { icone: 'whatsapp-logo', texto: 'Faça sua simulação pelo WhatsApp.' },
    { icone: 'file-text', texto: 'Envie seus dados.' },
    { icone: 'check-circle', texto: 'Aprovação em 10 minutos.' },
    { icone: 'motorcycle', texto: 'Retire sua moto na loja.' },
  ],
}

export const DUVIDAS = {
  rotulo: 'Dúvidas frequentes',
  titulo: 'Tire sua dúvida.',
  itens: [
    {
      pergunta: 'Consigo financiar mesmo com nome negativado?',
      resposta: 'Cada caso passa pela análise de crédito do banco. Mande seus dados pelo WhatsApp que a gente faz a simulação e diz na hora o que é possível pra você.',
      confirmado: false,
    },
    {
      pergunta: 'Preciso de entrada?',
      resposta: 'Não. As parcelas do site são simuladas sem entrada. Se você der um valor de entrada ou sua moto usada na troca, a parcela diminui.',
      confirmado: false,
    },
    {
      pergunta: 'Aprovação realmente é em 10 minutos?',
      resposta: 'Na maioria dos casos, sim: depois que você envia os dados pelo WhatsApp, a resposta do banco sai em poucos minutos.',
      confirmado: false,
    },
    {
      pergunta: 'Minha moto usada entra na troca?',
      resposta: 'Entra. A gente avalia a sua moto e o valor vira entrada da nova. Mande fotos, o ano e a quilometragem dela pelo WhatsApp pra começar.',
      confirmado: false,
    },
    {
      pergunta: 'Vocês trabalham com quais bancos?',
      resposta: 'Com os principais bancos e financeiras de moto. Na simulação a gente compara e mostra a melhor condição pro seu caso.',
      confirmado: false,
    },
  ],
}

export const LOJAS = {
  rotulo: 'Nossas lojas',
  titulo: ['Venha nos fazer', '*uma visita.*'],
  texto: 'Duas lojas no interior da Bahia, com o mesmo estoque. Chame no WhatsApp da loja mais perto de você.',
}

export const RODAPE = {
  texto: 'Motos 0 km e seminovas com procedência. Compra, venda e troca em Irecê e Luís Eduardo Magalhães, na Bahia.',
  // O mesmo crédito dos outros sites da Credialta (Instagram da marca)
  credito: { texto: 'Site por Credialta Sites', url: 'https://www.instagram.com/credialta.sites/' },
}

export const MENU = [
  { rotulo: 'Início', ancora: 'inicio' },
  { rotulo: 'Estoque', href: '/estoque' },
  { rotulo: 'Financiamento', ancora: 'financiamento' },
  { rotulo: 'Troca', ancora: 'troca' },
  { rotulo: 'Clientes', ancora: 'clientes' },
  { rotulo: 'Contato', ancora: 'lojas' },
]
