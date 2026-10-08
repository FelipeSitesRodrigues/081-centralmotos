-- ============================================================================
-- Central Motos · painel só com e-mail e senha
--
-- Decisão do Felipe em 2026-10-07: sem o código do celular. O login é criado
-- por nós (scripts/acesso.mjs) e entregue ao dono. eh_admin() deixa de exigir a
-- sessão aal2 e continua exigindo o perfil admin ativo e o login de menos de 7
-- dias neste aparelho. As políticas e funções continuam chamando eh_admin(),
-- então nada mais muda.
-- ============================================================================

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
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

revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;
