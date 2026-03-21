-- Fix for order 864 and logic to automatically detect and cleanup duplicates
DO $$
BEGIN
    -- Immediate fix for order 864 client 590
    DELETE FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = 864
      AND "CÓDIGO DO CLIENTE" = 590
      AND "ID VENDA ITENS" NOT IN (
        SELECT MIN("ID VENDA ITENS")
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" = 864 AND "CÓDIGO DO CLIENTE" = 590
        GROUP BY "NÚMERO DO PEDIDO", "COD. PRODUTO"
      );

    DELETE FROM "RECEBIMENTOS"
    WHERE venda_id = 864
      AND id NOT IN (
        SELECT MIN(id)
        FROM "RECEBIMENTOS"
        WHERE venda_id = 864
        GROUP BY venda_id, forma_pagamento, valor_pago
      );

    PERFORM public.update_debito_historico_order(864);
END $$;

CREATE OR REPLACE FUNCTION public.get_route_duplicates(p_rota_id integer)
RETURNS TABLE (
    pedido_id bigint,
    cliente_nome text,
    tipo_duplicidade text,
    quantidade integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH pedidos_rota AS (
        SELECT bd."NÚMERO DO PEDIDO" as pid, bd."CLIENTE" as cname, bd."COD. PRODUTO" as prod
        FROM "BANCO_DE_DADOS" bd
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
        AND (
            (bd."DATA DO ACERTO" >= r.data_inicio::date AND (r.data_fim IS NULL OR bd."DATA DO ACERTO" <= r.data_fim::date))
            OR
            (bd."DATA E HORA" >= r.data_inicio AND (r.data_fim IS NULL OR bd."DATA E HORA" <= r.data_fim))
        )
    ),
    dup_items AS (
        SELECT pid, MAX(cname) as cname, (COUNT(*) - 1)::integer as qty
        FROM pedidos_rota
        GROUP BY pid, prod
        HAVING COUNT(*) > 1
    ),
    dup_payments AS (
        SELECT rec.venda_id as pid, MAX(c."NOME CLIENTE") as cname, (COUNT(*) - 1)::integer as qty
        FROM "RECEBIMENTOS" rec
        JOIN "CLIENTES" c ON c."CODIGO" = rec.cliente_id
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE (
            (rec.created_at >= r.data_inicio AND (r.data_fim IS NULL OR rec.created_at <= r.data_fim))
            OR rec.rota_id = p_rota_id
        )
        GROUP BY rec.venda_id, rec.forma_pagamento, rec.valor_pago
        HAVING COUNT(*) > 1
    )
    SELECT d.pid, d.cname, 'Itens do Pedido'::text, SUM(d.qty)::integer FROM dup_items d GROUP BY d.pid, d.cname
    UNION ALL
    SELECT p.pid, p.cname, 'Pagamentos (Recebimentos)'::text, SUM(p.qty)::integer FROM dup_payments p GROUP BY p.pid, p.cname;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_route_duplicates(p_rota_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_affected_items integer := 0;
    v_affected_payments integer := 0;
    v_order_id bigint;
BEGIN
    -- Delete duplicate items
    WITH dups AS (
        SELECT bd."ID VENDA ITENS" as id_to_delete
        FROM "BANCO_DE_DADOS" bd
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
        AND (
            (bd."DATA DO ACERTO" >= r.data_inicio::date AND (r.data_fim IS NULL OR bd."DATA DO ACERTO" <= r.data_fim::date))
            OR
            (bd."DATA E HORA" >= r.data_inicio AND (r.data_fim IS NULL OR bd."DATA E HORA" <= r.data_fim))
        )
        AND bd."ID VENDA ITENS" NOT IN (
            SELECT MIN(b2."ID VENDA ITENS")
            FROM "BANCO_DE_DADOS" b2
            WHERE b2."NÚMERO DO PEDIDO" = bd."NÚMERO DO PEDIDO"
            GROUP BY b2."NÚMERO DO PEDIDO", b2."COD. PRODUTO"
        )
    ),
    deleted_items AS (
        DELETE FROM "BANCO_DE_DADOS"
        WHERE "ID VENDA ITENS" IN (SELECT id_to_delete FROM dups)
        RETURNING "NÚMERO DO PEDIDO"
    )
    SELECT count(*) INTO v_affected_items FROM deleted_items;

    -- Delete duplicate payments
    WITH dups_pay AS (
        SELECT rec.id as id_to_delete
        FROM "RECEBIMENTOS" rec
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE (
            (rec.created_at >= r.data_inicio AND (r.data_fim IS NULL OR rec.created_at <= r.data_fim))
            OR rec.rota_id = p_rota_id
        )
        AND rec.id NOT IN (
            SELECT MIN(r2.id)
            FROM "RECEBIMENTOS" r2
            WHERE r2.venda_id = rec.venda_id
            GROUP BY r2.venda_id, r2.forma_pagamento, r2.valor_pago
        )
    ),
    deleted_payments AS (
        DELETE FROM "RECEBIMENTOS"
        WHERE id IN (SELECT id_to_delete FROM dups_pay)
        RETURNING venda_id
    )
    SELECT count(*) INTO v_affected_payments FROM deleted_payments;

    -- Recalculate debits for all affected orders in route
    FOR v_order_id IN
        SELECT DISTINCT "NÚMERO DO PEDIDO"
        FROM "BANCO_DE_DADOS" bd
        JOIN "ROTA" r ON r.id = p_rota_id
        WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
        AND (
            (bd."DATA DO ACERTO" >= r.data_inicio::date AND (r.data_fim IS NULL OR bd."DATA DO ACERTO" <= r.data_fim::date))
            OR
            (bd."DATA E HORA" >= r.data_inicio AND (r.data_fim IS NULL OR bd."DATA E HORA" <= r.data_fim))
        )
    LOOP
        PERFORM public.update_debito_historico_order(v_order_id);
    END LOOP;

    RETURN jsonb_build_object(
        'items_removed', v_affected_items,
        'payments_removed', v_affected_payments
    );
END;
$$;
