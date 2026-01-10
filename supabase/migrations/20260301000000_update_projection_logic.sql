-- Update debitos_com_total_view to implement updated conditional monthly average logic
-- If media_mensal is 0 and valor_venda is > 0, calculate average as valor_venda / 2.0 (Logic updated from / 30.0)
CREATE OR REPLACE VIEW debitos_com_total_view AS
SELECT
    id,
    rota_id,
    pedido_id,
    data_acerto,
    hora_acerto,
    vendedor_nome,
    cliente_codigo,
    cliente_nome,
    rota,
    CASE
        WHEN (media_mensal = 0 OR media_mensal IS NULL) AND valor_venda > 0 THEN valor_venda / 2.0
        ELSE media_mensal
    END as media_mensal,
    valor_venda,
    desconto,
    saldo_a_pagar,
    valor_pago,
    debito,
    created_at,
    -- Window function to sum debt partitioning by client code
    SUM(debito) OVER (PARTITION BY cliente_codigo) as debito_total
FROM debitos_historico;

-- Update get_client_projections to implement the new fallback logic
-- 1. Monthly Avg fallback: If invalid period but sales > 0, use sales / 2
-- 2. Projection fallback: If calculated projection is 0, set to 100.00
CREATE OR REPLACE FUNCTION get_client_projections()
RETURNS TABLE (
  client_id INTEGER,
  projecao NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH clean_data AS (
      SELECT
          "CÓDIGO DO CLIENTE" as cid,
          "NÚMERO DO PEDIDO" as oid,
          "DATA DO ACERTO"::date as dt,
          "VALOR VENDIDO" as val_str
      FROM "BANCO_DE_DADOS"
      WHERE "DATA DO ACERTO" IS NOT NULL 
        AND "DATA DO ACERTO" != ''
        AND "CÓDIGO DO CLIENTE" IS NOT NULL
        AND "NÚMERO DO PEDIDO" IS NOT NULL
  ),
  parsed_data AS (
      SELECT
        cid,
        oid,
        dt,
        CASE 
             WHEN val_str ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE(val_str, '.', ''), ',', '.') AS NUMERIC)
             WHEN val_str ~ '^[0-9,]+$' THEN CAST(REPLACE(val_str, ',', '.') AS NUMERIC)
             ELSE 0
        END as val
      FROM clean_data
  ),
  orders AS (
      SELECT
          cid,
          oid,
          MAX(dt) as dt, 
          SUM(val) as total_venda 
      FROM parsed_data
      GROUP BY cid, oid
  ),
  ranked_orders AS (
      SELECT
          cid,
          oid,
          dt,
          total_venda,
          ROW_NUMBER() OVER (PARTITION BY cid ORDER BY oid DESC) as rn
      FROM orders
  ),
  latest AS (
      SELECT cid, dt, total_venda FROM ranked_orders WHERE rn = 1
  ),
  previous AS (
      SELECT cid, dt FROM ranked_orders WHERE rn = 2
  ),
  base_calc AS (
      SELECT
          l.cid,
          CASE
              WHEN (l.dt - p.dt) <= 0 AND l.total_venda > 0 THEN
                   -- Fallback Monthly Average = Total / 2
                   -- Projection = (DaysSince / 30) * (Total / 2)
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) * (l.total_venda / 2.0)
              WHEN (l.dt - p.dt) <= 0 THEN 0.0
              ELSE
                   ((CURRENT_DATE - l.dt)::numeric / 30.0) *
                   (l.total_venda / ((l.dt - p.dt)::numeric / 30.0))
          END as calc_proj
      FROM latest l
      JOIN previous p ON l.cid = p.cid
  )
  SELECT
      cid as client_id,
      CASE WHEN ROUND(calc_proj, 2) = 0 THEN 100.00 ELSE ROUND(calc_proj, 2) END as projecao
  FROM base_calc;
END;
$$;
