-- 1. Create detailed duplicate fetch function with specific rules for duplication
CREATE OR REPLACE FUNCTION public.get_route_duplicates_detailed(p_rota_id integer)
RETURNS TABLE(
    id_to_delete text,
    pedido_id bigint,
    cliente_nome text,
    tipo_duplicidade text,
    detalhes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    -- Duplicate Items (Same Order, Product, Quantity and Value)
    WITH pedidos_rota AS (
        SELECT bd."ID VENDA ITENS", bd."NÚMERO DO PEDIDO", bd."CLIENTE", bd."COD. PRODUTO", bd."MERCADORIA", bd."VALOR VENDIDO", bd."QUANTIDADE VENDIDA"
        FROM "BANCO_DE_DADOS" bd
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
        AND (
            (bd."DATA DO ACERTO" >= r.data_inicio::date AND (r.data_fim IS NULL OR bd."DATA DO ACERTO" <= r.data_fim::date))
            OR
            (bd."DATA E HORA" >= r.data_inicio AND (r.data_fim IS NULL OR bd."DATA E HORA" <= r.data_fim))
        )
    ),
    min_items AS (
        SELECT MIN("ID VENDA ITENS") as min_id
        FROM pedidos_rota
        GROUP BY "NÚMERO DO PEDIDO", "COD. PRODUTO", "QUANTIDADE VENDIDA", "VALOR VENDIDO"
        HAVING COUNT(*) > 1
    )
    SELECT
        'item_' || pr."ID VENDA ITENS" as id_to_delete,
        pr."NÚMERO DO PEDIDO" as pedido_id,
        pr."CLIENTE" as cliente_nome,
        'Item do Pedido'::text as tipo_duplicidade,
        'Produto: ' || COALESCE(pr."MERCADORIA", 'N/D') || ' | Qtd: ' || COALESCE(pr."QUANTIDADE VENDIDA", '0') || ' | Vl: R$ ' || COALESCE(pr."VALOR VENDIDO", '0') as detalhes
    FROM pedidos_rota pr
    WHERE pr."NÚMERO DO PEDIDO" IN (SELECT "NÚMERO DO PEDIDO" FROM pedidos_rota GROUP BY "NÚMERO DO PEDIDO", "COD. PRODUTO", "QUANTIDADE VENDIDA", "VALOR VENDIDO" HAVING COUNT(*) > 1)
      AND pr."ID VENDA ITENS" NOT IN (SELECT min_id FROM min_items)

    UNION ALL

    -- Duplicate Payments (Same Order, Method, Value and Due Date)
    WITH pay_rota AS (
        SELECT rec.id, rec.venda_id, c."NOME CLIENTE", rec.forma_pagamento, rec.valor_pago, rec.vencimento::date as venc
        FROM "RECEBIMENTOS" rec
        LEFT JOIN "CLIENTES" c ON c."CODIGO" = rec.cliente_id
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE (
            (rec.created_at >= r.data_inicio AND (r.data_fim IS NULL OR rec.created_at <= r.data_fim))
            OR rec.rota_id = p_rota_id
        )
    ),
    min_pays AS (
        SELECT MIN(id) as min_id
        FROM pay_rota
        GROUP BY venda_id, forma_pagamento, valor_pago, venc
        HAVING COUNT(*) > 1
    )
    SELECT
        'pay_' || pr.id as id_to_delete,
        pr.venda_id as pedido_id,
        pr."NOME CLIENTE" as cliente_nome,
        'Pagamento'::text as tipo_duplicidade,
        'Forma: ' || COALESCE(pr.forma_pagamento, 'N/D') || ' | Valor: R$ ' || pr.valor_pago::text || ' | Venc: ' || COALESCE(to_char(pr.venc, 'DD/MM/YYYY'), '-') as detalhes
    FROM pay_rota pr
    WHERE pr.venda_id IN (SELECT venda_id FROM pay_rota GROUP BY venda_id, forma_pagamento, valor_pago, venc HAVING COUNT(*) > 1)
      AND pr.id NOT IN (SELECT min_id FROM min_pays)
    
    ORDER BY pedido_id;
END;
$$;

-- 2. Create cleanup function that accepts a specific list of IDs to delete
CREATE OR REPLACE FUNCTION public.cleanup_selected_duplicates(p_ids text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_ids bigint[];
    v_pay_ids bigint[];
    v_affected_items integer := 0;
    v_affected_payments integer := 0;
    v_order_id bigint;
    v_orders bigint[] := ARRAY[]::bigint[];
BEGIN
    -- Extract items and payments IDs
    SELECT array_agg(REPLACE(id, 'item_', '')::bigint) INTO v_item_ids
    FROM unnest(p_ids) as id WHERE id LIKE 'item_%';

    SELECT array_agg(REPLACE(id, 'pay_', '')::bigint) INTO v_pay_ids
    FROM unnest(p_ids) as id WHERE id LIKE 'pay_%';

    -- Process Items
    IF v_item_ids IS NOT NULL AND array_length(v_item_ids, 1) > 0 THEN
        SELECT array_agg(DISTINCT "NÚMERO DO PEDIDO") INTO v_orders
        FROM "BANCO_DE_DADOS" WHERE "ID VENDA ITENS" = ANY(v_item_ids);
        
        DELETE FROM "BANCO_DE_DADOS" WHERE "ID VENDA ITENS" = ANY(v_item_ids);
        GET DIAGNOSTICS v_affected_items = ROW_COUNT;
    END IF;

    -- Process Payments
    IF v_pay_ids IS NOT NULL AND array_length(v_pay_ids, 1) > 0 THEN
        DECLARE
            v_more_orders bigint[];
        BEGIN
            SELECT array_agg(DISTINCT venda_id) INTO v_more_orders
            FROM "RECEBIMENTOS" WHERE id = ANY(v_pay_ids);
            
            IF v_more_orders IS NOT NULL THEN
                v_orders := array_cat(v_orders, v_more_orders);
            END IF;
        END;

        DELETE FROM "RECEBIMENTOS" WHERE id = ANY(v_pay_ids);
        GET DIAGNOSTICS v_affected_payments = ROW_COUNT;
    END IF;

    -- Update debts for all affected unique orders
    IF v_orders IS NOT NULL THEN
        FOR v_order_id IN SELECT DISTINCT unnest(v_orders) WHERE unnest IS NOT NULL
        LOOP
            PERFORM public.update_debito_historico_order(v_order_id);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'items_removed', v_affected_items,
        'payments_removed', v_affected_payments
    );
END;
$$;
