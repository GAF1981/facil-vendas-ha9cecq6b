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
    v_saldo_a_pagar_raw NUMERIC := 0;
    
    v_cliente_id BIGINT;
    v_cliente_nome TEXT;
    v_vendedor_nome TEXT;
    v_data_acerto_str TEXT;
    v_hora_acerto TEXT;
    v_data_e_hora_str TEXT;
    v_final_timestamp TIMESTAMP;
    v_rota TEXT;
    v_rota_id INTEGER;
    
BEGIN
    -- 1. Calculate Total Paid
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- 2. Fetch Order Data
    SELECT 
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        SUM("VALOR DEVIDO"),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("FUNCIONÁRIO"),
        MAX("DATA DO ACERTO"),
        MAX("HORA DO ACERTO"),
        MAX("DATA E HORA"),
        MAX("DESCONTO POR GRUPO")
    INTO 
        v_valor_venda,
        v_saldo_a_pagar_raw,
        v_cliente_id,
        v_cliente_nome,
        v_vendedor_nome,
        v_data_acerto_str,
        v_hora_acerto,
        v_data_e_hora_str,
        v_desconto_str
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    IF v_cliente_id IS NULL THEN
        RETURN;
    END IF;

    -- 3. Resolve Timestamp with Explicit Casting
    BEGIN
        IF v_data_e_hora_str IS NOT NULL AND v_data_e_hora_str <> '' THEN
            v_final_timestamp := v_data_e_hora_str::TIMESTAMP;
        ELSIF v_data_acerto_str IS NOT NULL AND v_data_acerto_str <> '' THEN
             IF v_hora_acerto IS NOT NULL AND v_hora_acerto <> '' THEN
                v_final_timestamp := (v_data_acerto_str || ' ' || v_hora_acerto)::TIMESTAMP;
             ELSE
                v_final_timestamp := v_data_acerto_str::TIMESTAMP;
             END IF;
        ELSE
            v_final_timestamp := NOW();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_final_timestamp := NOW();
    END;

    -- 4. Calculate Discount
    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    -- Check if it is a percentage (e.g. "5" meaning 5% or "0.05")
    -- In this system, typically > 1 is percentage (10 = 10%), <= 1 is factor (0.1 = 10%)
    IF v_desconto_val > 1 THEN
        v_desconto_val := v_desconto_val / 100;
    END IF;
    
    v_desconto_final := v_valor_venda * v_desconto_val;

    -- 5. Calculate Debt
    -- We calculate saldo_a_pagar derived from sales - discount
    -- But we also respect explicit VALOR DEVIDO if relevant, usually we trust calculation for consistency
    v_debito := (v_valor_venda - v_desconto_final) - v_total_pago;
    
    IF v_debito < 0.01 THEN v_debito := 0; END IF;

    -- 6. Get Rota Info
    SELECT rota_id INTO v_rota_id FROM "ROTA_ITEMS" WHERE cliente_id = v_cliente_id LIMIT 1;
    SELECT "GRUPO ROTA" INTO v_rota FROM "CLIENTES" WHERE "CODIGO" = v_cliente_id;

    -- 7. Upsert
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
        saldo_a_pagar,
        rota_id,
        rota
    ) VALUES (
        p_pedido_id,
        v_cliente_id,
        v_cliente_nome,
        v_valor_venda,
        v_total_pago,
        v_debito,
        v_final_timestamp,
        v_hora_acerto,
        v_vendedor_nome,
        v_desconto_final,
        (v_valor_venda - v_desconto_final),
        v_rota_id,
        v_rota
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_venda = EXCLUDED.valor_venda,
        desconto = EXCLUDED.desconto,
        data_acerto = EXCLUDED.data_acerto,
        hora_acerto = EXCLUDED.hora_acerto,
        vendedor_nome = EXCLUDED.vendedor_nome,
        rota_id = EXCLUDED.rota_id,
        rota = EXCLUDED.rota;
        
END;
$$;
