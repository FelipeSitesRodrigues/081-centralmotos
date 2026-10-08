-- ============================================================================
-- Central Motos · as duas lojas
--
-- A CONFIRMAR COM O DONO (arquitetura.md, seção 20), antes do lançamento:
--   - o endereço da loja de LEM;
--   - qual WhatsApp é de qual loja. Aqui vai pelo DDD: 74 é Irecê (o número
--     do logo) e 77 é LEM (o número da bio do Instagram @centralmotoslem);
--   - qual loja é a principal (recebe os botões gerais de WhatsApp). Ficou a de
--     LEM porque é o número que a loja divulga na bio;
--   - horário das duas e o link do Google Maps.
-- O build da vitrine recusa publicar no domínio de verdade enquanto houver
-- "a confirmar" num endereço. O dono corrige tudo isso pelo painel (Lojas).
-- Só insere se a tabela estiver vazia.
-- ============================================================================

insert into public.lojas (nome, cidade, uf, endereco, cep, whatsapp, principal, posicao)
select l.nome, l.cidade, l.uf, l.endereco, l.cep, l.whatsapp, l.principal, l.posicao
  from (values
    ('Central Motos Irecê', 'Irecê', 'BA', 'R. Antônio Carlos Magalhães, 41', '44860-069', '5574999936265', false, 1),
    ('Central Motos LEM', 'Luís Eduardo Magalhães', 'BA', 'Endereço a confirmar com a loja', null, '5577981503989', true, 2)
  ) as l(nome, cidade, uf, endereco, cep, whatsapp, principal, posicao)
 where not exists (select 1 from public.lojas);

select id, nome, cidade, whatsapp, principal from public.lojas order by posicao;
