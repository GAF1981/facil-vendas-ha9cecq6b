-- Drop existing functions to resolve potential overloading ambiguity (int vs bigint)
DROP FUNCTION IF EXISTS update_debito_historico_order(integer);
DROP FUNCTION IF EXISTS update_debito_historico_order(bigint);

-- Create the robust version of the function
CREATE OR REPLACE FUNCTION update_debito_historico_order(p_pedido_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_pago NUMERIC := 0;
    v_valor_venda NUMERIC := 0;
    v_desconto_str TEXT;
    v_desconto_val NUMERIC := 0;
    v_desconto_final NUMERIC := 0;
    v_debito NUMERIC := 0;
    
    v_cliente_id BIGINT;
    v_cliente_nome TEXT;
    v_vendedor_nome TEXT;
    v_data_acerto_str TEXT;
    v_hora_acerto TEXT;
    
BEGIN
    -- 1. Calculate Total Paid from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- 2. Calculate Total Sales and Metadata from BANCO_DE_DADOS
    -- We aggregate the items to get the total value for the order
    SELECT 
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("FUNCIONÁRIO"),
        MAX("DATA DO ACERTO"),
        MAX("HORA DO ACERTO"),
        MAX("DESCONTO POR GRUPO")
    INTO 
        v_valor_venda,
        v_cliente_id,
        v_cliente_nome,
        v_vendedor_nome,
        v_data_acerto_str,
        v_hora_acerto,
        v_desconto_str
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    -- If no sales data found, we can't update or create debt history
    IF v_cliente_id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Calculate Discount
    -- Logic: If string contains %, parse number and divide by 100.
    -- If just number: if > 1 (e.g. 10), assume %, divide by 100. If <= 1, assume factor.
    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    
    IF v_desconto_val > 1 THEN
        v_desconto_val := v_desconto_val / 100;
    END IF;
    
    v_desconto_final := v_valor_venda * v_desconto_val;

    -- 4. Calculate Remaining Debt
    -- Debt = (Sales - Discount) - Total Paid
    v_debito := (v_valor_venda - v_desconto_final) - v_total_pago;
    
    -- Ensure debt is not negative (overpayment scenario handled by just showing 0 debt)
    IF v_debito < 0.01 THEN 
        v_debito := 0; 
    END IF;

    -- 5. UPSERT into debitos_historico
    -- This ensures that if the record doesn't exist, it is created.
    -- If it exists, it is updated with fresh values.
    INSERT INTO debitos_historico (
        pedido_id,
        cliente_codigo,
        cliente_nome,
        valor_venda,
        valor_pago,
        debito,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        desconto,
        saldo_a_pagar
    ) VALUES (
        p_pedido_id,
        v_cliente_id,
        v_cliente_nome,
        v_valor_venda,
        v_total_pago,
        v_debito,
        v_data_acerto_str,
        v_hora_acerto,
        v_vendedor_nome,
        v_desconto_final,
        (v_valor_venda - v_desconto_final)
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_venda = EXCLUDED.valor_venda,
        desconto = EXCLUDED.desconto,
        data_acerto = EXCLUDED.data_acerto, -- Update metadata too in case of correction
        vendedor_nome = EXCLUDED.vendedor_nome;
        
END;
$$;
