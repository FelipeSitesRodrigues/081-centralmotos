-- ============================================================================
-- Central Motos · regras de negócio (arquitetura.md, seções 4.5 a 4.7)
--
-- As regras moram aqui, em gatilho e função, e valem venham as mudanças do
-- painel, do SQL do dashboard ou de um script: transição de status, o que
-- falta pra publicar, limite de destaques e de fotos, cálculo da parcela,
-- slug fixo, auditoria e fila de publicação do site.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Quem pode mexer
-- ----------------------------------------------------------------------------

/*
 * Administrador de verdade: perfil admin ativo, sessão com o código do celular
 * concluído (aal2) e login feito há menos de 7 dias neste aparelho. O registro
 * mais antigo do "amr" é a entrada com senha (ou o convite); o código do
 * celular entra depois. Nas políticas: (select public.eh_admin()).
 */
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and coalesce((
       select min((a ->> 'timestamp')::bigint) > extract(epoch from now() - interval '7 days')
         from jsonb_array_elements(
           case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
         ) a
     ), false)
     and exists (
       select 1 from public.perfis p
        where p.id = (select auth.uid()) and p.papel = 'admin' and p.ativo
     );
$$;

/*
 * Quem pode chamar as funções do painel: o administrador acima ou o próprio
 * banco (SQL do dashboard e scripts com a chave secreta). SECURITY INVOKER de
 * propósito: aqui current_user é quem chamou.
 */
create or replace function public.pode_gerenciar()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select current_user in ('postgres', 'service_role') or public.eh_admin();
$$;

-- ----------------------------------------------------------------------------
-- Auditoria e fila de publicação
-- ----------------------------------------------------------------------------

/*
 * Grava em atividades o que mudou, com quem mudou. No UPDATE, só as colunas
 * que mudaram (de e para). Moto, preço e foto ficam com o id da moto, pra
 * montar o histórico de uma moto numa consulta só.
 */
create or replace function public.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ignorar constant text[] := array['atualizado_em', 'atualizado_por', 'criado_em', 'criado_por', 'busca'];
  v_antes jsonb;
  v_depois jsonb;
  v_mudancas jsonb;
  v_acao text;
begin
  if tg_op <> 'INSERT' then
    v_antes := to_jsonb(old) - v_ignorar;
  end if;
  if tg_op <> 'DELETE' then
    v_depois := to_jsonb(new) - v_ignorar;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, jsonb_build_object('de', o.value, 'para', n.value))
      into v_mudancas
      from jsonb_each(v_depois) n
      join jsonb_each(v_antes) o using (key)
     where n.value is distinct from o.value;
    if v_mudancas is null then
      return null;
    end if;
    v_acao := case when v_mudancas ? 'status' then 'mudou_status' else 'alterou' end;
    -- Descrição longa: fica só o registro de que mudou
    if v_mudancas ? 'descricao' then
      v_mudancas := v_mudancas || jsonb_build_object('descricao', 'alterada');
    end if;
  elsif tg_op = 'INSERT' then
    v_acao := 'criou';
    v_mudancas := v_depois - 'descricao';
  else
    v_acao := 'excluiu';
    v_mudancas := v_antes - 'descricao';
  end if;

  insert into public.atividades (ator, acao, entidade, entidade_id, mudancas)
  values (
    (select auth.uid()),
    v_acao,
    tg_table_name,
    left(coalesce(
      v_depois ->> 'veiculo_id', v_antes ->> 'veiculo_id',
      v_depois ->> 'id', v_antes ->> 'id',
      v_depois ->> 'prazo', v_antes ->> 'prazo'
    ), 80),
    v_mudancas
  );
  return null;
end;
$$;

/*
 * Mudança que aparece no site marca a vitrine pra ser gerada de novo
 * (processar_publicacao, a cada minuto). Na 057, mexer em foto ou status
 * deixava a página velha no ar por minutos.
 */
create or replace function public.marcar_publicacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visivel boolean := false;
  v_veiculo uuid;
begin
  if tg_level = 'STATEMENT' then
    v_visivel := true;
  elsif tg_table_name = 'veiculos' then
    -- Rascunho que continua rascunho não aparece no site
    if tg_op <> 'INSERT' then
      if old.status in ('publicado', 'reservado', 'vendido') then
        v_visivel := true;
      end if;
    end if;
    if tg_op <> 'DELETE' then
      if new.status in ('publicado', 'reservado', 'vendido') then
        v_visivel := true;
      end if;
    end if;
  elsif tg_table_name = 'veiculo_fotos' then
    if tg_op = 'DELETE' then
      v_veiculo := old.veiculo_id;
    else
      v_veiculo := new.veiculo_id;
    end if;
    select v.status in ('publicado', 'reservado', 'vendido') into v_visivel
      from public.veiculos v
     where v.id = v_veiculo;
    v_visivel := coalesce(v_visivel, false);
  end if;

  if v_visivel then
    -- Uma escrita por transação: as outras linhas da mesma transação já acham o pedido marcado
    update public.site_publicacao
       set pendente = true,
           pedido_em = now(),
           status = 'aguardando',
           tentativas = case when status = 'falhou' then 0 else tentativas end
     where id and (not pendente or pedido_em is distinct from now());
  end if;
  return null;
end;
$$;

create or replace function public.definir_atualizado_por()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_por := (select auth.uid());
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Parcela (seção 4.6)
-- ----------------------------------------------------------------------------

/*
 * parcela = preço × coeficiente, arredondada pra cima no múltiplo de
 * p_arredondar (R$ 10 por padrão). Reais inteiros.
 *   R$ 10.000 × 0,0537 = 537 → 540;  R$ 20.000 → 1.080;  R$ 25.000 → 1.350
 */
create or replace function public.calcular_parcela(p_preco_centavos bigint, p_coeficiente numeric, p_arredondar integer)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (ceil(p_preco_centavos::numeric / 100 * p_coeficiente / p_arredondar) * p_arredondar)::integer;
$$;

/*
 * Atualiza veiculos.parcela_exibida de uma moto (ou de todas, com null):
 * a parcela manual do dono, se houver; senão a calculada pelo coeficiente do
 * prazo padrão. Sem preço, sem parcela. Devolve quantas motos mudaram.
 */
create or replace function public.recalcular_parcela(p_veiculo uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coeficiente numeric;
  v_arredondar integer;
  v_mudaram integer;
begin
  select f.coeficiente, c.arredondar_para
    into v_coeficiente, v_arredondar
    from public.configuracoes c
    join public.financiamento_coeficientes f on f.prazo = c.prazo_padrao and f.ativo
   where c.id;

  update public.veiculos v
     set parcela_exibida = x.parcela
    from (
      select v2.id,
             case
               when p.veiculo_id is null then null
               else coalesce(p.parcela_manual, public.calcular_parcela(p.preco_centavos, v_coeficiente, v_arredondar))
             end as parcela
        from public.veiculos v2
        left join public.veiculos_precos p on p.veiculo_id = v2.id
       where p_veiculo is null or v2.id = p_veiculo
    ) x
   where v.id = x.id
     and v.parcela_exibida is distinct from x.parcela;

  get diagnostics v_mudaram = row_count;
  return v_mudaram;
end;
$$;

create or replace function public.precos_antes_gravar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.veiculo_id <> old.veiculo_id then
    raise exception 'campo_fixo:veiculo_id';
  end if;
  new.observacao := nullif(btrim(new.observacao), '');
  new.atualizado_em := now();
  new.atualizado_por := (select auth.uid());
  return new;
end;
$$;

create or replace function public.precos_depois_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalcular_parcela(old.veiculo_id);
  else
    perform public.recalcular_parcela(new.veiculo_id);
  end if;
  return null;
end;
$$;

create or replace function public.parcelas_recalcular_todas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recalcular_parcela(null);
  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- Veículos
-- ----------------------------------------------------------------------------

/* Transições permitidas (seção 4.7). Arquivar vale de qualquer estado. */
create or replace function public.transicao_permitida(p_de text, p_para text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(('{
    "rascunho":  ["publicado", "arquivado"],
    "publicado": ["reservado", "vendido", "rascunho", "arquivado"],
    "reservado": ["publicado", "vendido", "rascunho", "arquivado"],
    "vendido":   ["publicado", "arquivado"],
    "arquivado": ["rascunho"]
  }'::jsonb -> p_de) ? p_para, false);
$$;

/*
 * Antes de gravar a moto: campos fixos, ficha que vem do modelo, transição de
 * status com o que falta pra publicar, slug na primeira publicação, limite de
 * destaques e a coluna de busca. Roda como quem gravou (as políticas valem).
 */
create or replace function public.veiculos_antes_gravar()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_marca text;
  v_modelo text;
  v_categoria text;
  v_cilindrada smallint;
  v_limite smallint;
  v_destaques integer;
  v_ano_max integer := extract(year from (now() at time zone 'America/Bahia'))::integer + 1;
  -- Mudança só nestas colunas não conta como edição (não mexe na marca de edição)
  v_fora_da_edicao constant text[] := array['parcela_exibida', 'busca', 'ordem', 'atualizado_em', 'atualizado_por'];
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id then
      raise exception 'campo_fixo:id';
    end if;
    if old.slug is not null and new.slug is distinct from old.slug then
      raise exception 'slug_fixo';
    end if;
    new.criado_em := old.criado_em;
    new.criado_por := old.criado_por;
  else
    -- Toda moto nasce rascunho, sem slug, parcela, datas ou destaque
    if new.status <> 'rascunho' then
      raise exception 'status_inicial_invalido';
    end if;
    new.slug := null;
    new.parcela_exibida := null;
    new.publicado_em := null;
    new.vendido_em := null;
    new.destaque := false;
    new.criado_em := now();
    new.criado_por := (select auth.uid());
  end if;

  -- Texto: sem espaço sobrando, vazio vira nulo
  new.versao := nullif(btrim(new.versao), '');
  new.descricao := nullif(btrim(new.descricao), '');

  -- Ficha que vem do modelo quando ficou em branco
  if new.modelo_id is not null then
    select ma.nome, mo.nome, mo.categoria, mo.cilindrada
      into v_marca, v_modelo, v_categoria, v_cilindrada
      from public.modelos mo
      join public.marcas ma on ma.id = mo.marca_id
     where mo.id = new.modelo_id;
    new.categoria := coalesce(new.categoria, v_categoria);
    new.cilindrada := coalesce(new.cilindrada, v_cilindrada);
  end if;

  if new.ano_fabricacao > v_ano_max then
    raise exception 'ano_invalido';
  end if;

  -- Status: só as transições permitidas, e pra ir pro ar precisa de capa
  if tg_op = 'UPDATE' and new.status <> old.status then
    if not public.transicao_permitida(old.status, new.status) then
      raise exception 'transicao_invalida:%:%', old.status, new.status;
    end if;
    if new.status in ('publicado', 'reservado') then
      if not exists (select 1 from public.veiculo_fotos f where f.veiculo_id = new.id) then
        raise exception 'publicacao_incompleta:capa';
      end if;
      if new.condicao = 'seminova' and new.km = 0 then
        raise exception 'publicacao_incompleta:km';
      end if;
    end if;
    if new.status = 'vendido' then
      new.vendido_em := now();
    elsif old.status = 'vendido' then
      new.vendido_em := null;
    end if;
  end if;

  if new.status in ('publicado', 'reservado', 'vendido') then
    new.publicado_em := coalesce(new.publicado_em, now());
    -- Slug: marca-modelo-versao-ano-codigo, criado uma vez. O código no fim
    -- garante que dois endereços nunca coincidem.
    if new.slug is null then
      new.slug := rtrim(left(public.slug_de(concat_ws(' ', v_marca, v_modelo, new.versao, new.ano_modelo)), 80), '-')
                  || '-' || new.codigo;
    end if;
  end if;

  -- Destaque: só moto no ar, e no máximo o limite das configurações. A trava
  -- serializa dois salvamentos simultâneos (na 057 os dois passavam do limite).
  if new.status not in ('publicado', 'reservado') then
    new.destaque := false;
  elsif new.destaque and (tg_op = 'INSERT' or not old.destaque) then
    perform pg_advisory_xact_lock(hashtext('central_motos:destaques'));
    select c.limite_destaques into v_limite from public.configuracoes c where c.id;
    select count(*) into v_destaques
      from public.veiculos v
     where v.destaque and v.status in ('publicado', 'reservado') and v.id <> new.id;
    if v_destaques >= coalesce(v_limite, 8) then
      raise exception 'limite_destaques:%', coalesce(v_limite, 8);
    end if;
  end if;

  -- Busca sem acento: marca, modelo, versão, anos, condição, cor, tipo, cilindrada e código
  new.busca := public.sem_acento(concat_ws(' ',
    v_marca, v_modelo, new.versao, new.ano_fabricacao, new.ano_modelo,
    case new.condicao when '0km' then '0km zero nova' when 'seminova' then 'seminova usada' end,
    new.cor,
    replace(new.categoria, '-', ' '),
    case when new.cilindrada is not null then new.cilindrada || 'cc' end,
    'cm-' || lpad(new.codigo::text, 4, '0'),
    new.codigo
  ));

  if tg_op = 'UPDATE' then
    if (to_jsonb(new) - v_fora_da_edicao) is distinct from (to_jsonb(old) - v_fora_da_edicao) then
      new.atualizado_em := now();
      new.atualizado_por := (select auth.uid());
    else
      new.atualizado_em := old.atualizado_em;
      new.atualizado_por := old.atualizado_por;
    end if;
  else
    new.atualizado_em := now();
    new.atualizado_por := new.criado_por;
  end if;

  return new;
end;
$$;

/* Marca ou modelo renomeado: refaz a busca das motos dele (o gatilho acima recalcula). */
create or replace function public.catalogo_depois_renomear()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'modelos' then
    update public.veiculos set busca = '' where modelo_id = new.id;
  else
    update public.veiculos v
       set busca = ''
      from public.modelos mo
     where mo.id = v.modelo_id and mo.marca_id = new.id;
  end if;
  return null;
end;
$$;

/*
 * Moto no ar precisa de capa: apagar a última foto de uma moto publicada ou
 * reservada é recusado (tire do ar antes). O gatilho roda no fim do comando,
 * então um DELETE de várias fotos é conferido no estado final.
 */
create or replace function public.fotos_depois_excluir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.veiculos v where v.id = old.veiculo_id and v.status in ('publicado', 'reservado'))
     and not exists (select 1 from public.veiculo_fotos f where f.veiculo_id = old.veiculo_id) then
    raise exception 'capa_obrigatoria';
  end if;
  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- Gatilhos
-- ----------------------------------------------------------------------------

create trigger veiculos_antes_gravar
  before insert or update on public.veiculos
  for each row execute function public.veiculos_antes_gravar();
create trigger veiculos_auditar
  after insert or update or delete on public.veiculos
  for each row execute function public.auditar();
create trigger veiculos_publicacao
  after insert or update or delete on public.veiculos
  for each row execute function public.marcar_publicacao();

create trigger veiculos_precos_antes_gravar
  before insert or update on public.veiculos_precos
  for each row execute function public.precos_antes_gravar();
create trigger veiculos_precos_auditar
  after insert or update or delete on public.veiculos_precos
  for each row execute function public.auditar();
create trigger veiculos_precos_parcela
  after insert or update or delete on public.veiculos_precos
  for each row execute function public.precos_depois_gravar();

create trigger veiculo_fotos_auditar
  after insert or update or delete on public.veiculo_fotos
  for each row execute function public.auditar();
create trigger veiculo_fotos_capa
  after delete on public.veiculo_fotos
  for each row execute function public.fotos_depois_excluir();
create trigger veiculo_fotos_publicacao
  after insert or update or delete on public.veiculo_fotos
  for each row execute function public.marcar_publicacao();

create trigger financiamento_coeficientes_autoria
  before insert or update on public.financiamento_coeficientes
  for each row execute function public.definir_atualizado_por();
create trigger financiamento_coeficientes_auditar
  after insert or update or delete on public.financiamento_coeficientes
  for each row execute function public.auditar();
-- Trocar o coeficiente recalcula todas as parcelas num UPDATE (e o site republica)
create trigger financiamento_coeficientes_parcelas
  after insert or update or delete on public.financiamento_coeficientes
  for each statement execute function public.parcelas_recalcular_todas();

create trigger configuracoes_autoria
  before update on public.configuracoes
  for each row execute function public.definir_atualizado_por();
create trigger configuracoes_auditar
  after update on public.configuracoes
  for each row execute function public.auditar();
create trigger configuracoes_parcelas
  after update of prazo_padrao, arredondar_para on public.configuracoes
  for each statement execute function public.parcelas_recalcular_todas();
create trigger configuracoes_publicacao
  after update on public.configuracoes
  for each statement execute function public.marcar_publicacao();

create trigger lojas_auditar
  after insert or update or delete on public.lojas
  for each row execute function public.auditar();
create trigger lojas_publicacao
  after insert or update or delete on public.lojas
  for each statement execute function public.marcar_publicacao();

create trigger entregas_auditar
  after insert or update or delete on public.entregas
  for each row execute function public.auditar();
create trigger entregas_publicacao
  after insert or update or delete on public.entregas
  for each statement execute function public.marcar_publicacao();

create trigger marcas_auditar
  after insert or update or delete on public.marcas
  for each row execute function public.auditar();
create trigger marcas_renomear
  after update of nome on public.marcas
  for each row when (old.nome is distinct from new.nome)
  execute function public.catalogo_depois_renomear();
create trigger modelos_auditar
  after insert or update or delete on public.modelos
  for each row execute function public.auditar();
create trigger modelos_renomear
  after update of nome on public.modelos
  for each row when (old.nome is distinct from new.nome)
  execute function public.catalogo_depois_renomear();

create trigger perfis_auditar
  after insert or update or delete on public.perfis
  for each row execute function public.auditar();

-- ----------------------------------------------------------------------------
-- Funções do painel (rodam com a sessão de quem chamou: as políticas valem)
-- ----------------------------------------------------------------------------

/*
 * Marca de edição da moto, a trava do formulário: a hora em que a ficha ou o
 * preço mudou por último. O formulário guarda a marca ao abrir e devolve ao
 * salvar (salvar_veiculo recusa se ela mudou no meio).
 */
create or replace function public.editado_em_veiculo(p_veiculo uuid)
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select greatest(v.atualizado_em, coalesce(p.atualizado_em, '-infinity'::timestamptz))
    from public.veiculos v
    left join public.veiculos_precos p on p.veiculo_id = v.id
   where v.id = p_veiculo;
$$;

/* "+ Nova moto": o rascunho nasce na hora, pra as fotos já poderem subir. */
create or replace function public.criar_rascunho()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_codigo integer;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  insert into public.veiculos (status) values ('rascunho') returning id, codigo into v_id, v_codigo;
  return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'editado_em', public.editado_em_veiculo(v_id));
end;
$$;

/*
 * O que falta pra moto ir pro ar, em códigos que o painel traduz:
 * capa, modelo, ano, condicao, km (seminova com 0 km), cor, categoria, preco.
 */
create or replace function public.pendencias_publicacao(p_veiculo uuid)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (select 1 from public.veiculo_fotos f where f.veiculo_id = v.id) then 'capa' end,
    case when v.modelo_id is null then 'modelo' end,
    case when v.ano_fabricacao is null or v.ano_modelo is null then 'ano' end,
    case when v.condicao is null then 'condicao' end,
    case when v.condicao = 'seminova' and v.km = 0 then 'km' end,
    case when v.cor is null then 'cor' end,
    case when v.categoria is null then 'categoria' end,
    case when v.parcela_exibida is null then 'preco' end
  ], null)
  from public.veiculos v
  where v.id = p_veiculo;
$$;

/*
 * Grava a ficha e o preço numa transação. Recusa se a moto mudou desde que o
 * formulário abriu (p_editado_em): duas pessoas editando a mesma moto.
 *
 * p_dados: { modelo_id, versao (ESDD, CBS...), ano_fabricacao, ano_modelo, condicao, km, cor,
 *   cilindrada, categoria, combustivel, partida, freio, cambio, final_placa,
 *   ipva_pago_ate, unico_dono, manual_chave, revisada, so_transferir,
 *   aceita_troca, descricao, destaque,
 *   preco: { preco_centavos, parcela_manual, custo_centavos, observacao } }
 * Campo ausente fica como está; campo presente e vazio é apagado. O status não
 * muda aqui (alterar_status). O servidor valida o formato antes (Zod).
 */
create or replace function public.salvar_veiculo(p_id uuid, p_dados jsonb, p_editado_em timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d jsonb := p_dados;
  v_preco jsonb := p_dados -> 'preco';
  v_editado_em timestamptz;
  v_codigo integer;
  v_parcela integer;
  v_status text;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if d is null or jsonb_typeof(d) <> 'object' then
    raise exception 'dados_invalidos';
  end if;

  perform 1 from public.veiculos where id = p_id for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;
  v_editado_em := public.editado_em_veiculo(p_id);
  -- Em milissegundos: o navegador não guarda o microssegundo do Postgres
  if p_editado_em is null
     or date_trunc('milliseconds', v_editado_em) <> date_trunc('milliseconds', p_editado_em) then
    raise exception 'conflito_edicao';
  end if;

  update public.veiculos set
    modelo_id      = case when d ? 'modelo_id'      then nullif(d ->> 'modelo_id', '')::integer         else modelo_id end,
    versao         = case when d ? 'versao'         then d ->> 'versao'                                 else versao end,
    ano_fabricacao = case when d ? 'ano_fabricacao' then nullif(d ->> 'ano_fabricacao', '')::smallint   else ano_fabricacao end,
    ano_modelo     = case when d ? 'ano_modelo'     then nullif(d ->> 'ano_modelo', '')::smallint       else ano_modelo end,
    condicao       = case when d ? 'condicao'       then nullif(d ->> 'condicao', '')                   else condicao end,
    km             = case when d ? 'km'             then coalesce(nullif(d ->> 'km', '')::integer, 0)   else km end,
    cor            = case when d ? 'cor'            then nullif(d ->> 'cor', '')                        else cor end,
    cilindrada     = case when d ? 'cilindrada'     then nullif(d ->> 'cilindrada', '')::smallint       else cilindrada end,
    categoria      = case when d ? 'categoria'      then nullif(d ->> 'categoria', '')                  else categoria end,
    combustivel    = case when d ? 'combustivel'    then coalesce(nullif(d ->> 'combustivel', ''), 'gasolina') else combustivel end,
    partida        = case when d ? 'partida'        then nullif(d ->> 'partida', '')                    else partida end,
    freio          = case when d ? 'freio'          then nullif(d ->> 'freio', '')                      else freio end,
    cambio         = case when d ? 'cambio'         then coalesce(nullif(d ->> 'cambio', ''), 'manual') else cambio end,
    final_placa    = case when d ? 'final_placa'    then nullif(d ->> 'final_placa', '')::smallint      else final_placa end,
    ipva_pago_ate  = case when d ? 'ipva_pago_ate'  then nullif(d ->> 'ipva_pago_ate', '')::smallint    else ipva_pago_ate end,
    unico_dono     = case when d ? 'unico_dono'     then coalesce((d ->> 'unico_dono')::boolean, false)    else unico_dono end,
    manual_chave   = case when d ? 'manual_chave'   then coalesce((d ->> 'manual_chave')::boolean, false)  else manual_chave end,
    revisada       = case when d ? 'revisada'       then coalesce((d ->> 'revisada')::boolean, false)      else revisada end,
    so_transferir  = case when d ? 'so_transferir'  then coalesce((d ->> 'so_transferir')::boolean, false) else so_transferir end,
    aceita_troca   = case when d ? 'aceita_troca'   then coalesce((d ->> 'aceita_troca')::boolean, true)   else aceita_troca end,
    descricao      = case when d ? 'descricao'      then d ->> 'descricao'                              else descricao end,
    destaque       = case when d ? 'destaque'       then coalesce((d ->> 'destaque')::boolean, false)   else destaque end
  where id = p_id;

  -- Preço: só o painel vê. Vazio apaga o preço (e a parcela some junto).
  if jsonb_typeof(v_preco) = 'object' then
    if nullif(v_preco ->> 'preco_centavos', '') is null then
      delete from public.veiculos_precos where veiculo_id = p_id;
    else
      insert into public.veiculos_precos as vp (veiculo_id, preco_centavos, parcela_manual, custo_centavos, observacao)
      values (
        p_id,
        (v_preco ->> 'preco_centavos')::bigint,
        nullif(v_preco ->> 'parcela_manual', '')::integer,
        nullif(v_preco ->> 'custo_centavos', '')::bigint,
        nullif(btrim(v_preco ->> 'observacao'), '')
      )
      on conflict (veiculo_id) do update set
        preco_centavos = excluded.preco_centavos,
        parcela_manual = excluded.parcela_manual,
        custo_centavos = excluded.custo_centavos,
        observacao = excluded.observacao
      where (vp.preco_centavos, vp.parcela_manual, vp.custo_centavos, vp.observacao)
            is distinct from (excluded.preco_centavos, excluded.parcela_manual, excluded.custo_centavos, excluded.observacao);
    end if;
  end if;

  select v.codigo, v.parcela_exibida, v.status into v_codigo, v_parcela, v_status
    from public.veiculos v where v.id = p_id;
  return jsonb_build_object(
    'id', p_id,
    'codigo', v_codigo,
    'status', v_status,
    'parcela_exibida', v_parcela,
    'editado_em', public.editado_em_veiculo(p_id)
  );
end;
$$;

/*
 * Muda o status pelas transições permitidas. Pra ir pro ar, devolve de uma vez
 * tudo o que falta (publicacao_incompleta:capa,preco).
 */
create or replace function public.alterar_status(p_veiculo uuid, p_status text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_atual text;
  v_pendencias text[];
  v public.veiculos;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select status into v_atual from public.veiculos where id = p_veiculo for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;

  if v_atual is distinct from p_status then
    if not public.transicao_permitida(v_atual, p_status) then
      raise exception 'transicao_invalida:%:%', v_atual, p_status;
    end if;
    if p_status in ('publicado', 'reservado') then
      v_pendencias := public.pendencias_publicacao(p_veiculo);
      if cardinality(v_pendencias) > 0 then
        raise exception 'publicacao_incompleta:%', array_to_string(v_pendencias, ',');
      end if;
    end if;
    update public.veiculos set status = p_status where id = p_veiculo;
  end if;

  select * into v from public.veiculos where id = p_veiculo;
  return jsonb_build_object(
    'status', v.status,
    'slug', v.slug,
    'codigo', v.codigo,
    'publicado_em', v.publicado_em,
    'vendido_em', v.vendido_em,
    'editado_em', public.editado_em_veiculo(p_veiculo)
  );
end;
$$;

/*
 * Cadastra fotos que já subiram pro Storage (o servidor gerou os ids e as URLs
 * assinadas). Trava a moto, confere o teto de 20 e numera depois das que já
 * existem. p_fotos: [{ id, larguras, formato, largura_original,
 * altura_original, foco_x, foco_y, cor_media }]
 */
create or replace function public.adicionar_fotos(p_veiculo uuid, p_fotos jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existentes integer;
  v_novas integer;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if p_fotos is null or jsonb_typeof(p_fotos) <> 'array' or jsonb_array_length(p_fotos) = 0 then
    raise exception 'fotos_invalidas';
  end if;
  v_novas := jsonb_array_length(p_fotos);

  perform 1 from public.veiculos where id = p_veiculo for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;

  -- Posições contínuas antes de somar as novas
  update public.veiculo_fotos f
     set posicao = t.nova
    from (
      select id, (row_number() over (order by posicao, criado_em, id) - 1)::smallint as nova
        from public.veiculo_fotos
       where veiculo_id = p_veiculo
    ) t
   where f.id = t.id and f.posicao <> t.nova;

  select count(*) into v_existentes from public.veiculo_fotos where veiculo_id = p_veiculo;
  if v_existentes + v_novas > 20 then
    raise exception 'limite_fotos:%', greatest(20 - v_existentes, 0);
  end if;

  insert into public.veiculo_fotos (
    id, veiculo_id, posicao, larguras, formato, largura_original, altura_original, foco_x, foco_y, cor_media
  )
  select (f ->> 'id')::uuid,
         p_veiculo,
         (v_existentes + n - 1)::smallint,
         array(select x::smallint from jsonb_array_elements_text(f -> 'larguras') as x),
         f ->> 'formato',
         (f ->> 'largura_original')::integer,
         (f ->> 'altura_original')::integer,
         coalesce((f ->> 'foco_x')::smallint, 50),
         coalesce((f ->> 'foco_y')::smallint, 50),
         f ->> 'cor_media'
    from jsonb_array_elements(p_fotos) with ordinality as t(f, n);

  return v_existentes + v_novas;
end;
$$;

/* Nova ordem das fotos: p_ids com todas as fotos da moto, a capa primeiro. */
create or replace function public.reordenar_fotos(p_veiculo uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  perform 1 from public.veiculos where id = p_veiculo for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;

  if (select coalesce(array_agg(f.id order by f.id), '{}') from public.veiculo_fotos f where f.veiculo_id = p_veiculo)
     is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_ids) as x) then
    raise exception 'fotos_divergentes';
  end if;

  -- O índice único adiável deixa trocar posições no mesmo comando
  update public.veiculo_fotos f
     set posicao = (t.n - 1)::smallint
    from unnest(p_ids) with ordinality as t(id, n)
   where f.id = t.id and f.veiculo_id = p_veiculo and f.posicao <> t.n - 1;
end;
$$;

/*
 * Apaga fotos e renumera as que ficam (se a capa sair, a próxima vira capa).
 * Devolve as apagadas, pro servidor remover os arquivos do Storage.
 */
create or replace function public.excluir_fotos(p_veiculo uuid, p_ids uuid[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_excluidas jsonb;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  perform 1 from public.veiculos where id = p_veiculo for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;

  with apagadas as (
    delete from public.veiculo_fotos
     where veiculo_id = p_veiculo and id = any (p_ids)
    returning id, larguras, formato, og
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'larguras', larguras, 'formato', formato, 'og', og)), '[]'::jsonb)
    into v_excluidas
    from apagadas;

  update public.veiculo_fotos f
     set posicao = t.nova
    from (
      select id, (row_number() over (order by posicao, criado_em, id) - 1)::smallint as nova
        from public.veiculo_fotos
       where veiculo_id = p_veiculo
    ) t
   where f.id = t.id and f.posicao <> t.nova;

  return v_excluidas;
end;
$$;

/* Ordem manual do estoque ("organizar ordem"): a primeira da lista vem primeiro. */
create or replace function public.reordenar_veiculos(p_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_mudaram integer;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if cardinality(p_ids) > 1000 then
    raise exception 'lista_grande_demais';
  end if;
  update public.veiculos v
     set ordem = t.n
    from unnest(p_ids) with ordinality as t(id, n)
   where v.id = t.id and v.ordem <> t.n;
  get diagnostics v_mudaram = row_count;
  return v_mudaram;
end;
$$;

/*
 * Exclusão definitiva: rascunho que nunca foi pro ar, ou moto arquivada. Moto
 * que já foi publicada passa pelo arquivo antes (erro humano não vira perda).
 * Devolve as fotos, pro servidor apagar os arquivos.
 */
create or replace function public.excluir_veiculo(p_veiculo uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_publicado_em timestamptz;
  v_fotos jsonb;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  select status, publicado_em into v_status, v_publicado_em
    from public.veiculos where id = p_veiculo for update;
  if not found then
    raise exception 'veiculo_inexistente';
  end if;
  if not (v_status = 'arquivado' or (v_status = 'rascunho' and v_publicado_em is null)) then
    raise exception 'exclusao_bloqueada';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'larguras', f.larguras, 'formato', f.formato, 'og', f.og)), '[]'::jsonb)
    into v_fotos
    from public.veiculo_fotos f
   where f.veiculo_id = p_veiculo;

  delete from public.veiculos where id = p_veiculo;
  return jsonb_build_object('veiculo_id', p_veiculo, 'fotos', v_fotos);
end;
$$;

/* Troca a loja principal (a dos botões gerais de WhatsApp). */
create or replace function public.definir_loja_principal(p_loja smallint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;
  if not exists (select 1 from public.lojas where id = p_loja and ativa) then
    raise exception 'loja_inexistente';
  end if;
  update public.lojas set principal = false where principal and id <> p_loja;
  update public.lojas set principal = true where id = p_loja and not principal;
end;
$$;

/* Números do início do painel numa chamada só. */
create or replace function public.painel_resumo()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_inicio_mes timestamptz := date_trunc('month', now() at time zone 'America/Bahia') at time zone 'America/Bahia';
  v_desde date := (now() at time zone 'America/Bahia')::date - 6;
  v_resumo jsonb;
begin
  if not public.pode_gerenciar() then
    raise exception 'sem_permissao' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'no_ar', count(*) filter (where status = 'publicado'),
    'reservadas', count(*) filter (where status = 'reservado'),
    'rascunhos', count(*) filter (where status = 'rascunho'),
    'vendidas_mes', count(*) filter (where status = 'vendido' and vendido_em >= v_inicio_mes),
    'destaques', count(*) filter (where destaque)
  )
    into v_resumo
    from public.veiculos;

  v_resumo := v_resumo || jsonb_build_object(
    -- Sem foto, sem preço (rascunho já com modelo) ou no ar há mais de 60 dias
    'atencao', coalesce((
      select jsonb_agg(a order by a.motivo, a.codigo)
        from (
          select v.id, v.codigo, v.status, v.ano_modelo, ma.nome as marca, mo.nome as modelo,
                 case
                   when not exists (select 1 from public.veiculo_fotos f where f.veiculo_id = v.id) then 'sem_foto'
                   when not exists (select 1 from public.veiculos_precos p where p.veiculo_id = v.id) then 'sem_preco'
                   else 'parada'
                 end as motivo
            from public.veiculos v
            left join public.modelos mo on mo.id = v.modelo_id
            left join public.marcas ma on ma.id = mo.marca_id
           where (v.status in ('publicado', 'reservado')
                  or (v.status = 'rascunho' and v.modelo_id is not null))
             and (not exists (select 1 from public.veiculo_fotos f where f.veiculo_id = v.id)
                  or not exists (select 1 from public.veiculos_precos p where p.veiculo_id = v.id)
                  or (v.status = 'publicado' and v.publicado_em < now() - interval '60 days'))
           order by v.codigo
           limit 30
        ) a
    ), '[]'::jsonb),
    -- Cliques no WhatsApp dos últimos 7 dias, por moto
    'cliques_7_dias', coalesce((
      select jsonb_agg(c order by c.cliques desc, c.codigo)
        from (
          select v.id, v.codigo, v.ano_modelo, ma.nome as marca, mo.nome as modelo, sum(cw.cliques)::integer as cliques
            from public.cliques_whatsapp_dia cw
            join public.veiculos v on v.id = cw.veiculo_id
            left join public.modelos mo on mo.id = v.modelo_id
            left join public.marcas ma on ma.id = mo.marca_id
           where cw.dia >= v_desde
           group by v.id, v.codigo, v.ano_modelo, ma.nome, mo.nome
           order by cliques desc
           limit 10
        ) c
    ), '[]'::jsonb),
    'cliques_total_7_dias', (
      select coalesce(sum(cw.cliques), 0)::integer from public.cliques_whatsapp_dia cw where cw.dia >= v_desde
    ),
    'site', (
      select jsonb_build_object(
        'status', s.status, 'pendente', s.pendente, 'publicado_em', s.publicado_em,
        'disparado_em', s.disparado_em, 'erro', s.erro
      )
        from public.site_publicacao s
       where s.id
    )
  );
  return v_resumo;
end;
$$;

-- ----------------------------------------------------------------------------
-- Funções que só o servidor chama (chave secreta)
-- ----------------------------------------------------------------------------

/* true = pode seguir; false = passou do limite na janela. Falha fechado. */
create or replace function public.consumir_limite(p_chave text, p_maximo integer, p_janela_segundos integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz := now();
  v_contagem integer;
begin
  if p_chave is null or p_maximo is null or p_janela_segundos is null then
    return false;
  end if;

  insert into public.limites as l (chave, contagem, janela_inicio)
  values (left(p_chave, 200), 1, v_agora)
  on conflict (chave) do update
     set contagem = case when l.janela_inicio < v_agora - make_interval(secs => p_janela_segundos) then 1 else l.contagem + 1 end,
         janela_inicio = case when l.janela_inicio < v_agora - make_interval(secs => p_janela_segundos) then v_agora else l.janela_inicio end
  returning contagem into v_contagem;

  if random() < 0.02 then
    delete from public.limites where janela_inicio < v_agora - interval '1 day';
  end if;

  return v_contagem <= p_maximo;
end;
$$;

/*
 * Soma um clique no WhatsApp (rota /api/w). A chave é o HMAC do IP feito no
 * servidor: o banco nunca vê o IP. Moto fora do ar ou origem inválida não
 * contam; acima de 30 cliques por hora do mesmo aparelho, também não.
 */
create or replace function public.registrar_clique(p_codigo integer, p_loja smallint, p_origem text, p_chave text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_veiculo uuid;
  v_loja smallint := p_loja;
begin
  if p_chave is null or char_length(p_chave) not between 16 and 128 then
    return false;
  end if;
  if not public.consumir_limite('clique:' || p_chave, 30, 3600) then
    return false;
  end if;

  if p_codigo is not null then
    select v.id into v_veiculo
      from public.veiculos v
     where v.codigo = p_codigo
       and (v.status in ('publicado', 'reservado')
            or (v.status = 'vendido' and v.vendido_em > now() - interval '30 days'));
    if v_veiculo is null then
      return false;
    end if;
  end if;

  if v_loja is not null and not exists (select 1 from public.lojas l where l.id = v_loja and l.ativa) then
    v_loja := null;
  end if;

  begin
    insert into public.cliques_whatsapp_dia as c (dia, veiculo_id, loja_id, origem, cliques)
    values ((now() at time zone 'America/Bahia')::date, v_veiculo, v_loja, p_origem, 1)
    on conflict (dia, veiculo_id, loja_id, origem) do update set cliques = c.cliques + 1;
  exception when check_violation or not_null_violation then
    return false;
  end;
  return true;
end;
$$;

/* Entrada no painel, certa ou errada, vai pra atividades (o servidor chama). */
create or replace function public.registrar_acesso(p_usuario uuid, p_email text, p_resultado text, p_ip text, p_agente text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_resultado is null or p_resultado not in (
    'entrou', 'senha_errada', 'codigo_errado', 'bloqueado', 'saiu', 'saiu_de_todos',
    'convite_aceito', 'senha_trocada', 'celular_cadastrado', 'celular_removido'
  ) then
    raise exception 'resultado_invalido';
  end if;
  insert into public.atividades (ator, acao, entidade, entidade_id, mudancas)
  values (
    p_usuario,
    'acesso_' || p_resultado,
    'acesso',
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'email', left(lower(p_email), 120),
      'ip', left(p_ip, 60),
      'agente', left(p_agente, 200)
    ))
  );
end;
$$;
