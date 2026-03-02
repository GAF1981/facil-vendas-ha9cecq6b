DO $$
BEGIN
    BEGIN
        -- Try assigning string first (if column is varchar/text)
        UPDATE "BANCO_DE_DADOS"
        SET "DATA DO ACERTO" = COALESCE(TO_CHAR("DATA E HORA"::timestamp, 'YYYY-MM-DD'), '2023-01-01')
        WHERE "NÚMERO DO PEDIDO" IN (608, 747)
          AND ("DATA DO ACERTO" IS NULL OR trim("DATA DO ACERTO"::text) = '');

        UPDATE "BANCO_DE_DADOS"
        SET "DATA DO ACERTO" = TO_CHAR("DATA E HORA"::timestamp, 'YYYY-MM-DD')
        WHERE ("DATA DO ACERTO" IS NULL OR trim("DATA DO ACERTO"::text) = '')
          AND "DATA E HORA" IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback: If column is actually DATE type, ignore empty strings in condition and cast assignment
        UPDATE "BANCO_DE_DADOS"
        SET "DATA DO ACERTO" = COALESCE(TO_CHAR("DATA E HORA"::timestamp, 'YYYY-MM-DD'), '2023-01-01')::date
        WHERE "NÚMERO DO PEDIDO" IN (608, 747)
          AND "DATA DO ACERTO" IS NULL;

        UPDATE "BANCO_DE_DADOS"
        SET "DATA DO ACERTO" = TO_CHAR("DATA E HORA"::timestamp, 'YYYY-MM-DD')::date
        WHERE "DATA DO ACERTO" IS NULL
          AND "DATA E HORA" IS NOT NULL;
    END;
END $$;

DROP FUNCTION IF EXISTS get_client_projections();

CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC,
  dias_entre_acertos INTEGER
) LANGUAGE plpgsql AS $func$
BEGIN
  RETURN QUERY
  WITH 
  sales_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          "DATA DO ACERTO"::text as date_str,
          "VALOR VENDIDO"::text as val_str
      FROM "BANCO_DE_DADOS"
      WHERE "DATA DO ACERTO" IS NOT NULL 
        AND trim("DATA DO ACERTO"::text) != ''
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  adj_data AS (
      SELECT
          cliente_id as cid,
          COALESCE(numero_pedido, -(id)) as oid,
          to_char(data_acerto, 'YYYY-MM-DD') as date_str,
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
            WHEN trim(date_str) = '' THEN NULL
            WHEN trim(date_str) ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substring(trim(date_str) from 1 for 10), 'YYYY-MM-DD')
            WHEN trim(date_str) ~ '^\d{4}/\d{2}/\d{2}' THEN to_date(substring(trim(date_str) from 1 for 10), 'YYYY/MM/DD')
            WHEN trim(date_str) ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring(trim(date_str) from 1 for 10), 'DD/MM/YYYY')
            WHEN trim(date_str) ~ '^\d{2}-\d{2}-\d{4}' THEN to_date(substring(trim(date_str) from 1 for 10), 'DD-MM-YYYY')
            WHEN trim(date_str) ~ '^\d{2}/\d{2}/\d{2}$' THEN to_date(trim(date_str), 'DD/MM/YY')
            WHEN trim(date_str) ~ '^\d{2}/\d{2}/\d{2}\s+' THEN to_date(substring(trim(date_str) from 1 for 8), 'DD/MM/YY')
            ELSE NULL
        END as raw_dt
      FROM combined_raw
      WHERE date_str IS NOT NULL
  ),
  corrected_dates AS (
      SELECT
        cid,
        oid,
        val_str,
        CASE
            WHEN raw_dt IS NULL THEN NULL
            WHEN EXTRACT(YEAR FROM raw_dt) < 1900 THEN raw_dt + (INTERVAL '2000 years')
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
             WHEN val_str IS NULL OR trim(val_str) = '' THEN 0
             ELSE CAST(COALESCE(NULLIF(regexp_replace(REPLACE(REPLACE(val_str, '.', ''), ',', '.'), '[^0-9.-]', '', 'g'), ''), '0') AS NUMERIC)
        END as val
      FROM corrected_dates
      WHERE dt IS NOT NULL
  ),
  grouped_orders AS (
      SELECT
          cid,
          oid,
          dt,
          SUM(val) as total_val
      FROM parsed_values
      GROUP BY cid, oid, dt
  ),
  client_stats AS (
      SELECT
          cid,
          MAX(dt) as max_dt,
          MIN(dt) as min_dt,
          COUNT(DISTINCT dt) as count_orders,
          SUM(total_val) as sum_val
      FROM grouped_orders
      GROUP BY cid
  ),
  base_calc AS (
      SELECT
          cid,
          max_dt,
          (max_dt - min_dt) as days_span,
          count_orders,
          sum_val,
          CASE
              WHEN count_orders > 1 AND (max_dt - min_dt) > 0 THEN (max_dt - min_dt) / (count_orders - 1)
              ELSE 0
          END as avg_days,
          CASE
              WHEN count_orders > 1 AND (max_dt - min_dt) > 0 THEN
                   (sum_val / (max_dt - min_dt)::numeric) * GREATEST((CURRENT_DATE - max_dt)::numeric, 1.0)
              ELSE 100.00
          END as calc_proj
      FROM client_stats
  )
  SELECT
      cid as client_id,
      CASE 
        WHEN calc_proj IS NULL OR calc_proj = 0 THEN 100.00 
        ELSE ROUND(calc_proj, 2) 
      END as projecao,
      COALESCE(avg_days, 0)::integer as dias_entre_acertos
  FROM base_calc;
END;
$func$;
