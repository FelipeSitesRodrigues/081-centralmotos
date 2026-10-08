-- Projeto novo do Supabase não dá permissão de tabela ao service_role por padrão;
-- sem isso o acesso.mjs cria o login mas não grava o perfil de administrador.
grant select, insert, update on public.perfis to service_role;
