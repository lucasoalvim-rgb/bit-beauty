-- ============================================================================
-- Promoção "leve mais, pague menos" (preço por unidade ao atingir uma quantidade)
-- Rode este SQL no SQL Editor do seu projeto Supabase.
-- ============================================================================

-- 1) Novas colunas na tabela de produtos
alter table products
  add column if not exists bulk_min_qty integer,
  add column if not exists bulk_unit_price numeric(10, 2);

comment on column products.bulk_min_qty is
  'Quantidade mínima para o preço promocional (ex.: 3 = leve 3). NULL = sem promoção por quantidade.';
comment on column products.bulk_unit_price is
  'Preço por unidade quando o cliente leva bulk_min_qty unidades.';

-- ============================================================================
-- 2) Exemplos para visualizar as badges na loja (opcional — pode ajustar/remover)
-- ============================================================================

-- Leve mais, pague menos: 3 produtos aleatórios com "leve 3, pague 85% por unidade"
update products
set bulk_min_qty   = 3,
    bulk_unit_price = round(price * 0.85, 2)
where id in (
  select id from products order by random() limit 3
);

-- Desconto simples (preço antigo riscado): 3 outros produtos com ~20% off
update products
set old_price = round(price / 0.80, 2)
where bulk_min_qty is null
  and old_price is null
  and id in (
    select id from products where bulk_min_qty is null order by random() limit 3
  );
