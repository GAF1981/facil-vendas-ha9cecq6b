-- Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS debitos_historico (
    id SERIAL PRIMARY KEY,
    rota_id INTEGER,
    pedido_id INTEGER NOT NULL,
    data_acerto TIMESTAMP,
    vendedor_nome TEXT,
    media_mensal NUMERIC DEFAULT 0,
    valor_venda NUMERIC DEFAULT 0,
    saldo_a_pagar NUMERIC DEFAULT 0,
    valor_pago NUMERIC DEFAULT 0,
    debito NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index for upsert capability
CREATE UNIQUE INDEX IF NOT EXISTS idx_debitos_historico_pedido_id ON debitos_historico(pedido_id);

-- Helper for currency parsing
CREATE OR REPLACE FUNCTION parse_currency_sql(price text) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF price IS NULL THEN RETURN 0; END IF;
    RETURN CAST(REPLACE(REPLACE(REPLACE(price, '.', ''), ',', '.'), 'R$ ', '') AS NUMERIC);
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;

-- Function to update a single order (For automatic trigger)
CREATE OR REPLACE FUNCTION update_debito_historico_order(p_pedido_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_valor_venda NUMERIC;
    v_saldo_a_pagar NUMERIC;
    v_valor_pago NUMERIC;
    v_data_acerto TIMESTAMP;
    v_vendedor_nome TEXT;
    v_rota_id INTEGER;
    v_cliente_id INTEGER;
    v_prev_data TIMESTAMP;
    v_diff_days NUMERIC;
    v_media_mensal NUMERIC := 0;
BEGIN
    -- Aggregation from BANCO_DE_DADOS
    SELECT
        MAX(CAST("DATA DO ACERTO" AS TIMESTAMP)),
        MAX("FUNCIONÁRIO"),
        MAX("CÓDIGO DO CLIENTE"),
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        SUM("VALOR DEVIDO")
    INTO
        v_data_acerto,
        v_vendedor_nome,
        v_cliente_id,
        v_valor_venda,
        v_saldo_a_pagar
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    IF v_cliente_id IS NULL THEN
        RETURN; -- Order not found
    END IF;

    -- Aggregation from RECEBIMENTOS
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_valor_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    -- Get Rota ID (Current approximation)
    SELECT rota_id INTO v_rota_id
    FROM "ROTA_ITEMS"
    WHERE cliente_id = v_cliente_id
    LIMIT 1;

    -- Calculate Monthly Average (Simple approach based on previous order)
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
        vendedor_nome,
        media_mensal,
        valor_venda,
        saldo_a_pagar,
        valor_pago,
        debito
    ) VALUES (
        p_pedido_id,
        v_rota_id,
        v_data_acerto,
        v_vendedor_nome,
        v_media_mensal,
        COALESCE(v_valor_venda, 0),
        COALESCE(v_saldo_a_pagar, 0),
        v_valor_pago,
        (COALESCE(v_saldo_a_pagar, 0) - v_valor_pago)
    )
    ON CONFLICT (pedido_id) DO UPDATE SET
        rota_id = EXCLUDED.rota_id,
        data_acerto = EXCLUDED.data_acerto,
        vendedor_nome = EXCLUDED.vendedor_nome,
        media_mensal = EXCLUDED.media_mensal,
        valor_venda = EXCLUDED.valor_venda,
        saldo_a_pagar = EXCLUDED.saldo_a_pagar,
        valor_pago = EXCLUDED.valor_pago,
        debito = EXCLUDED.debito;
END;
$$;

-- Function to full refresh (For Recalcular button)
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
        vendedor_nome,
        media_mensal,
        valor_venda,
        saldo_a_pagar,
        valor_pago,
        debito
    )
    WITH vendas AS (
        SELECT 
            "NÚMERO DO PEDIDO" as pedido_id,
            MAX(CAST("DATA DO ACERTO" AS TIMESTAMP)) as data_acerto,
            MAX("FUNCIONÁRIO") as vendedor_nome,
            MAX("CÓDIGO DO CLIENTE") as cliente_id,
            SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda,
            SUM("VALOR DEVIDO") as saldo_a_pagar
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
        GROUP BY "NÚMERO DO PEDIDO"
    ),
    vendas_calc AS (
        SELECT 
            v.*,
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
    rotas AS (
        SELECT DISTINCT ON (cliente_id) cliente_id, rota_id 
        FROM "ROTA_ITEMS"
    )
    SELECT
        rotas.rota_id,
        vc.pedido_id,
        vc.data_acerto,
        vc.vendedor_nome,
        CASE 
            WHEN vc.prev_data_acerto IS NOT NULL AND EXTRACT(DAY FROM (vc.data_acerto - vc.prev_data_acerto)) > 0 THEN
                vc.valor_venda / (EXTRACT(DAY FROM (vc.data_acerto - vc.prev_data_acerto)) / 30.0)
            ELSE 0
        END as media_mensal,
        vc.valor_venda,
        vc.saldo_a_pagar,
        COALESCE(p.valor_pago, 0),
        (vc.saldo_a_pagar - COALESCE(p.valor_pago, 0))
    FROM vendas_calc vc
    LEFT JOIN pagamentos p ON vc.pedido_id = p.venda_id
    LEFT JOIN rotas ON vc.cliente_id = rotas.cliente_id;
END;
$$;
