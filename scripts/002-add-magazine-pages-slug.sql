-- Migração 002: adiciona slug (pasta no CDN) e pages (nº de páginas) às revistas.
-- O app funciona sem rodar isto (deriva o slug do pdf_url e descobre as páginas
-- por sondagem), mas preencher estas colunas deixa o leitor mais rápido e preciso.

alter table public.magazines
  add column if not exists slug text,
  add column if not exists pages integer;

-- Preenche o slug das revistas existentes a partir do nome do arquivo PDF
-- (ex.: ".../revista1.pdf" -> "revista1"). Ajuste manualmente se a pasta no
-- CDN tiver outro nome.
update public.magazines
set slug = regexp_replace(split_part(pdf_url, '/', -1), '\.[a-zA-Z0-9]+$', '')
where slug is null and pdf_url is not null;
