-- Update get_client_projections to correctly handle date differences including initial balances
-- Features: 
-- 1. Unifies BANCO_DE_DADOS and AJUSTE_SALDO_INICIAL
-- 2. Calculates days between settlements precisely
-- 3. Provides fallback projection of 100.00
-- 4. Handles BR date formats (DD/MM/YYYY) and 2-digit years (DD/MM/YY) robustly

CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC,
  dias_entre_acertos INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Standard Sales Data
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
  -- 2. Initial Balance / Adjustment Data
  adj_data AS (
      SELECT
          cliente_id as cid,
          numero_pedido as oid,
          data_acerto as date_str,
          '0' as val_str -- Value is 0 for projection calc purposes (timeline anchor)
      FROM "AJUSTE_SALDO_INICIAL"
      WHERE data_acerto IS NOT NULL 
        AND cliente_id IS NOT NULL
  ),
  -- 3. Combine Data Sources
  combined_raw AS (
      SELECT * FROM sales_data
      UNION ALL
      SELECT * FROM adj_data
  ),
  -- 4. Parse Dates and Values
  parsed_data AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            -- Try to match DD/MM/YYYY (BR Format)
            WHEN date_str ~ '^\d{2}/\d{2}/\d{4}' THEN 
                to_date(substring(date_str from 1 for 10), 'DD/MM/YYYY')
            -- Try to match DD/MM/YY (BR Short Format) - assume 2000s
            WHEN date_str ~ '^\d{2}/\d{2}/\d{2}$' THEN 
                 to_date(date_str, 'DD/MM/YY')
            -- Try to match YYYY-MM-DD (ISO Format)
            WHEN date_str ~ '^\d{4}-\d{2}-\d{2}' THEN 
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            -- Try to match YYYY-MM-DD (ISO Format with T)
            WHEN date_str LIKE '%T%' THEN
                to_date(substring(date_str from 1 for 10), 'YYYY-MM-DD')
            ELSE NULL
        END as dt
      FROM combined_raw
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
      FROM parsed_data
      WHERE dt IS NOT NULL
  ),
  -- 5. Rank Orders per Client (Latest first)
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          val,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY dt DESC, oid DESC) as rn
      FROM parsed_values
  ),
  -- 6. Get Latest and Previous
  latest AS (
      SELECT cid, dt, val FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  -- 7. Calculate Projection
  base_calc AS (
      SELECT
          l.cid,
          (l.dt - p.dt) as days_diff,
          CASE
              -- If no previous data (p.dt is null), or dates are same/invalid
              WHEN p.dt IS NULL OR (l.dt - p.dt) <= 0 THEN 100.00
              
              -- Standard Calculation
              -- Monthly Avg = Val / ((DateDiff)/30)
              -- Projection = (DaysSinceLast/30) * Monthly Avg
              -- Projection = (DaysSinceLast * Val) / DateDiff
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
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(days_diff, 0) as dias_entre_acertos
  FROM base_calc;
END;
$$;
