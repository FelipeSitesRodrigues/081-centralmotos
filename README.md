# Central Motos

Vitrine de motos (HTML estático gerado do banco) e painel do lojista (Next 16), sobre um
Supabase em São Paulo. O plano completo está em `sites/081-Central Motos/arquitetura.md`, no
repositório do MazyOS; a memória do projeto, no `memoria.md` da mesma pasta.

## Segredos

Nada com valor sobe pro Git (`.gitignore` ignora todo `.env*`).

| Arquivo | O que tem | Quem usa |
|---|---|---|
| `.env.local` | URL e chave pública (anon) do Supabase | build da vitrine, painel, testes |
| `.env.supabase.local` | ref do projeto e token da Management API | só os scripts de banco desta máquina |

## Banco

```bash
npm run banco:migrar   # aplica as migrations pendentes (supabase/migrations)
npm run banco:semear   # marcas, modelos e as duas lojas (não duplica)
npm run banco:tipos    # compartilhado/tipos/banco.ts
npm run banco:testar   # regras (transação desfeita) + RLS como visitante
```

- As migrations entram pela Management API, uma transação por arquivo. O histórico do Supabase
  guarda o nome do arquivo inteiro, e é por ele que `banco:migrar` sabe o que falta.
- `supabase/testes/regras.sql` roda como dono do banco e desfaz tudo no fim.
- `supabase/testes/rls.mjs` cria motos de teste, tenta ler e escrever como visitante (PostgREST,
  Storage, GraphQL) e apaga tudo no fim.
- Cada rodada dos testes gasta números de código (CM-0001...): sequência não volta com rollback.
  No lançamento, sem moto de verdade cadastrada, reiniciar com
  `alter table public.veiculos alter column codigo restart with 1`.
