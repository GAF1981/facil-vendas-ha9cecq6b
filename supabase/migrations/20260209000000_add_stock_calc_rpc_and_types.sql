-- Create RPC function to calculate the last stock value for each client
-- Logic: Find the last transaction (Order) for each client, then sum the value of items in that order.
-- Value = SALDO FINAL * Current Product Price

CREATE OR REPLACE FUNCTION get_clients_last_stock_value()
RETURNS TABLE (
  client_id INTEGER,
  stock_value NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH last_orders AS (
    SELECT DISTINCT ON ("CÓDIGO DO CLIENTE")
      "CÓDIGO DO CLIENTE",
      "NÚMERO DO PEDIDO"
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" IS NOT NULL
    ORDER BY "CÓDIGO DO CLIENTE", "DATA DO ACERTO" DESC, "HORA DO ACERTO" DESC
  ),
  order_items AS (
    SELECT
      bd."CÓDIGO DO CLIENTE",
      bd."SALDO FINAL",
      bd."COD. PRODUTO"
    FROM "BANCO_DE_DADOS" bd
    JOIN last_orders lo ON bd."NÚMERO DO PEDIDO" = lo."NÚMERO DO PEDIDO"
  )
  SELECT
    oi."CÓDIGO DO CLIENTE" as client_id,
    COALESCE(SUM(oi."SALDO FINAL" * public.parse_currency_sql(p."PREÇO")), 0) as stock_value
  FROM order_items oi
  JOIN "PRODUTOS" p ON p."CODIGO" = oi."COD. PRODUTO"
  GROUP BY oi."CÓDIGO DO CLIENTE";
END;
$$;

-- Ensure TIPO DE CLIENTE has no strict check constraint preventing 'INATIVO - ROTA'
-- Since we are using text, it should be fine, but we document this intent.
COMMENT ON COLUMN "CLIENTES"."TIPO DE CLIENTE" IS 'Status of the client: ATIVO, INATIVO, BLOQUEADO, INATIVO - ROTA';
