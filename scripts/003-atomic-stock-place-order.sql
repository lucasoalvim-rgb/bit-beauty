-- ============================================================================
-- Pedido com baixa de estoque ATÔMICA (sem venda duplicada / sem estoque)
-- Rode este SQL no SQL Editor do seu projeto Supabase.
--
-- Por que isso importa:
--   Dois clientes podem ter o MESMO produto na sacola ao mesmo tempo. Sem trava,
--   ambos passariam na finalização e o estoque ficaria negativo (venda duplicada).
--   Aqui usamos `SELECT ... FOR UPDATE` para travar a linha do produto: o segundo
--   pedido espera o primeiro concluir e só então lê o estoque já atualizado.
--   Se não houver estoque suficiente, o pedido inteiro é abortado (transação faz
--   rollback) e nada é cobrado nem baixado.
-- ============================================================================

-- Recria a função com a MESMA assinatura usada pela aplicação (lib/actions.ts).
-- DROP + CREATE evita conflito de tipo de retorno em recriações futuras.
drop function if exists public.place_order(
  text, text, text, text, text, text, integer, numeric, numeric, jsonb
);

create function public.place_order(
  p_customer_name text,
  p_phone text,
  p_cep text,
  p_street text,
  p_number text,
  p_payment_method text,
  p_installments integer,
  p_delivery_fee numeric,
  p_fee numeric,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_order_id  uuid;
  v_subtotal  numeric := 0;
  v_total     numeric;
  v_item      jsonb;
  v_pid       text;
  v_qty       integer;
  v_price     numeric;
  v_name      text;
  v_stock     integer;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED'
      using message = 'Sessão expirada. Entre novamente para finalizar a compra.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using message = 'Sua sacola está vazia.';
  end if;

  -- 1) TRAVA cada produto e valida o estoque de forma atômica.
  --    O FOR UPDATE serializa pedidos concorrentes do mesmo item.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := v_item->>'product_id';
    v_qty := greatest(coalesce((v_item->>'qty')::integer, 0), 0);
    if v_qty = 0 then
      continue;
    end if;

    select stock, price, name
      into v_stock, v_price, v_name
      from products
     where id = v_pid
     for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND'
        using message = 'Um item da sua sacola não está mais disponível.';
    end if;

    if v_stock < v_qty then
      raise exception 'OUT_OF_STOCK'
        using message = format(
          'Estoque insuficiente para "%s": restam %s unidade(s).', v_name, v_stock
        );
    end if;

    v_subtotal := v_subtotal + (v_price * v_qty);
  end loop;

  v_total := v_subtotal + coalesce(p_fee, 0) + coalesce(p_delivery_fee, 0);

  -- 2) Cria o pedido (user_id = dono da sessão).
  insert into orders (
    user_id, customer_name, phone, cep, street, number,
    payment_method, installments, subtotal, fee, delivery_fee, total, status
  ) values (
    v_user_id, p_customer_name, p_phone, p_cep, p_street, p_number,
    p_payment_method, p_installments, v_subtotal, p_fee, p_delivery_fee, v_total, 'pending'
  )
  returning id into v_order_id;

  -- 3) Itens + baixa de estoque. As linhas já estão travadas (passo 1), então o
  --    UPDATE condicional `stock >= qty` é uma salvaguarda extra.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := v_item->>'product_id';
    v_qty := greatest(coalesce((v_item->>'qty')::integer, 0), 0);
    if v_qty = 0 then
      continue;
    end if;

    select price, name into v_price, v_name from products where id = v_pid;

    insert into order_items (order_id, product_id, product_name, unit_price, qty)
    values (v_order_id, v_pid, v_name, v_price, v_qty);

    update products
       set stock = stock - v_qty
     where id = v_pid
       and stock >= v_qty;

    if not found then
      raise exception 'OUT_OF_STOCK'
        using message = format('Estoque insuficiente para "%s".', v_name);
    end if;
  end loop;

  return v_order_id;
end;
$$;

-- Mantém o acesso de execução para usuários autenticados (igual ao fluxo atual).
grant execute on function public.place_order(
  text, text, text, text, text, text, integer, numeric, numeric, jsonb
) to authenticated;
