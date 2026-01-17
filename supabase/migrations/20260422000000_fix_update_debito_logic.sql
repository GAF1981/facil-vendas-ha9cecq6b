CREATE OR REPLACE FUNCTION update_debito_historico_order(p_pedido_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_pago NUMERIC;
    v_valor_venda NUMERIC;
    v_desconto NUMERIC;
    v_debito NUMERIC;
BEGIN
    -- Calculate total paid for this order from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- Get current sales info from debitos_historico
    SELECT valor_venda, COALESCE(desconto, 0)
    INTO v_valor_venda, v_desconto
    FROM debitos_historico
    WHERE pedido_id = p_pedido_id;

    -- If record does not exist in debitos_historico, we cannot update it
    IF v_valor_venda IS NULL THEN
        RETURN;
    END IF;

    -- Calculate new debt (Remaining Balance)
    -- Logic: (Sale Value - Discount) - Total Paid
    v_debito := (v_valor_venda - v_desconto) - v_total_pago;

    -- Ensure non-negative
    IF v_debito < 0 THEN
        v_debito := 0;
    END IF;

    -- Update debitos_historico
    UPDATE debitos_historico
    SET 
        valor_pago = v_total_pago,
        debito = v_debito
    WHERE pedido_id = p_pedido_id;

END;
$$;
