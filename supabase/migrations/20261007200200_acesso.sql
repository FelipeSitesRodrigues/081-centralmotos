-- ============================================================================
-- Central Motos · quem lê e quem escreve (arquitetura.md, seção 4.8)
--
-- anon é o visitante e também o build da vitrine (que lê com a chave pública).
-- authenticated só vale alguma coisa com public.eh_admin(): perfil admin
-- ativo, código do celular (aal2) e login de menos de 7 dias.
--
-- Tudo começa revogado. Cada permissão abaixo é devolvida de propósito, coluna
-- por coluna onde o visitante lê. Preço, custo e observação moram em
-- veiculos_precos, que não tem nenhuma permissão nem política pra anon.
-- ============================================================================

alter table public.perfis enable row level security;
alter table public.lojas enable row level security;
alter table public.marcas enable row level security;
alter table public.modelos enable row level security;
alter table public.veiculos enable row level security;
alter table public.veiculos_precos enable row level security;
alter table public.veiculo_fotos enable row level security;
alter table public.financiamento_coeficientes enable row level security;
alter table public.configuracoes enable row level security;
alter table public.entregas enable row level security;
alter table public.cliques_whatsapp_dia enable row level security;
alter table public.atividades enable row level security;
alter table public.limites enable row level security;
alter table public.site_publicacao enable row level security;

revoke all on table
  public.perfis, public.lojas, public.marcas, public.modelos, public.veiculos,
  public.veiculos_precos, public.veiculo_fotos, public.financiamento_coeficientes,
  public.configuracoes, public.entregas, public.cliques_whatsapp_dia, public.atividades,
  public.limites, public.site_publicacao
from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Perfis: cada um lê o seu; o admin lê todos. Ninguém muda o próprio papel
-- (perfis só mudam pelos scripts com a chave secreta).
-- ----------------------------------------------------------------------------

grant select on public.perfis to authenticated;

create policy "cada um lê o próprio perfil"
  on public.perfis for select to authenticated
  using (id = (select auth.uid()));

create policy "admin lê os perfis"
  on public.perfis for select to authenticated
  using ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Lojas
-- ----------------------------------------------------------------------------

grant select on public.lojas to anon;
grant select,
  insert (nome, cidade, uf, endereco, bairro, cep, whatsapp, maps_url, latitude, longitude, horario, principal, posicao, ativa),
  update (nome, cidade, uf, endereco, bairro, cep, whatsapp, maps_url, latitude, longitude, horario, principal, posicao, ativa)
  on public.lojas to authenticated;

create policy "vitrine lê as lojas ativas"
  on public.lojas for select to anon
  using (ativa);

create policy "admin gerencia as lojas"
  on public.lojas for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Marcas e modelos: públicos (não há segredo num catálogo de modelos)
-- ----------------------------------------------------------------------------

grant select on public.marcas, public.modelos to anon;
grant select, insert (nome, slug, ativa), update (nome, slug, ativa) on public.marcas to authenticated;
grant select,
  insert (marca_id, nome, slug, categoria, cilindrada, ativa),
  update (marca_id, nome, slug, categoria, cilindrada, ativa)
  on public.modelos to authenticated;

create policy "vitrine lê as marcas"
  on public.marcas for select to anon
  using (true);

create policy "admin gerencia as marcas"
  on public.marcas for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

create policy "vitrine lê os modelos"
  on public.modelos for select to anon
  using (true);

create policy "admin gerencia os modelos"
  on public.modelos for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Veículos: o visitante lê só as colunas públicas das motos no ar e das
-- vendidas nos últimos 30 dias (a página de "já foi vendida" continua no ar).
-- ----------------------------------------------------------------------------

grant select (
  id, codigo, slug, modelo_id, versao, ano_fabricacao, ano_modelo, condicao, km, cor,
  cilindrada, categoria, combustivel, partida, freio, cambio, final_placa, ipva_pago_ate,
  unico_dono, manual_chave, revisada, so_transferir, aceita_troca, descricao, status,
  destaque, ordem, parcela_exibida, busca, publicado_em, vendido_em, atualizado_em
) on public.veiculos to anon;

-- slug, parcela, busca, datas e autoria são do banco: o painel não grava direto
grant select,
  insert (status),
  update (
    modelo_id, versao, ano_fabricacao, ano_modelo, condicao, km, cor, cilindrada, categoria,
    combustivel, partida, freio, cambio, final_placa, ipva_pago_ate, unico_dono, manual_chave,
    revisada, so_transferir, aceita_troca, descricao, status, destaque, ordem
  ),
  delete
  on public.veiculos to authenticated;

create policy "vitrine lê as motos no ar"
  on public.veiculos for select to anon
  using (
    status in ('publicado', 'reservado')
    or (status = 'vendido' and vendido_em > now() - interval '30 days')
  );

create policy "admin lê as motos"
  on public.veiculos for select to authenticated
  using ((select public.eh_admin()));

create policy "admin cria moto"
  on public.veiculos for insert to authenticated
  with check ((select public.eh_admin()));

create policy "admin altera moto"
  on public.veiculos for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- Moto que já foi pro ar passa pelo arquivo antes de sumir de vez
create policy "admin exclui rascunho ou arquivada"
  on public.veiculos for delete to authenticated
  using ((select public.eh_admin()) and (status = 'arquivado' or (status = 'rascunho' and publicado_em is null)));

-- ----------------------------------------------------------------------------
-- Preços: PRIVADO. Nenhuma permissão nem política pra anon.
-- ----------------------------------------------------------------------------

grant select,
  insert (veiculo_id, preco_centavos, parcela_manual, custo_centavos, observacao),
  update (preco_centavos, parcela_manual, custo_centavos, observacao),
  delete
  on public.veiculos_precos to authenticated;

create policy "admin gerencia os preços"
  on public.veiculos_precos for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Fotos: o visitante lê as fotos das motos que ele pode ver (a RLS de
-- veiculos filtra dentro do EXISTS).
-- ----------------------------------------------------------------------------

grant select (
  id, veiculo_id, posicao, larguras, formato, largura_original, altura_original,
  foco_x, foco_y, cor_media, og
) on public.veiculo_fotos to anon;

grant select,
  insert (id, veiculo_id, posicao, larguras, formato, largura_original, altura_original, foco_x, foco_y, cor_media),
  update (posicao, foco_x, foco_y, cor_media, og),
  delete
  on public.veiculo_fotos to authenticated;

create policy "vitrine lê as fotos das motos no ar"
  on public.veiculo_fotos for select to anon
  using (exists (select 1 from public.veiculos v where v.id = veiculo_fotos.veiculo_id));

create policy "admin gerencia as fotos"
  on public.veiculo_fotos for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Financiamento: só o painel. A vitrine recebe a parcela pronta e não precisa
-- do coeficiente (quanto menos o visitante lê, menos dá pra deduzir o preço).
-- ----------------------------------------------------------------------------

grant select,
  insert (prazo, coeficiente, ativo),
  update (coeficiente, ativo)
  on public.financiamento_coeficientes to authenticated;

create policy "admin gerencia os coeficientes"
  on public.financiamento_coeficientes for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Configurações: o visitante lê o prazo (texto da simulação), o aviso e o Instagram
-- ----------------------------------------------------------------------------

grant select (prazo_padrao, aviso_site, instagram) on public.configuracoes to anon;
grant select,
  update (prazo_padrao, arredondar_para, limite_destaques, aviso_site, instagram)
  on public.configuracoes to authenticated;

create policy "vitrine lê as configurações"
  on public.configuracoes for select to anon
  using (true);

create policy "admin lê as configurações"
  on public.configuracoes for select to authenticated
  using ((select public.eh_admin()));

create policy "admin altera as configurações"
  on public.configuracoes for update to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Entregas: o visitante lê as publicadas
-- ----------------------------------------------------------------------------

grant select (
  id, posicao, publicada, legenda, larguras, formato, largura_original, altura_original,
  foco_x, foco_y, cor_media
) on public.entregas to anon;

grant select,
  insert (id, posicao, publicada, legenda, larguras, formato, largura_original, altura_original, foco_x, foco_y, cor_media),
  update (posicao, publicada, legenda, foco_x, foco_y),
  delete
  on public.entregas to authenticated;

create policy "vitrine lê as entregas publicadas"
  on public.entregas for select to anon
  using (publicada);

create policy "admin gerencia as entregas"
  on public.entregas for all to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Só leitura pro painel: cliques, atividades e estado da publicação.
-- limites não tem permissão nenhuma: só as funções do servidor mexem.
-- ----------------------------------------------------------------------------

grant select on public.cliques_whatsapp_dia, public.atividades, public.site_publicacao to authenticated;

create policy "admin lê os cliques"
  on public.cliques_whatsapp_dia for select to authenticated
  using ((select public.eh_admin()));

create policy "admin lê as atividades"
  on public.atividades for select to authenticated
  using ((select public.eh_admin()));

create policy "admin lê a publicação"
  on public.site_publicacao for select to authenticated
  using ((select public.eh_admin()));

-- ----------------------------------------------------------------------------
-- Views. security_invoker: quem consulta passa pela RLS e pelas permissões de
-- coluna das tabelas, como se lesse direto. Sem isso a view leria como dona
-- e furaria tudo acima.
-- ----------------------------------------------------------------------------

/* O que o build da vitrine lê (com a chave pública): colunas públicas e fotos em ordem. */
create view public.vitrine_motos
with (security_invoker = true)
as
select
  v.id, v.codigo, v.slug, v.status,
  ma.nome as marca, ma.slug as marca_slug,
  mo.nome as modelo, mo.slug as modelo_slug,
  v.versao, v.ano_fabricacao, v.ano_modelo, v.condicao, v.km, v.cor, v.cilindrada, v.categoria,
  v.combustivel, v.partida, v.freio, v.cambio, v.final_placa, v.ipva_pago_ate,
  v.unico_dono, v.manual_chave, v.revisada, v.so_transferir, v.aceita_troca, v.descricao,
  v.destaque, v.ordem, v.parcela_exibida, v.busca, v.publicado_em, v.vendido_em, v.atualizado_em,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', f.id, 'larguras', f.larguras, 'formato', f.formato,
      'largura', f.largura_original, 'altura', f.altura_original,
      'foco_x', f.foco_x, 'foco_y', f.foco_y, 'cor_media', f.cor_media, 'og', f.og
    ) order by f.posicao)
      from public.veiculo_fotos f
     where f.veiculo_id = v.id
  ), '[]'::jsonb) as fotos
from public.veiculos v
join public.modelos mo on mo.id = v.modelo_id
join public.marcas ma on ma.id = mo.marca_id;

/* Lista do painel: tudo da moto, o preço privado, a capa e a marca de edição do formulário. */
create view public.painel_motos
with (security_invoker = true)
as
select
  v.*,
  mo.marca_id, ma.nome as marca, mo.nome as modelo,
  p.preco_centavos, p.parcela_manual, p.custo_centavos, p.observacao,
  greatest(v.atualizado_em, coalesce(p.atualizado_em, '-infinity'::timestamptz)) as editado_em,
  (select count(*) from public.veiculo_fotos f where f.veiculo_id = v.id)::integer as total_fotos,
  (select jsonb_build_object(
            'id', f.id, 'larguras', f.larguras, 'formato', f.formato,
            'largura', f.largura_original, 'altura', f.altura_original,
            'foco_x', f.foco_x, 'foco_y', f.foco_y, 'cor_media', f.cor_media, 'og', f.og)
     from public.veiculo_fotos f
    where f.veiculo_id = v.id
    order by f.posicao
    limit 1) as capa
from public.veiculos v
left join public.modelos mo on mo.id = v.modelo_id
left join public.marcas ma on ma.id = mo.marca_id
left join public.veiculos_precos p on p.veiculo_id = v.id;

revoke all on public.vitrine_motos, public.painel_motos from anon, authenticated;
grant select on public.vitrine_motos to anon, authenticated;
grant select on public.painel_motos to authenticated;

-- ----------------------------------------------------------------------------
-- Funções. Começa tudo revogado (o padrão do Postgres é liberar pra todos) e
-- volta só o que cada papel chama. Gatilhos disparam sem precisar de EXECUTE.
-- ----------------------------------------------------------------------------

revoke all on all functions in schema public from public, anon, authenticated;

-- Usadas pelas políticas e pelo gatilho que roda como quem gravou
grant execute on function
  public.eh_admin(),
  public.pode_gerenciar(),
  public.sem_acento(text),
  public.slug_de(text),
  public.transicao_permitida(text, text)
to authenticated;

-- Painel (cada uma confere pode_gerenciar() e a RLS vale por baixo)
grant execute on function
  public.editado_em_veiculo(uuid),
  public.criar_rascunho(),
  public.pendencias_publicacao(uuid),
  public.salvar_veiculo(uuid, jsonb, timestamptz),
  public.alterar_status(uuid, text),
  public.adicionar_fotos(uuid, jsonb),
  public.reordenar_fotos(uuid, uuid[]),
  public.excluir_fotos(uuid, uuid[]),
  public.reordenar_veiculos(uuid[]),
  public.excluir_veiculo(uuid),
  public.definir_loja_principal(smallint),
  public.painel_resumo()
to authenticated;

-- Servidor (chave secreta): limite de tentativas, cliques e registro de acesso
grant execute on function
  public.consumir_limite(text, integer, integer),
  public.registrar_clique(integer, smallint, text, text),
  public.registrar_acesso(uuid, text, text, text, text)
to service_role;
