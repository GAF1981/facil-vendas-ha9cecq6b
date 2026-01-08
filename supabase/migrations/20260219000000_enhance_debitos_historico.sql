-- Add missing columns to debitos_historico if they don't exist
ALTER TABLE debitos_historico ADD COLUMN IF NOT EXISTS cliente_codigo INTEGER;
ALTER TABLE debitos_historico ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE debitos_historico ADD COLUMN IF NOT EXISTS rota TEXT;
ALTER TABLE debitos_historico ADD COLUMN IF NOT EXISTS desconto NUMERIC DEFAULT 0;
ALTER TABLE debitos_historico ADD COLUMN IF NOT EXISTS hora_acerto TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_debitos_historico_cliente_codigo ON debitos_historico(cliente_codigo);

-- Update the trigger function to populate new fields
CREATE OR REPLACE FUNCTION update_debito_historico_order(p_pedido_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_valor_venda NUMERIC;
    v_saldo_a_pagar NUMERIC;
    v_valor_pago NUMERIC;
    v_data_acerto TIMESTAMP;
    v_hora_acerto TEXT;
    v_vendedor_nome TEXT;
    v_rota_id INTEGER;
    v_cliente_id INTEGER;
    v_cliente_nome TEXT;
    v_rota TEXT;
    v_desconto_str TEXT;
    v_desconto_val NUMERIC;
    v_desconto_total NUMERIC := 0;
    v_prev_data TIMESTAMP;
    v_diff_days NUMERIC;
    v_media_mensal NUMERIC := 0;
BEGIN
    -- Aggregation from BANCO_DE_DADOS
    -- Note: We take MAX for text/date fields to pick a value (assuming consistent per order)
    SELECT
        MAX(CAST("DATA DO ACERTO" AS TIMESTAMP)),
        MAX("HORA DO ACERTO"),
        MAX("FUNCIONÁRIO"),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("DESCONTO POR GRUPO"),
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        SUM("VALOR DEVIDO")
    INTO
        v_data_acerto,
        v_hora_acerto,
        v_vendedor_nome,
        v_cliente_id,
        v_cliente_nome,
        v_desconto_str,
        v_valor_venda,
        v_saldo_a_pagar
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    IF v_cliente_id IS NULL THEN
        RETURN; -- Order not found
    END IF;

    -- Calculate Discount
    -- Logic: If discount string exists (e.g. '10%'), calculate amount.
    -- Or calculate difference if needed. Here we approximate based on User Story requirements.
    v_desconto_val := public.parse_currency_sql(REPLACE(v_desconto_str, '%', ''));
    IF v_desconto_val > 0 THEN
        IF v_desconto_val < 1 THEN -- decimal percentage
             v_desconto_total := v_valor_venda * v_desconto_val;
        ELSIF v_desconto_val <= 100 THEN -- integer percentage
             v_desconto_total := v_valor_venda * (v_desconto_val / 100.0);
        ELSE
             v_desconto_total := v_desconto_val; -- flat amount? unlikely but handled
        END IF;
    END IF;

    -- If VALOR DEVIDO is explicitly set and different from (Venda - Desconto), prioritize consistency?
    -- User Story: "Saldo a Pagar" must reflect the calculation: `Valor de Venda` minus `Desconto`.
    -- We'll store explicit Desconto here.
    IF v_saldo_a_pagar IS NULL OR v_saldo_a_pagar = 0 THEN
         v_saldo_a_pagar := v_valor_venda - v_desconto_total;
    END IF;

    -- Aggregation from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_valor_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- Get Rota ID and Name
    SELECT rota_id INTO v_rota_id
    FROM "ROTA_ITEMS"
    WHERE cliente_id = v_cliente_id
    LIMIT 1;

    -- Get Rota Name (Grupo Rota) from Client
    SELECT "GRUPO ROTA" INTO v_rota
    FROM "CLIENTES"
    WHERE "CODIGO" = v_cliente_id;

    -- Calculate Monthly Average
    SELECT MAX(CAST("DATA DO ACERTO" AS TIMESTAMP))
    INTO v_prev_data
    FROM "BANCO_DE_DADOS"
    WHERE "CÓDIGO DO CLIENTE" = v_cliente_id
      AND "NÚMERO DO PEDIDO" != p_pedido_id
      AND CAST("DATA DO ACERTO" AS TIMESTAMP) < v_data_acerto;

    IF v_prev_data IS NOT NULL THEN
        v_diff_days := EXTRACT(DAY FROM (v_data_acerto - v_prev_data));
        IF v_diff_days > 0 THEN
             v_media_mensal := COALESCE(v_valor_venda, 0) / (v_diff_days / 30.0);
        END IF;
    END IF;

    -- Upsert
    INSERT INTO debitos_historico (
        pedido_id,
        rota_id,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        cliente_codigo,
        cliente_nome,
        rota,
        media_mensal,
        valor_venda,
        desconto,
        saldo_a_pagar,
        valor_pago,
        debito
    ) VALUES (
        p_pedido_id,
        v_rota_id,
        v_data_acerto,
        v_hora_acerto,
        v_vendedor_nome,
        v_cliente_id,
        v_cliente_nome,
        v_rota,
        v_media_mensal,
        COALESCE(v_valor_venda, 0),
        COALESCE(v_desconto_total, 0),
        COALESCE(v_saldo_a_pagar, 0),
        v_valor_pago,
        (COALESCE(v_saldo_a_pagar, 0) - v_valor_pago)
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        rota_id = EXCLUDED.rota_id,
        data_acerto = EXCLUDED.data_acerto,
        hora_acerto = EXCLUDED.hora_acerto,
        vendedor_nome = EXCLUDED.vendedor_nome,
        cliente_codigo = EXCLUDED.cliente_codigo,
        cliente_nome = EXCLUDED.cliente_nome,
        rota = EXCLUDED.rota,
        media_mensal = EXCLUDED.media_mensal,
        valor_venda = EXCLUDED.valor_venda,
        desconto = EXCLUDED.desconto,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito;
END;
$$;

-- Update the refresh function
CREATE OR REPLACE FUNCTION refresh_debitos_historico()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM debitos_historico;

    INSERT INTO debitos_historico (
        rota_id,
        pedido_id,
        data_acerto,
        hora_acerto,
        vendedor_nome,
        cliente_codigo,
        cliente_nome,
        rota,
        media_mensal,
        valor_venda,
        desconto,
        saldo_a_pagar,
        valor_pago,
        debito
    )
    WITH vendas AS (
        SELECT 
            "NÚMERO DO PEDIDO" as pedido_id,
            MAX(CAST("DATA DO ACERTO" AS TIMESTAMP)) as data_acerto,
            MAX("HORA DO ACERTO") as hora_acerto,
            MAX("FUNCIONÁRIO") as vendedor_nome,
            MAX("CÓDIGO DO CLIENTE") as cliente_id,
            MAX("CLIENTE") as cliente_nome,
            MAX("DESCONTO POR GRUPO") as desconto_str,
            SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda,
            SUM("VALOR DEVIDO") as saldo_a_pagar_raw
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
        GROUP BY "NÚMERO DO PEDIDO"
    ),
    vendas_calc AS (
        SELECT 
            v.*,
            -- Calculate Discount
            CASE 
                WHEN v.desconto_str IS NOT NULL THEN
                    CASE 
                        WHEN public.parse_currency_sql(REPLACE(v.desconto_str, '%', '')) < 1 THEN
                             v.valor_venda * public.parse_currency_sql(REPLACE(v.desconto_str, '%', ''))
                        ELSE
                             v.valor_venda * (public.parse_currency_sql(REPLACE(v.desconto_str, '%', '')) / 100.0)
                    END
                ELSE 0
            END as desconto_calc,
            LAG(v.data_acerto) OVER (PARTITION BY v.cliente_id ORDER BY v.data_acerto) as prev_data_acerto
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
        SELECT "CODIGO" as cliente_id, "GRUPO ROTA" as rota, "TIPO DE CLIENTE"
        FROM "CLIENTES"
    ),
    rota_links AS (
        SELECT DISTINCT ON (cliente_id) cliente_id, rota_id 
        FROM "ROTA_ITEMS"
    )
    SELECT
        rota_links.rota_id,
        vc.pedido_id,
        vc.data_acerto,
        vc.hora_acerto,
        vc.vendedor_nome,
        vc.cliente_id,
        vc.cliente_nome,
        client_info.rota,
        CASE 
            WHEN vc.prev_data_acerto IS NOT NULL AND EXTRACT(DAY FROM (vc.data_acerto - vc.prev_data_acerto)) > 0 THEN
                vc.valor_venda / (EXTRACT(DAY FROM (vc.data_acerto - vc.prev_data_acerto)) / 30.0)
            ELSE 0
        END as media_mensal,
        vc.valor_venda,
        vc.desconto_calc,
        COALESCE(NULLIF(vc.saldo_a_pagar_raw, 0), (vc.valor_venda - vc.desconto_calc)),
        COALESCE(p.valor_pago, 0),
        (COALESCE(NULLIF(vc.saldo_a_pagar_raw, 0), (vc.valor_venda - vc.desconto_calc)) - COALESCE(p.valor_pago, 0))
    FROM vendas_calc vc
    LEFT JOIN pagamentos p ON vc.pedido_id = p.venda_id
    LEFT JOIN rota_links ON vc.cliente_id = rota_links.cliente_id
    LEFT JOIN client_info ON vc.cliente_id = client_info.cliente_id;
END;
$$;
