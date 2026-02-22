-- Fix get_client_projections function to use 14.99 fallback instead of 100.00

CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC,
  dias_entre_acertos INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH 
  sales_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          "DATA DO ACERTO" as date_str,
          "VALOR VENDIDO" as val_str
      FROM "BANCO_DE_DADOS"
      WHERE "DATA DO ACERTO" IS NOT NULL 
        AND "DATA DO ACERTO" != ''
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  adj_data AS (
      SELECT
          cliente_id as cid,
          numero_pedido as oid,
          data_acerto as date_str,
          '0' as val_str
      FROM "AJUSTE_SALDO_INICIAL"
      WHERE data_acerto IS NOT NULL 
        AND cliente_id IS NOT NULL
  ),
  combined_raw AS (
      SELECT * FROM sales_data
      UNION ALL
      SELECT * FROM adj_data
  ),
  parsed_data AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            -- ISO Format (YYYY-MM-DD)
            WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            -- BR Format (DD/MM/YYYY)
            WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
                to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
            -- BR Short Format (DD/MM/YY)
            WHEN date_str ~ '^\d{2}/\d{2}/\d{2}$' THEN 
                 to_date(date_str, 'DD/MM/YY')
            ELSE NULL
        END as raw_dt
      FROM combined_raw
  ),
  corrected_dates AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN raw_dt IS NULL THEN NULL
            -- Fix Year < 1900 (e.g., 0026 -> 2026)
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
             ELSE CAST(val_str AS NUMERIC)
        END as val
      FROM corrected_dates
      WHERE dt IS NOT NULL
  ),
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          val,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
      FROM parsed_values
  ),
  latest AS (
      SELECT cid, dt, val FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  base_calc AS (
      SELECT
          l.cid,
          (l.dt - p.dt) as days_diff,
          CASE
              WHEN p.dt IS NULL OR (l.dt - p.dt) <= 0 THEN 14.99
              ELSE
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                   (l.val / ((l.dt - p.dt)::numeric / 30.0))
          END as calc_proj
      FROM latest l
      LEFT JOIN previous p ON l.cid = p.cid
  )
  SELECT
      cid as client_id,
      CASE 
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 14.99 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(days_diff, 0) as dias_entre_acertos
  FROM base_calc;
END;
$$;
