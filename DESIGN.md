# Central Motos · sistema visual da vitrine

Tirado do mockup aprovado (`sites/081-Central Motos/Recursos Site/DESKTOP` e `MOBILE`) e das
medidas da seção 11.2 do plano. O painel usa as mesmas cores em tema claro (é tela de operação).

## Leitura

Vitrine de loja de motos do interior da Bahia, pra quem compra pelo celular, muitas vezes no 4G.
Blocos de cor da marca (preto, vermelho e gelo), títulos condensados e pesados, foto de moto como
herói e a parcela como preço. Página de persuasão: cada seção termina perto de um botão de WhatsApp.

## Cores

| Token | Valor | Onde |
|---|---|---|
| `--preto` | `#0B0B0D` | cabeçalho, hero, troca, financiamento, lojas |
| `--preto-fundo` | `#050506` | rodapé |
| `--carvao` | `#16161A` | cartões sobre preto (passos, lojas) |
| `--grafite` | `#2A2A30` | bordas sobre preto |
| `--vermelho` | `#E01A22` | acento único: botão principal, palavra destacada, parcela, faixas vermelhas |
| `--vermelho-fundo` | `#B80F17` | fim do degradê das seções vermelhas |
| `--gelo` | `#F5F4F2` | estoque e clientes |
| `--branco` | `#FFFFFF` | cartões claros, texto sobre escuro |
| `--texto-claro` | `#A3A3AB` | texto secundário sobre preto (7,85:1) |
| `--texto-escuro` | `#55555D` | texto secundário sobre gelo (6,72:1) |
| `--verde-whats` | `#15803D` | botões de WhatsApp (5,02:1 com branco; o `#25D366` do mockup dá 1,98:1) |

Sobre o vermelho, texto branco (4,84:1). Nunca texto vermelho pequeno sobre preto: o vermelho só
entra em título grande (Anton) e na parcela.

## Tipos

- **Anton** (400, única): títulos em caixa alta, nome da moto, parcela, números dos passos e selos.
  Altura de linha 0,95 a 1,05. No celular, títulos com palavra longa ("FINANCIAMENTO", "CONFIANÇA")
  usam tamanho em `vw` pra não estourar em 320 px.
- **Manrope** (400 a 800, variável): corpo 16 a 18 px, menu e botões 600 a 700, rótulos 700 em
  caixa alta com espaçamento largo.
- Escala de título: hero `clamp(2.6rem, 9.4vw, 5.4rem)`, seção `clamp(2rem, 6.6vw, 3.25rem)`,
  cartão 1,25 rem, parcela no cartão 2 rem.

## Formas

- Cantos: 10 px no cartão, 8 px no botão, 4 px no selo. Pílula só nos filtros do estoque e no botão
  flutuante redondo (ajuste 9 da seção 11.3: um sistema de cantos só).
- Botão: 48 px de altura no mínimo (52 no hero), ícone à esquerda, Manrope 700.
- Rótulo de seção (linha vermelha de 28 px + texto pequeno em caixa alta): só no hero, estoque,
  clientes e lojas (ajuste 4 da seção 11.3).

## Ritmo das seções (home)

preto (cabeçalho e hero) · vermelho (faixa de 4 itens) · gelo (estoque) · preto (troca) ·
vermelho (por que comprar) · gelo (clientes) · preto (financiamento) · vermelho (dúvidas) ·
preto (lojas) · preto profundo (rodapé). Tema fixo, sem modo escuro alternativo.

## Componentes

- **Cartão da moto:** foto 3:2 com o ponto de foco no `object-position`, selo (0 KM, SEMINOVA,
  RESERVADA) no canto, nome em Anton, ano e km, "48x de" e a parcela em vermelho, "Ver detalhes" e
  o botão de WhatsApp da própria moto (ajuste 2 da seção 11.3).
- **Faixa vermelha:** 4 itens com ícone de traço (Phosphor light), 2x2 no celular.
- **Passos do financiamento:** cartão carvão com número grande em vermelho e ícone.
- **Dúvidas:** `<details>` nativo (abre sem JavaScript), borda clara sobre o vermelho.
- **Lojas:** um cartão por loja com cidade, endereço, horário, WhatsApp da loja e "Como chegar".

## Movimento

Nada animado na primeira dobra (lição da 080: abertura animada derrubou o celular pra 67).
Transições de 150 a 200 ms só em `transform`, `opacity` e cor; `prefers-reduced-motion` zera tudo.

## Ícones

Phosphor (pacote `@phosphor-icons/core`), montados no build num sprite por página com só os
ícones usados. Nenhuma biblioteca no navegador.
