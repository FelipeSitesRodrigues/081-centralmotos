-- ============================================================================
-- Central Motos · teste das regras do banco
--
-- Roda como dono do banco numa transação só, que é desfeita no fim (o último
-- comando levanta 'RESULTADO:' com o placar). Nada fica gravado. As regras
-- testadas moram em gatilho, restrição e função, então valem igual pro painel.
--
--   node --env-file=.env.supabase.local supabase/testes/regras.mjs
-- ============================================================================

create temp table resultados (ordem serial, nome text, ok boolean, detalhe text);

/* Roda um comando; devolve null se deu certo ou a mensagem do erro. */
create function pg_temp.erro_de(p_sql text) returns text language plpgsql as $f$
begin
  execute p_sql;
  -- Confere na hora as restrições adiáveis (o índice único das posições de foto)
  execute 'set constraints all immediate';
  execute 'set constraints all deferred';
  return null;
exception when others then
  return sqlerrm;
end
$f$;

create function pg_temp.conferir(p_nome text, p_ok boolean, p_detalhe text default null) returns void language sql as $f$
  insert into pg_temp.resultados (nome, ok, detalhe) values (p_nome, coalesce(p_ok, false), p_detalhe);
$f$;

/* n fotos de mentira (só as linhas; nenhum arquivo sobe). */
create function pg_temp.fotos(n integer) returns jsonb language sql as $f$
  select jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid(), 'larguras', jsonb_build_array(480, 960, 1440), 'formato', 'webp',
    'largura_original', 2000, 'altura_original', 1500, 'cor_media', '#aabbcc'))
  from generate_series(1, n);
$f$;

/* Moto pronta pra ir pro ar: modelo, ano, condição, km, cor, preço e uma foto. */
create function pg_temp.moto_pronta(p_modelo integer, p_preco bigint) returns uuid language plpgsql as $f$
declare
  v_r jsonb;
  v_id uuid;
begin
  v_r := public.criar_rascunho();
  v_id := (v_r ->> 'id')::uuid;
  perform public.salvar_veiculo(v_id, jsonb_build_object(
    'modelo_id', p_modelo, 'ano_fabricacao', 2023, 'ano_modelo', 2024, 'condicao', 'seminova',
    'km', 12000, 'cor', 'preta', 'preco', jsonb_build_object('preco_centavos', p_preco)
  ), (v_r ->> 'editado_em')::timestamptz);
  perform public.adicionar_fotos(v_id, pg_temp.fotos(1));
  return v_id;
end
$f$;

do $teste$
declare
  v_pop integer;
  v_bros integer;
  v_tenere integer;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_d uuid;
  v_r jsonb;
  v_e text;
  v_ed timestamptz;
  v_ids uuid[];
  v_codigo integer;
  v_slug text;
  v_ok boolean;
  v_n integer;
  i integer;
begin
  select mo.id into v_pop from public.modelos mo join public.marcas ma on ma.id = mo.marca_id
   where ma.slug = 'honda' and mo.slug = 'pop-110i';
  select mo.id into v_bros from public.modelos mo join public.marcas ma on ma.id = mo.marca_id
   where ma.slug = 'honda' and mo.slug = 'bros-160';
  select mo.id into v_tenere from public.modelos mo join public.marcas ma on ma.id = mo.marca_id
   where ma.slug = 'yamaha' and mo.slug = 'tenere-250';
  perform pg_temp.conferir('semente: Pop 110i, Bros 160 e Ténéré 250 existem', v_pop is not null and v_bros is not null and v_tenere is not null);

  -- --------------------------------------------------------------------------
  -- Rascunho e ficha
  -- --------------------------------------------------------------------------

  v_r := public.criar_rascunho();
  v_a := (v_r ->> 'id')::uuid;
  v_codigo := (v_r ->> 'codigo')::integer;
  perform pg_temp.conferir('rascunho nasce com código e marca de edição',
    v_codigo is not null and (v_r ->> 'editado_em') is not null, v_r::text);

  v_e := pg_temp.erro_de($q$insert into public.veiculos (status) values ('publicado')$q$);
  perform pg_temp.conferir('moto não nasce publicada', v_e like '%status_inicial_invalido%', v_e);

  v_r := public.salvar_veiculo(v_a, jsonb_build_object(
    'modelo_id', v_pop, 'versao', '  ES  ', 'ano_fabricacao', 2024, 'ano_modelo', 2025,
    'condicao', 'seminova', 'km', 8500, 'cor', 'vermelha',
    'preco', jsonb_build_object('preco_centavos', 1000000)
  ), (v_r ->> 'editado_em')::timestamptz);
  v_ed := (v_r ->> 'editado_em')::timestamptz;
  perform pg_temp.conferir('R$ 10.000 vira 48x de R$ 540', (v_r ->> 'parcela_exibida')::integer = 540, v_r::text);

  perform pg_temp.conferir('categoria e cilindrada vêm do modelo; versão sem espaço sobrando',
    exists (select 1 from public.veiculos where id = v_a and categoria = 'street' and cilindrada = 109 and versao = 'ES'));

  v_e := pg_temp.erro_de(format($q$select public.salvar_veiculo(%L, '{"km": 9000}'::jsonb, %L::timestamptz - interval '1 second')$q$, v_a, v_ed));
  perform pg_temp.conferir('marca de edição velha é recusada (duas pessoas na mesma moto)', v_e like '%conflito_edicao%', v_e);

  v_e := pg_temp.erro_de(format($q$select public.salvar_veiculo(%L, '{"ano_fabricacao": 2024, "ano_modelo": 2027}'::jsonb, %L::timestamptz)$q$, v_a, v_ed));
  perform pg_temp.conferir('ano modelo mais de um ano depois da fabricação é recusado', v_e like '%veiculos_anos%', v_e);

  v_e := pg_temp.erro_de(format($q$select public.salvar_veiculo(%L, '{"condicao": "0km", "km": 300}'::jsonb, %L::timestamptz)$q$, v_a, v_ed));
  perform pg_temp.conferir('0 km com mais de 50 km rodados é recusado', v_e like '%veiculos_0km_ate_50%', v_e);

  -- --------------------------------------------------------------------------
  -- Parcela
  -- --------------------------------------------------------------------------

  v_r := public.salvar_veiculo(v_a, '{"preco": {"preco_centavos": 2000000}}', v_ed);
  perform pg_temp.conferir('R$ 20.000 vira 48x de R$ 1.080', (v_r ->> 'parcela_exibida')::integer = 1080, v_r::text);
  v_r := public.salvar_veiculo(v_a, '{"preco": {"preco_centavos": 2500000}}', v_ed);
  perform pg_temp.conferir('R$ 25.000 vira 48x de R$ 1.350', (v_r ->> 'parcela_exibida')::integer = 1350, v_r::text);
  v_r := public.salvar_veiculo(v_a, '{"preco": {"preco_centavos": 2500000, "parcela_manual": 1290}}', v_ed);
  perform pg_temp.conferir('parcela digitada pelo dono vale no lugar da calculada', (v_r ->> 'parcela_exibida')::integer = 1290, v_r::text);
  v_r := public.salvar_veiculo(v_a, '{"preco": {"preco_centavos": 2500000, "parcela_manual": null}}', v_ed);
  perform pg_temp.conferir('apagar a parcela manual volta pra calculada', (v_r ->> 'parcela_exibida')::integer = 1350, v_r::text);

  update public.financiamento_coeficientes set coeficiente = 0.0601 where prazo = 48;
  perform pg_temp.conferir('trocar o coeficiente recalcula as parcelas (25.000 × 0,0601 = 1.502,50 → 1.510)',
    (select parcela_exibida from public.veiculos where id = v_a) = 1510);
  update public.configuracoes set arredondar_para = 5 where id;
  perform pg_temp.conferir('trocar o arredondamento recalcula (→ 1.505)',
    (select parcela_exibida from public.veiculos where id = v_a) = 1505);
  update public.financiamento_coeficientes set coeficiente = 0.0537 where prazo = 48;
  update public.configuracoes set arredondar_para = 10 where id;
  perform pg_temp.conferir('voltar o coeficiente volta a parcela (→ 1.350)',
    (select parcela_exibida from public.veiculos where id = v_a) = 1350);

  v_e := pg_temp.erro_de($q$update public.financiamento_coeficientes set coeficiente = 0.5 where prazo = 48$q$);
  perform pg_temp.conferir('coeficiente fora de 0,02 a 0,15 é recusado', v_e is not null, v_e);

  perform pg_temp.conferir('marca de edição não muda quando só a parcela é recalculada',
    date_trunc('milliseconds', public.editado_em_veiculo(v_a)) = date_trunc('milliseconds', v_ed));

  perform pg_temp.conferir('mudar as configurações marca o site pra gerar de novo',
    (select pendente from public.site_publicacao where id));

  -- --------------------------------------------------------------------------
  -- Publicação: o que falta
  -- --------------------------------------------------------------------------

  -- Fila zerada: daqui pra frente, só o que aparece no site pode marcar
  update public.site_publicacao set pendente = false, status = 'em_dia', pedido_em = null where id;

  v_e := pg_temp.erro_de(format('select public.alterar_status(%L, %L)', v_a, 'publicado'));
  perform pg_temp.conferir('publicar sem foto é recusado e diz o que falta', v_e like '%publicacao_incompleta:capa%', v_e);

  v_e := pg_temp.erro_de(format($q$update public.veiculos set status = 'publicado' where id = %L$q$, v_a));
  perform pg_temp.conferir('UPDATE direto no status passa pela mesma regra', v_e like '%publicacao_incompleta:capa%', v_e);

  -- --------------------------------------------------------------------------
  -- Fotos
  -- --------------------------------------------------------------------------

  perform public.adicionar_fotos(v_a, pg_temp.fotos(3));
  perform pg_temp.conferir('3 fotos entram nas posições 0, 1 e 2',
    (select array_agg(posicao order by posicao) from public.veiculo_fotos where veiculo_id = v_a) = '{0,1,2}'::smallint[]);

  perform pg_temp.conferir('ficha e fotos de rascunho não marcam o site pra publicar',
    not (select pendente from public.site_publicacao where id));

  v_e := pg_temp.erro_de(format('select public.adicionar_fotos(%L, %L::jsonb)', v_a, pg_temp.fotos(18)));
  perform pg_temp.conferir('passar de 20 fotos é recusado e diz quantas ainda cabem', v_e like '%limite_fotos:17%', v_e);

  perform public.adicionar_fotos(v_a, pg_temp.fotos(17));
  perform pg_temp.conferir('20 fotos cabem', (select count(*) from public.veiculo_fotos where veiculo_id = v_a) = 20);

  v_e := pg_temp.erro_de(format($q$insert into public.veiculo_fotos (veiculo_id, posicao, larguras, formato, largura_original, altura_original)
                                   values (%L, 20, '{480}', 'webp', 800, 600)$q$, v_a));
  perform pg_temp.conferir('nem por INSERT direto passa da 20ª foto', v_e is not null, v_e);

  v_ids := (select array_agg(id order by posicao desc) from public.veiculo_fotos where veiculo_id = v_a);
  v_e := pg_temp.erro_de(format('select public.reordenar_fotos(%L, %L::uuid[])', v_a, v_ids));
  perform pg_temp.conferir('reordenar inverte as 20 fotos (posições trocadas numa transação)',
    v_e is null and (select id from public.veiculo_fotos where veiculo_id = v_a and posicao = 0) = v_ids[1], v_e);

  v_e := pg_temp.erro_de(format('select public.reordenar_fotos(%L, %L::uuid[])', v_a, v_ids[1:19]));
  perform pg_temp.conferir('reordenar sem todas as fotos é recusado', v_e like '%fotos_divergentes%', v_e);

  v_e := pg_temp.erro_de(format('select public.reordenar_fotos(%L, %L::uuid[])', v_a, v_ids[1:19] || v_ids[1]));
  perform pg_temp.conferir('reordenar com foto repetida é recusado', v_e like '%fotos_divergentes%', v_e);

  v_r := public.excluir_fotos(v_a, array[v_ids[1]]);
  perform pg_temp.conferir('excluir a capa: a seguinte vira capa e as posições ficam de 0 a 18',
    (select id from public.veiculo_fotos where veiculo_id = v_a and posicao = 0) = v_ids[2]
    and (select array_agg(posicao order by posicao) from public.veiculo_fotos where veiculo_id = v_a)
        = (select array_agg(g::smallint order by g) from generate_series(0, 18) g)
    and jsonb_array_length(v_r) = 1 and (v_r -> 0 ->> 'id')::uuid = v_ids[1], v_r::text);

  perform public.excluir_fotos(v_a, v_ids[2:17]);
  perform pg_temp.conferir('excluir várias deixa 3, contínuas', (select array_agg(posicao order by posicao) from public.veiculo_fotos where veiculo_id = v_a) = '{0,1,2}'::smallint[]);

  -- --------------------------------------------------------------------------
  -- Publicar, slug, transições
  -- --------------------------------------------------------------------------

  perform public.salvar_veiculo(v_a, '{"km": 0}', v_ed);
  v_e := pg_temp.erro_de(format('select public.alterar_status(%L, %L)', v_a, 'publicado'));
  perform pg_temp.conferir('seminova com 0 km não vai pro ar', v_e like '%publicacao_incompleta:km%', v_e);
  perform public.salvar_veiculo(v_a, '{"km": 8500}', v_ed);

  v_r := public.alterar_status(v_a, 'publicado');
  v_slug := v_r ->> 'slug';
  perform pg_temp.conferir('publicar gera o slug marca-modelo-versao-ano-codigo',
    v_slug = 'honda-pop-110i-es-2025-' || v_codigo and (v_r ->> 'publicado_em') is not null, v_r::text);
  perform pg_temp.conferir('publicar marca o site pra gerar de novo',
    (select pendente and status = 'aguardando' from public.site_publicacao where id));

  v_e := pg_temp.erro_de(format($q$update public.veiculos set slug = 'outro-endereco-1' where id = %L$q$, v_a));
  perform pg_temp.conferir('slug não muda depois de criado', v_e like '%slug_fixo%', v_e);

  perform public.salvar_veiculo(v_a, '{"versao": "CBS"}', public.editado_em_veiculo(v_a));
  perform pg_temp.conferir('mudar a versão depois de publicada não mexe no slug',
    (select slug from public.veiculos where id = v_a) = v_slug);

  v_e := pg_temp.erro_de(format('select public.salvar_veiculo(%L, %L::jsonb, %L)', v_a, '{"preco": {"preco_centavos": null}}', public.editado_em_veiculo(v_a)));
  perform pg_temp.conferir('moto no ar não fica sem preço (sem parcela)', v_e like '%veiculos_parcela_no_ar%', v_e);

  v_e := pg_temp.erro_de(format('delete from public.veiculo_fotos where veiculo_id = %L', v_a));
  perform pg_temp.conferir('moto no ar não fica sem foto', v_e like '%capa_obrigatoria%', v_e);

  v_r := public.alterar_status(v_a, 'reservado');
  perform pg_temp.conferir('publicada pode ser reservada', v_r ->> 'status' = 'reservado');
  v_r := public.alterar_status(v_a, 'vendido');
  perform pg_temp.conferir('reservada pode ser vendida e ganha data de venda', v_r ->> 'status' = 'vendido' and (v_r ->> 'vendido_em') is not null, v_r::text);
  v_r := public.alterar_status(v_a, 'publicado');
  perform pg_temp.conferir('desfazer a venda volta pro ar e apaga a data de venda', v_r ->> 'status' = 'publicado' and (v_r ->> 'vendido_em') is null, v_r::text);
  perform pg_temp.conferir('o slug sobrevive às mudanças de status', (select slug from public.veiculos where id = v_a) = v_slug);

  v_r := public.alterar_status(v_a, 'arquivado');
  v_e := pg_temp.erro_de(format('select public.alterar_status(%L, %L)', v_a, 'publicado'));
  perform pg_temp.conferir('arquivada não volta direto pro ar', v_e like '%transicao_invalida:arquivado:publicado%', v_e);
  v_r := public.alterar_status(v_a, 'rascunho');
  perform pg_temp.conferir('arquivada volta como rascunho', v_r ->> 'status' = 'rascunho');

  v_r := public.criar_rascunho();
  v_b := (v_r ->> 'id')::uuid;
  v_e := pg_temp.erro_de(format('select public.alterar_status(%L, %L)', v_b, 'vendido'));
  perform pg_temp.conferir('rascunho não vai direto pra vendida', v_e like '%transicao_invalida:rascunho:vendido%', v_e);

  v_e := pg_temp.erro_de(format('select public.alterar_status(%L, %L)', v_b, 'publicado'));
  perform pg_temp.conferir('rascunho vazio lista tudo o que falta de uma vez',
    v_e like '%publicacao_incompleta:capa,modelo,ano,condicao,cor,categoria,preco%', v_e);

  -- --------------------------------------------------------------------------
  -- Destaques
  -- --------------------------------------------------------------------------

  perform public.salvar_veiculo(v_b, '{"destaque": true}', public.editado_em_veiculo(v_b));
  perform pg_temp.conferir('rascunho não fica em destaque', not (select destaque from public.veiculos where id = v_b));

  update public.configuracoes set limite_destaques = 2 where id;
  perform public.alterar_status(v_a, 'publicado');
  v_c := pg_temp.moto_pronta(v_bros, 1800000);
  perform public.alterar_status(v_c, 'publicado');
  v_d := pg_temp.moto_pronta(v_tenere, 3200000);
  perform public.alterar_status(v_d, 'publicado');

  perform public.salvar_veiculo(v_a, '{"destaque": true}', public.editado_em_veiculo(v_a));
  perform public.salvar_veiculo(v_c, '{"destaque": true}', public.editado_em_veiculo(v_c));
  v_e := pg_temp.erro_de(format('select public.salvar_veiculo(%L, %L::jsonb, %L)', v_d, '{"destaque": true}', public.editado_em_veiculo(v_d)));
  perform pg_temp.conferir('acima do limite de destaques é recusado (limite 2)', v_e like '%limite_destaques:2%', v_e);

  perform public.alterar_status(v_c, 'vendido');
  perform pg_temp.conferir('vendida perde o destaque', not (select destaque from public.veiculos where id = v_c));
  v_e := pg_temp.erro_de(format('select public.salvar_veiculo(%L, %L::jsonb, %L)', v_d, '{"destaque": true}', public.editado_em_veiculo(v_d)));
  perform pg_temp.conferir('com vaga aberta, o destaque entra', v_e is null, v_e);
  update public.configuracoes set limite_destaques = 8 where id;

  -- --------------------------------------------------------------------------
  -- Ordem manual, exclusão, loja principal
  -- --------------------------------------------------------------------------

  v_n := public.reordenar_veiculos(array[v_d, v_a]);
  perform pg_temp.conferir('reordenar o estoque grava a ordem pedida',
    (select ordem from public.veiculos where id = v_d) = 1 and (select ordem from public.veiculos where id = v_a) = 2);

  v_e := pg_temp.erro_de(format('select public.excluir_veiculo(%L)', v_a));
  perform pg_temp.conferir('moto no ar não pode ser excluída de vez', v_e like '%exclusao_bloqueada%', v_e);
  perform public.alterar_status(v_a, 'rascunho');
  v_e := pg_temp.erro_de(format('select public.excluir_veiculo(%L)', v_a));
  perform pg_temp.conferir('rascunho que já foi pro ar também passa pelo arquivo', v_e like '%exclusao_bloqueada%', v_e);
  perform public.alterar_status(v_a, 'arquivado');
  v_r := public.excluir_veiculo(v_a);
  perform pg_temp.conferir('arquivada é excluída e devolve as fotos pra apagar do Storage',
    jsonb_array_length(v_r -> 'fotos') = 3 and not exists (select 1 from public.veiculos where id = v_a)
    and not exists (select 1 from public.veiculos_precos where veiculo_id = v_a), v_r::text);

  v_r := public.excluir_veiculo(v_b);
  perform pg_temp.conferir('rascunho que nunca foi pro ar é excluído direto', not exists (select 1 from public.veiculos where id = v_b));

  perform public.definir_loja_principal(1::smallint);
  perform pg_temp.conferir('trocar a loja principal deixa uma só',
    (select array_agg(id order by id) from public.lojas where principal) = '{1}'::smallint[]);

  v_e := pg_temp.erro_de($q$update public.lojas set principal = true where id = 2$q$);
  perform pg_temp.conferir('nem por UPDATE direto ficam duas principais', v_e like '%lojas_uma_principal_idx%', v_e);

  -- --------------------------------------------------------------------------
  -- Busca, auditoria, cliques, limites, resumo
  -- --------------------------------------------------------------------------

  perform pg_temp.conferir('busca sem acento: "tenere" acha a Ténéré',
    exists (select 1 from public.veiculos where id = v_d and busca like '%yamaha tenere 250%' and busca like '%seminova%'
            and busca like '%cm-' || lpad((select codigo from public.veiculos where id = v_d)::text, 4, '0') || '%'));

  perform pg_temp.conferir('auditoria registra a mudança de status',
    exists (select 1 from public.atividades where entidade = 'veiculos' and entidade_id = v_d::text and acao = 'mudou_status'));
  perform pg_temp.conferir('auditoria registra o preço (só o painel lê)',
    exists (select 1 from public.atividades where entidade = 'veiculos_precos' and entidade_id = v_d::text and mudancas ? 'preco_centavos'));
  perform pg_temp.conferir('auditoria registra o coeficiente',
    exists (select 1 from public.atividades where entidade = 'financiamento_coeficientes' and mudancas ? 'coeficiente'));

  select codigo into v_codigo from public.veiculos where id = v_d;
  v_ok := public.registrar_clique(v_codigo, null, 'card', 'teste-regras-chave-0001');
  v_ok := v_ok and public.registrar_clique(v_codigo, null, 'card', 'teste-regras-chave-0001');
  perform pg_temp.conferir('dois cliques no mesmo dia e origem somam na mesma linha',
    v_ok and (select cliques from public.cliques_whatsapp_dia where veiculo_id = v_d and origem = 'card') = 2);
  perform pg_temp.conferir('clique com origem inválida não conta',
    not public.registrar_clique(v_codigo, null, 'qualquer', 'teste-regras-chave-0001'));
  perform pg_temp.conferir('clique em moto que não está no ar não conta',
    not public.registrar_clique(-1, null, 'card', 'teste-regras-chave-0001'));
  for i in 1..31 loop
    v_ok := public.registrar_clique(null, 1::smallint, 'hero', 'teste-regras-chave-0002');
  end loop;
  perform pg_temp.conferir('passou de 30 cliques por hora do mesmo aparelho, para de contar',
    not v_ok and (select cliques from public.cliques_whatsapp_dia where veiculo_id is null and loja_id = 1 and origem = 'hero') = 30);

  perform pg_temp.conferir('limite de tentativas: 3 passam e a 4ª não',
    public.consumir_limite('teste-regras-login', 3, 900) and public.consumir_limite('teste-regras-login', 3, 900)
    and public.consumir_limite('teste-regras-login', 3, 900) and not public.consumir_limite('teste-regras-login', 3, 900));

  v_r := public.painel_resumo();
  perform pg_temp.conferir('resumo do painel traz os números e o estado do site',
    v_r ?& array['no_ar', 'reservadas', 'rascunhos', 'vendidas_mes', 'atencao', 'cliques_7_dias', 'site']
    and (v_r ->> 'no_ar')::integer >= 1 and (v_r ->> 'cliques_total_7_dias')::integer >= 2, v_r::text);

  perform pg_temp.conferir('sem sessão do painel, eh_admin() é falso', not public.eh_admin());

  -- --------------------------------------------------------------------------
  -- Permissões (conferidas no catálogo, sem trocar de papel)
  -- --------------------------------------------------------------------------

  perform pg_temp.conferir('toda tabela tem RLS ligada',
    not exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity));

  perform pg_temp.conferir('as views leem como quem consulta (security_invoker)',
    not exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'
                and not coalesce('security_invoker=true' = any (c.reloptions), false)));

  perform pg_temp.conferir('visitante não tem nenhuma permissão nos preços',
    not has_table_privilege('anon', 'public.veiculos_precos', 'select,insert,update,delete,truncate,references,trigger')
    and not exists (select 1 from information_schema.column_privileges
                    where table_schema = 'public' and table_name = 'veiculos_precos' and grantee = 'anon'));

  perform pg_temp.conferir('visitante não escreve em tabela nenhuma',
    not exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v')
                and has_table_privilege('anon', c.oid, 'insert,update,delete,truncate'))
    and not exists (select 1 from information_schema.column_privileges
                    where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE')));

  perform pg_temp.conferir('visitante não lê autoria nem datas internas da moto',
    not has_column_privilege('anon', 'public.veiculos', 'criado_por', 'select')
    and not has_column_privilege('anon', 'public.veiculos', 'atualizado_por', 'select')
    and not has_column_privilege('anon', 'public.veiculos', 'criado_em', 'select'));

  perform pg_temp.conferir('visitante não lê o painel, os cliques, as atividades, os limites nem os coeficientes',
    not has_table_privilege('anon', 'public.painel_motos', 'select')
    and not has_table_privilege('anon', 'public.cliques_whatsapp_dia', 'select')
    and not has_table_privilege('anon', 'public.atividades', 'select')
    and not has_table_privilege('anon', 'public.limites', 'select')
    and not has_table_privilege('anon', 'public.site_publicacao', 'select')
    and not has_table_privilege('anon', 'public.perfis', 'select')
    and not has_table_privilege('anon', 'public.financiamento_coeficientes', 'select'));

  perform pg_temp.conferir('a única função que o visitante chama é registrar_publicacao (protegida por segredo)',
    (select array_agg(p.proname::text order by p.proname) from pg_proc p
      where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute'))
    = array['registrar_publicacao'],
    (select string_agg(p.proname, ', ') from pg_proc p
      where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')));

  perform pg_temp.conferir('cliques, limites e registro de acesso só pelo servidor',
    not has_function_privilege('authenticated', 'public.registrar_clique(integer, smallint, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.consumir_limite(text, integer, integer)', 'execute')
    and not has_function_privilege('authenticated', 'public.registrar_acesso(uuid, text, text, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.recalcular_parcela(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.processar_publicacao()', 'execute'));

  perform pg_temp.conferir('o painel não grava parcela, slug, busca nem datas direto',
    not has_column_privilege('authenticated', 'public.veiculos', 'parcela_exibida', 'update')
    and not has_column_privilege('authenticated', 'public.veiculos', 'slug', 'update')
    and not has_column_privilege('authenticated', 'public.veiculos', 'busca', 'update')
    and not has_column_privilege('authenticated', 'public.veiculos', 'publicado_em', 'update')
    and not has_column_privilege('authenticated', 'public.veiculos', 'vendido_em', 'update')
    and not has_column_privilege('authenticated', 'public.veiculos', 'criado_por', 'update'));

  perform pg_temp.conferir('toda função SECURITY DEFINER fixa o search_path',
    not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
                and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')));

  perform pg_temp.conferir('buckets públicos só leem: 2 MB, WebP e JPEG',
    (select count(*) from storage.buckets where id in ('veiculos', 'entregas') and public
       and file_size_limit = 2097152 and allowed_mime_types = array['image/webp', 'image/jpeg']) = 2);

  perform pg_temp.conferir('nenhuma política no Storage (ninguém lista nem sobe com a chave pública)',
    not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                and (qual like '%veiculos%' or qual like '%entregas%' or with_check like '%veiculos%' or with_check like '%entregas%'
                     or roles && array['anon', 'public']::name[])));

  perform pg_temp.conferir('rotinas do pg_cron agendadas (publicação a cada minuto e limpeza diária)',
    (select count(*) from cron.job where jobname in ('central-publicar-site', 'central-limpeza-diaria') and active) = 2);

  raise exception 'RESULTADO:%', (
    select jsonb_agg(
             case when r.ok then jsonb_build_object('ok', true, 'nome', r.nome)
                  else jsonb_build_object('ok', false, 'nome', r.nome, 'detalhe', r.detalhe) end
             order by r.ordem)
      from pg_temp.resultados r
  )::text;
end
$teste$;
