-- Fixes the "column unnest does not exist" error in cleanup_selected_duplicates
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
        -- FIX: Use proper alias 'o' for unnest to avoid "column unnest does not exist"
        FOR v_order_id IN SELECT DISTINCT o FROM unnest(v_orders) AS o WHERE o IS NOT NULL
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
