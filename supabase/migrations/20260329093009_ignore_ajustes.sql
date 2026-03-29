-- Update get_client_projections to ignore Ajustes
CREATE OR REPLACE FUNCTION public.get_client_projections()
 RETURNS TABLE(client_id bigint, projecao numeric, dias_entre_acertos integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  sales_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          COALESCE(NULLIF(TRIM("DATA DO ACERTO"::text), ''), to_char("DATA E HORA", 'YYYY-MM-DD')) as date_str,
          "VALOR VENDIDO"::text as val_str
      FROM "BANCO_DE_DADOS"
      WHERE (NULLIF(TRIM("DATA DO ACERTO"::text), '') IS NOT NULL OR "DATA E HORA" IS NOT NULL)
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
        AND ("FORMA" IS NULL OR "FORMA" NOT ILIKE '%ajuste%')
  ),
  parsed_data AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
                to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
            WHEN date_str ~ '^\d{2}/\d{2}/\d{2}$' THEN 
                 to_date(date_str, 'DD/MM/YY')
            ELSE NULL
        END as raw_dt
      FROM sales_data
  ),
  corrected_dates AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN raw_dt IS NULL THEN NULL
            WHEN EXTRACT(YEAR FROM raw_dt) < 1900 THEN
                raw_dt + (INTERVAL '2000 years')
            ELSE raw_dt
        END::date as dt
      FROM parsed_data
  ),
  parsed_values AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE CAST(NULLIF(val_str, '') AS NUMERIC)
        END as val
      FROM corrected_dates
      WHERE dt IS NOT NULL
  ),
  grouped_orders AS (
      SELECT
          cid,
          oid,
          dt,
          SUM(COALESCE(val, 0)) as total_val
      FROM parsed_values
      GROUP BY cid, oid, dt
  ),
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          total_val,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
      FROM grouped_orders
  ),
  latest AS (
      SELECT cid, dt, total_val FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  base_calc AS (
      SELECT
          l.cid,
          (l.dt - p.dt) as days_diff,
          CASE
              WHEN p.dt IS NULL OR (l.dt - p.dt) <= 0 THEN 100.00
              ELSE
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                   (l.total_val / ((l.dt - p.dt)::numeric / 30.0))
          END as calc_proj
      FROM latest l
      LEFT JOIN previous p ON l.cid = p.cid
  )
  SELECT
      cid as client_id,
      CASE 
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(days_diff, 0)::integer as dias_entre_acertos
  FROM base_calc;
END;
$function$;

-- Update refresh_debitos_historico to ignore Ajustes
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
            MAX("DATA DO ACERTO") as data_acerto_str,
            MAX("HORA DO ACERTO") as hora_acerto,
            MAX("FUNCIONÁRIO") as vendedor_nome,
            MAX("CÓDIGO DO CLIENTE") as cliente_id,
            MAX("CLIENTE") as cliente_nome,
            MAX("DESCONTO POR GRUPO") as desconto_str,
            SUM(public.parse_currency_sql("VALOR VENDIDO")) as valor_venda
        FROM "BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
          AND ("FORMA" IS NULL OR "FORMA" NOT ILIKE '%ajuste%')
        GROUP BY "NÚMERO DO PEDIDO"
    ),
    vendas_calc AS (
        SELECT 
            v.*,
            CASE 
                WHEN public.parse_currency_sql(v.desconto_str) > 0 THEN
                    CASE
                        WHEN v.desconto_str LIKE '%%%' THEN
                             v.valor_venda * (public.parse_currency_sql(REPLACE(v.desconto_str, '%', '')) / 100.0)
                        WHEN public.parse_currency_sql(v.desconto_str) < 1 THEN
                             v.valor_venda * public.parse_currency_sql(v.desconto_str)
                        WHEN public.parse_currency_sql(v.desconto_str) <= 100 THEN
                             v.valor_venda * (public.parse_currency_sql(v.desconto_str) / 100.0)
                        ELSE
                             public.parse_currency_sql(v.desconto_str)
                    END
                ELSE 0
            END as desconto_calc,
            public.safe_cast_timestamp(v.data_acerto_str, v.hora_acerto) as data_acerto
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

-- Update update_debito_historico_order to ignore Ajustes
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
    v_saldo_a_pagar NUMERIC := 0;
    v_debito NUMERIC := 0;
    v_forma TEXT;
    
    v_cliente_id BIGINT;
    v_cliente_nome TEXT;
    v_vendedor_nome TEXT;
    v_data_acerto_str TEXT;
    v_hora_acerto TEXT;
    v_rota TEXT;
    v_data_acerto_ts TIMESTAMP;
BEGIN
    SELECT COALESCE(SUM(valor_pago), 0)
    INTO v_total_pago
    FROM "RECEBIMENTOS"
    WHERE venda_id = p_pedido_id;

    SELECT 
        SUM(public.parse_currency_sql("VALOR VENDIDO")),
        MAX("CÓDIGO DO CLIENTE"),
        MAX("CLIENTE"),
        MAX("FUNCIONÁRIO"),
        MAX("DATA DO ACERTO"),
        MAX("HORA DO ACERTO"),
        MAX("DESCONTO POR GRUPO"),
        MAX("FORMA")
    INTO 
        v_valor_venda,
        v_cliente_id,
        v_cliente_nome,
        v_vendedor_nome,
        v_data_acerto_str,
        v_hora_acerto,
        v_desconto_str,
        v_forma
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = p_pedido_id;

    IF v_cliente_id IS NULL THEN
        RETURN;
    END IF;

    IF v_forma ILIKE '%ajuste%' THEN
        DELETE FROM debitos_historico WHERE pedido_id = p_pedido_id;
        RETURN;
    END IF;

    SELECT "GRUPO ROTA" INTO v_rota
    FROM "CLIENTES"
    WHERE "CODIGO" = v_cliente_id;

    v_desconto_val := public.parse_currency_sql(v_desconto_str);
    
    IF v_desconto_val > 0 THEN
        IF v_desconto_str LIKE '%%%' THEN
             v_desconto_final := v_valor_venda * (public.parse_currency_sql(REPLACE(v_desconto_str, '%', '')) / 100.0);
        ELSIF v_desconto_val < 1 THEN 
             v_desconto_final := v_valor_venda * v_desconto_val;
        ELSIF v_desconto_val <= 100 THEN 
             v_desconto_final := v_valor_venda * (v_desconto_val / 100.0);
        ELSE
             v_desconto_final := v_desconto_val;
        END IF;
    ELSE
        v_desconto_final := 0;
    END IF;

    v_saldo_a_pagar := v_valor_venda - v_desconto_final;
    
    v_debito := v_saldo_a_pagar - v_total_pago;
    
    IF v_debito < 0.01 THEN 
        v_debito := 0; 
    END IF;

    BEGIN
        IF v_data_acerto_str IS NOT NULL AND v_data_acerto_str <> '' THEN
            IF v_hora_acerto IS NOT NULL AND v_hora_acerto <> '' THEN
                v_data_acerto_ts := (v_data_acerto_str || ' ' || v_hora_acerto)::TIMESTAMP;
            ELSE
                v_data_acerto_ts := v_data_acerto_str::TIMESTAMP;
            END IF;
        ELSE
            v_data_acerto_ts := NOW();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_data_acerto_ts := NOW();
    END;

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
        rota
    ) VALUES (
        p_pedido_id,
        v_cliente_id,
        v_cliente_nome,
        v_valor_venda,
        v_total_pago,
        v_debito,
        v_data_acerto_ts,
        v_hora_acerto,
        v_vendedor_nome,
        v_desconto_final,
        v_saldo_a_pagar,
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
        rota = EXCLUDED.rota;
END;
$function$;
