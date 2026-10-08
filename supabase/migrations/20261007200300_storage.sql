-- ============================================================================
-- Central Motos · arquivos (arquitetura.md, seções 4.8, 5 e 6.4)
--
-- Dois buckets públicos só pra leitura pela URL: a CDN entrega o arquivo sem
-- passar pela RLS. Nenhuma política em storage.objects, então:
--   - ninguém lista os buckets pela API (na 057 dava pra listar);
--   - ninguém sobe arquivo com a chave pública nem com a sessão do painel.
-- A escrita é só por URL assinada que o servidor do painel emite, depois de
-- conferir a sessão e o caminho (regex), um arquivo por URL.
--
-- Caminhos (saem dos ids do banco, nunca de texto digitado):
--   veiculos/{veiculo_id}/{foto_id}-{largura}.{webp|jpg}  e  .../{foto_id}-og.jpg
--   entregas/{entrega_id}-{largura}.{webp|jpg}
--
-- 2 MB por arquivo e só WebP e JPEG: o navegador do lojista reencoda cada foto
-- antes de subir (o original nunca sobe) e o bucket recusa o resto.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('veiculos', 'veiculos', true, 2097152, array['image/webp', 'image/jpeg']),
  ('entregas', 'entregas', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
