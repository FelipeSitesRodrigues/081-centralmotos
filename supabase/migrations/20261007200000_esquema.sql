-- ============================================================================
-- Central Motos · esquema do banco (arquitetura.md, seção 4)
--
-- Princípios:
-- 1. Tudo fechado por padrão. Toda tabela tem RLS e as permissões de anon e
--    authenticated são revogadas e devolvidas coluna por coluna
--    (20261007200200_acesso.sql). Coluna nova não fica pública por acidente.
-- 2. Dado privado mora em tabela separada: preço, custo e observação ficam em
--    veiculos_precos, que o visitante não alcança por nenhum caminho.
-- 3. Regra de negócio no banco (20261007200100_regras.sql), não só na tela.
-- 4. Dinheiro em centavos (bigint), parcela em reais inteiros, nada de float.
-- 5. Data mostrada sempre no fuso America/Bahia (UTC-3 o ano todo).
-- ============================================================================

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ----------------------------------------------------------------------------
-- Utilitários
-- ----------------------------------------------------------------------------

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

/*
 * Minúsculas e sem acento. IMMUTABLE de propósito: o unaccent puro é STABLE
 * e não serve pra coluna gerada nem índice (lição da 057).
 */
create or replace function public.sem_acento(p_texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_texto));
$$;

/* "Honda Pop 110i ES 2024" vira "honda-pop-110i-es-2024". */
create or replace function public.slug_de(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(public.sem_acento(coalesce(p_texto, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ----------------------------------------------------------------------------
-- Perfis: quem entra no painel
-- ----------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  -- v1: todo mundo é admin. "vendedor" fica pronto pra quando a loja pedir.
  papel text not null default 'admin' check (papel in ('admin', 'vendedor')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Lojas: Irecê e LEM. As duas aparecem no site; a principal recebe os botões
-- gerais de WhatsApp (cabeçalho, hero, botão flutuante).
-- ----------------------------------------------------------------------------

create table public.lojas (
  id smallint generated always as identity primary key,
  nome text not null check (char_length(nome) between 3 and 60),
  cidade text not null check (char_length(cidade) between 2 and 60),
  uf char(2) not null default 'BA' check (uf ~ '^[A-Z]{2}$'),
  endereco text not null check (char_length(endereco) between 5 and 160),
  bairro text check (char_length(bairro) <= 60),
  cep text check (cep ~ '^\d{5}-\d{3}$'),
  -- Só dígitos, com 55 e DDD: 5574999936265
  whatsapp text not null check (whatsapp ~ '^55\d{10,11}$'),
  maps_url text check (char_length(maps_url) <= 500 and maps_url ~ '^https://'),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  /*
   * [{ "dias": [1, 2, 3, 4, 5], "abre": "08:00", "fecha": "18:00" }, ...]
   * dias de 0 (domingo) a 6 (sábado). O painel valida o formato (Zod).
   */
  horario jsonb check (horario is null or (jsonb_typeof(horario) = 'array' and jsonb_array_length(horario) <= 7)),
  principal boolean not null default false,
  posicao smallint not null default 0,
  ativa boolean not null default true,
  atualizado_em timestamptz not null default now()
);

create unique index lojas_uma_principal_idx on public.lojas (principal) where principal;

create trigger lojas_atualizado_em
  before update on public.lojas
  for each row execute function public.definir_atualizado_em();

-- ----------------------------------------------------------------------------
-- Marcas e modelos (semente em supabase/seed/marcas-modelos.sql)
-- ----------------------------------------------------------------------------

create table public.marcas (
  id smallint generated always as identity primary key,
  nome text not null unique check (char_length(nome) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ativa boolean not null default true
);

create table public.modelos (
  id integer generated always as identity primary key,
  marca_id smallint not null references public.marcas (id) on delete restrict,
  nome text not null check (char_length(nome) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  categoria text not null check (categoria in (
    'motoneta', 'street', 'naked', 'trail', 'big-trail', 'scooter',
    'custom', 'esportiva', 'touring', 'eletrica'
  )),
  -- null nas elétricas
  cilindrada smallint check (cilindrada between 49 and 2500),
  ativa boolean not null default true,
  constraint modelos_slug_por_marca unique (marca_id, slug)
);

create index modelos_marca_idx on public.modelos (marca_id);

-- ----------------------------------------------------------------------------
-- Veículos
-- ----------------------------------------------------------------------------

create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  -- "CM-0042" no WhatsApp, no painel e no fim do endereço da página
  codigo integer generated always as identity unique,
  -- Nasce na primeira publicação e nunca muda: é o endereço que circula no WhatsApp
  slug text unique check (char_length(slug) <= 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  /*
   * O rascunho nasce vazio, porque as fotos sobem antes de escolher o modelo
   * (arquitetura.md, seção 13). Fora do rascunho e do arquivo, a ficha básica
   * é obrigatória (veiculos_completa).
   */
  modelo_id integer references public.modelos (id) on delete restrict,
  versao text check (char_length(versao) <= 60),
  ano_fabricacao smallint check (ano_fabricacao between 1980 and 2100),
  ano_modelo smallint check (ano_modelo between 1980 and 2101),
  condicao text check (condicao in ('0km', 'seminova')),
  km integer not null default 0 check (km between 0 and 500000),
  cor text check (cor in (
    'preta', 'branca', 'vermelha', 'azul', 'prata', 'cinza',
    'amarela', 'verde', 'laranja', 'marrom', 'roxa', 'outra'
  )),
  -- Vêm do modelo quando ficam em branco; o painel deixa editar
  cilindrada smallint check (cilindrada between 49 and 2500),
  categoria text check (categoria in (
    'motoneta', 'street', 'naked', 'trail', 'big-trail', 'scooter',
    'custom', 'esportiva', 'touring', 'eletrica'
  )),
  combustivel text not null default 'gasolina' check (combustivel in ('gasolina', 'flex', 'eletrica')),
  partida text check (partida in ('eletrica', 'pedal', 'eletrica_pedal')),
  freio text check (freio in ('tambor', 'disco', 'cbs', 'abs')),
  cambio text not null default 'manual' check (cambio in ('manual', 'automatico')),
  -- Só o último dígito da placa
  final_placa smallint check (final_placa between 0 and 9),
  ipva_pago_ate smallint check (ipva_pago_ate between 2000 and 2100),
  unico_dono boolean not null default false,
  manual_chave boolean not null default false,
  revisada boolean not null default false,
  -- "Documento em dia, só transferir"
  so_transferir boolean not null default false,
  aceita_troca boolean not null default true,
  -- Texto puro, nunca HTML: a vitrine escapa na saída
  descricao text check (char_length(descricao) <= 2000),
  -- Status único: dois campos ("publicado" e "status") permitiriam "publicado e vendido"
  status text not null default 'rascunho' check (status in ('rascunho', 'publicado', 'reservado', 'vendido', 'arquivado')),
  destaque boolean not null default false,
  ordem integer not null default 0 check (ordem between 0 and 100000),
  -- Reais inteiros, calculada pelo banco a partir do preço privado (recalcular_parcela)
  parcela_exibida integer check (parcela_exibida > 0),
  -- Sem acento, mantida por gatilho (veiculos_antes_gravar)
  busca text not null default '',
  publicado_em timestamptz,
  vendido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  atualizado_por uuid references auth.users (id) on delete set null,
  constraint veiculos_anos check (
    ano_modelo is null or ano_fabricacao is null
    or ano_modelo between ano_fabricacao and ano_fabricacao + 1
  ),
  constraint veiculos_0km_ate_50 check (condicao is distinct from '0km' or km <= 50),
  constraint veiculos_completa check (
    status in ('rascunho', 'arquivado')
    or (modelo_id is not null and ano_fabricacao is not null and ano_modelo is not null
        and condicao is not null and cor is not null and categoria is not null and slug is not null)
  ),
  constraint veiculos_parcela_no_ar check (status not in ('publicado', 'reservado') or parcela_exibida is not null),
  constraint veiculos_vendida_tem_data check (status <> 'vendido' or vendido_em is not null)
);

create index veiculos_vitrine_idx on public.veiculos (status, destaque desc, ordem, publicado_em desc)
  where status in ('publicado', 'reservado');
create index veiculos_parcela_idx on public.veiculos (status, parcela_exibida)
  where status in ('publicado', 'reservado');
create index veiculos_ano_idx on public.veiculos (status, ano_modelo)
  where status in ('publicado', 'reservado');
create index veiculos_km_idx on public.veiculos (status, km)
  where status in ('publicado', 'reservado');
create index veiculos_categoria_idx on public.veiculos (categoria)
  where status in ('publicado', 'reservado');
create index veiculos_modelo_idx on public.veiculos (modelo_id);
create index veiculos_vendidos_idx on public.veiculos (vendido_em) where status = 'vendido';
create index veiculos_busca_idx on public.veiculos using gin (busca extensions.gin_trgm_ops);

/* PRIVADO: nenhuma política pra anon, nenhuma coluna liberada. */
create table public.veiculos_precos (
  veiculo_id uuid primary key references public.veiculos (id) on delete cascade,
  preco_centavos bigint not null check (preco_centavos between 100000 and 100000000),
  -- Parcela digitada pelo dono quando o banco dele cota diferente
  parcela_manual integer check (parcela_manual between 50 and 30000),
  custo_centavos bigint check (custo_centavos between 0 and 100000000),
  observacao text check (char_length(observacao) <= 1000),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);

create table public.veiculo_fotos (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos (id) on delete cascade,
  -- 0 é a capa. As funções de foto mantêm as posições contínuas
  posicao smallint not null check (posicao between 0 and 19),
  /*
   * Larguras reais geradas no navegador, em ordem: {480,960,1440}, ou menos
   * quando a foto é menor (nunca amplia). Nenhum caminho é gravado; no bucket
   * "veiculos" os arquivos saem dos ids:
   *   {veiculo_id}/{id}-{largura}.{webp|jpg}   e   {veiculo_id}/{id}-og.jpg
   */
  larguras smallint[] not null check (
    cardinality(larguras) between 1 and 3 and 320 <= all (larguras) and 2048 >= all (larguras)
  ),
  formato text not null check (formato in ('webp', 'jpeg')),
  -- Proporção pra reservar o espaço na tela (zero CLS)
  largura_original integer not null check (largura_original between 1 and 20000),
  altura_original integer not null check (altura_original between 1 and 20000),
  -- Centro do enquadramento nos cards (foto em pé num card deitado)
  foco_x smallint not null default 50 check (foco_x between 0 and 100),
  foco_y smallint not null default 50 check (foco_y between 0 and 100),
  -- Fundo enquanto a foto carrega
  cor_media text check (cor_media ~ '^#[0-9a-f]{6}$'),
  -- Existe {id}-og.jpg (1200x630) desta foto, pra prévia no WhatsApp
  og boolean not null default false,
  criado_em timestamptz not null default now(),
  -- Adiável: reordenar troca posições numa transação só
  constraint veiculo_fotos_posicao_unica unique (veiculo_id, posicao) deferrable initially deferred
);

-- ----------------------------------------------------------------------------
-- Financiamento e configurações
-- ----------------------------------------------------------------------------

create table public.financiamento_coeficientes (
  prazo smallint primary key check (prazo in (12, 18, 24, 36, 48, 60)),
  coeficiente numeric(7, 6) not null check (coeficiente between 0.02 and 0.15),
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);

create trigger financiamento_coeficientes_atualizado_em
  before update on public.financiamento_coeficientes
  for each row execute function public.definir_atualizado_em();

-- v1: só 48x. 0,0537 cai dentro das três faixas que o dono passou (seção 4.6)
insert into public.financiamento_coeficientes (prazo, coeficiente) values (48, 0.053700);

create table public.configuracoes (
  id boolean primary key default true check (id),
  prazo_padrao smallint not null default 48 references public.financiamento_coeficientes (prazo),
  arredondar_para smallint not null default 10 check (arredondar_para in (1, 5, 10)),
  limite_destaques smallint not null default 8 check (limite_destaques between 0 and 24),
  -- Faixa opcional no topo do site
  aviso_site text check (char_length(aviso_site) <= 140),
  instagram text check (instagram ~ '^[a-z0-9._]{1,30}$'),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);

create trigger configuracoes_atualizado_em
  before update on public.configuracoes
  for each row execute function public.definir_atualizado_em();

insert into public.configuracoes (id, instagram) values (true, 'centralmotoslem');

-- ----------------------------------------------------------------------------
-- Entregas: fotos reais de clientes ("Quem compra, aprova")
-- ----------------------------------------------------------------------------

create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  posicao smallint not null default 0 check (posicao between 0 and 200),
  publicada boolean not null default true,
  legenda text check (char_length(legenda) <= 80),
  -- Mesmo esquema de arquivos das motos, no bucket "entregas": {id}-{largura}.{webp|jpg}
  larguras smallint[] not null check (
    cardinality(larguras) between 1 and 3 and 320 <= all (larguras) and 2048 >= all (larguras)
  ),
  formato text not null check (formato in ('webp', 'jpeg')),
  largura_original integer not null check (largura_original between 1 and 20000),
  altura_original integer not null check (altura_original between 1 and 20000),
  foco_x smallint not null default 50 check (foco_x between 0 and 100),
  foco_y smallint not null default 50 check (foco_y between 0 and 100),
  cor_media text check (cor_media ~ '^#[0-9a-f]{6}$'),
  criado_em timestamptz not null default now()
);

create index entregas_vitrine_idx on public.entregas (posicao) where publicada;

-- ----------------------------------------------------------------------------
-- Cliques no WhatsApp: só a contagem por dia, nenhum dado de quem clicou
-- ----------------------------------------------------------------------------

create table public.cliques_whatsapp_dia (
  id bigint generated always as identity primary key,
  dia date not null,
  -- Moto excluída leva junto a contagem dela (um "set null" bateria no índice único)
  veiculo_id uuid references public.veiculos (id) on delete cascade,
  loja_id smallint references public.lojas (id) on delete restrict,
  origem text not null check (origem in (
    'card', 'pagina_moto', 'hero', 'cabecalho', 'flutuante', 'troca', 'financiamento',
    'duvidas', 'lojas', 'rodape', 'estoque_vazio', 'vendida', 'outro'
  )),
  cliques integer not null default 0 check (cliques >= 0),
  -- Postgres 15+: nulo conta como igual, então o mesmo dia e origem somam no mesmo registro
  constraint cliques_whatsapp_dia_unico unique nulls not distinct (dia, veiculo_id, loja_id, origem)
);

create index cliques_whatsapp_dia_idx on public.cliques_whatsapp_dia (dia desc);
create index cliques_whatsapp_veiculo_idx on public.cliques_whatsapp_dia (veiculo_id, dia desc);

-- ----------------------------------------------------------------------------
-- Auditoria: quem mudou o quê. Só gatilhos e funções do banco escrevem aqui.
-- ----------------------------------------------------------------------------

create table public.atividades (
  id bigint generated always as identity primary key,
  ator uuid references auth.users (id) on delete set null,
  acao text not null check (char_length(acao) between 1 and 40),
  entidade text not null check (char_length(entidade) between 1 and 40),
  entidade_id text check (char_length(entidade_id) <= 80),
  mudancas jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index atividades_criado_em_idx on public.atividades (criado_em desc);
create index atividades_entidade_idx on public.atividades (entidade, entidade_id, criado_em desc);

-- ----------------------------------------------------------------------------
-- Limite de tentativas (login do painel, cliques). Chave em HMAC, feita no servidor.
-- ----------------------------------------------------------------------------

create table public.limites (
  chave text primary key check (char_length(chave) <= 200),
  contagem integer not null,
  janela_inicio timestamptz not null
);

-- ----------------------------------------------------------------------------
-- Fila de republicação da vitrine (linha única; seção 8.2)
-- ----------------------------------------------------------------------------

create table public.site_publicacao (
  id boolean primary key default true check (id),
  -- Há mudança visível que ainda não foi pro site
  pendente boolean not null default false,
  -- Última mudança visível (os 45 s de espera contam daqui)
  pedido_em timestamptz,
  -- Última chamada ao deploy hook da Vercel
  disparado_em timestamptz,
  -- Id do pedido no pg_net, pra conferir a resposta da Vercel
  pedido_net bigint,
  -- Último build que terminou e avisou o banco (registrar_publicacao)
  publicado_em timestamptz,
  status text not null default 'em_dia' check (status in (
    'em_dia', 'aguardando', 'publicando', 'falhou', 'sem_hook', 'teto_diario'
  )),
  erro text check (char_length(erro) <= 500),
  tentativas smallint not null default 0,
  disparos_hoje smallint not null default 0,
  dia_disparos date
);

insert into public.site_publicacao (id) values (true);
