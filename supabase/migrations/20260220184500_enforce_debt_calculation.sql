-- Fix parse_currency_sql to avoid breaking types.ts generation with newlines
DROP FUNCTION IF EXISTS public.parse_currency_sql(text);

CREATE OR REPLACE FUNCTION public.parse_currency_sql(val_str text)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF val_str IS NULL OR TRIM(val_str) = '' THEN
        RETURN 0;
    END IF;
    val_str := REGEXP_REPLACE(val_str, '[^0-9.,-]', '', 'g');
    IF val_str ~ '^[0-9.]+,[0-9]+$' THEN
        RETURN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC);
    ELSIF val_str ~ '^[0-9,]+$' THEN
        RETURN CAST(REPLACE(val_str, ',', '.') AS NUMERIC);
    ELSE
        RETURN CAST(val_str AS NUMERIC);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$function$;

-- Re-create the function to forcefully apply the exact (Sale - Discount) - Paid logic
CREATE OR REPLACE FUNCTION public.update_debito_historico_order(p_pedido_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $function$
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

    -- 3. Resolve Timestamp
    BEGIN
        IF v_data_e_hora_str IS NOT NULL AND TRIM(v_data_e_hora_str) <> '' THEN
            v_final_timestamp := v_data_e_hora_str::TIMESTAMP;
        ELSIF v_data_acerto_str IS NOT NULL AND TRIM(v_data_acerto_str) <> '' THEN
             IF v_hora_acerto IS NOT NULL AND TRIM(v_hora_acerto) <> '' THEN
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
    IF v_desconto_val > 1 THEN
        v_desconto_val := v_desconto_val / 100;
    END IF;
    
    v_desconto_final := v_valor_venda * v_desconto_val;

    -- 5. Calculate Debt exactly as requested: (Sale - Discount) - Paid
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
$function$;

-- Update the refresh function to ensure the exact same logic is applied globally
CREATE OR REPLACE FUNCTION public.refresh_debitos_historico()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM debitos_historico;

    INSERT INTO debitos_historico (
        pedido_id,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        cliente_codigo,
        cliente_nome,
        rota,
        valor_venda,
        desconto,
        saldo_a_pagar,
        valor_pago,
        debito
    )
    WITH vendas AS (
        SELECT 
            "NÚMERO DO PEDIDO" as pedido_id,
            MAX(
                CASE 
                    WHEN "DATA E HORA" IS NOT NULL AND TRIM("DATA E HORA") <> '' THEN "DATA E HORA"::timestamp 
                    WHEN "DATA DO ACERTO" IS NOT NULL AND TRIM("DATA DO ACERTO") <> '' THEN "DATA DO ACERTO"::timestamp 
                    ELSE NULL 
                END
            ) as data_acerto,
            MAX("HORA DO ACERTO") as hora_acerto,
            MAX("FUNCIONÁRIO") as vendedor_nome,
            MAX("CÓDIGO DO CLIENTE") as cliente_id,
            MAX("CLIENTE") as cliente_nome,
            MAX("DESCONTO POR GRUPO") as desconto_str,
            SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
        GROUP BY "NÚMERO DO PEDIDO"
    ),
    vendas_calc AS (
        SELECT 
            v.*,
            CASE 
                WHEN public.parse_currency_sql(v.desconto_str) > 0 THEN
                    CASE
                        WHEN public.parse_currency_sql(v.desconto_str) > 1 THEN
                             v.valor_venda * (public.parse_currency_sql(v.desconto_str) / 100.0)
                        ELSE
                             v.valor_venda * public.parse_currency_sql(v.desconto_str)
                    END
                ELSE 0
            END as desconto_calc
        FROM vendas v
    ),
    pagamentos AS (
        SELECT 
            venda_id,
            SUM(valor_pago) as valor_pago
        FROM "RECEBIMENTOS"
        GROUP BY venda_id
    ),
    client_info AS (
        SELECT "CODIGO" as cliente_id, "GRUPO ROTA" as rota
        FROM "CLIENTES"
    )
    SELECT
        vc.pedido_id,
        vc.data_acerto,
        vc.hora_acerto,
        vc.vendedor_nome,
        vc.cliente_id,
        vc.cliente_nome,
        client_info.rota,
        vc.valor_venda,
        vc.desconto_calc,
        (vc.valor_venda - vc.desconto_calc),
        COALESCE(p.valor_pago, 0),
        GREATEST(0, (vc.valor_venda - vc.desconto_calc) - COALESCE(p.valor_pago, 0))
    FROM vendas_calc vc
    LEFT JOIN pagamentos p ON vc.pedido_id = p.venda_id
    LEFT JOIN client_info ON vc.cliente_id = client_info.cliente_id;
END;
$function$;

-- Execute the refresh immediately to bring everything up to date with the new formula
SELECT public.refresh_debitos_historico();
