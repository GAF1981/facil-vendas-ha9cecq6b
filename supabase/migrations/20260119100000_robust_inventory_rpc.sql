-- Migration to ensure robustness against malformed dates in inventory calculations

-- Helper function to safely combine date and time strings into a TIMESTAMP
-- Returns NULL if parsing fails or inputs are invalid, protecting queries from crashing
CREATE OR REPLACE FUNCTION safe_timestamp_combine(p_date text, p_time text)
RETURNS TIMESTAMP
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_date IS NULL OR p_date = '' THEN
    RETURN NULL;
  END IF;

  -- Default time if missing
  IF p_time IS NULL OR p_time = '' THEN
    p_time := '00:00:00';
  END IF;

  BEGIN
    -- Try simple concatenation cast (works for ISO YYYY-MM-DD and standard formats)
    RETURN (p_date || ' ' || p_time)::TIMESTAMP;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL; -- Gracefully handle malformed dates by returning NULL
  END;
END;
$$;

-- Redefine get_inventory_data with robust date handling
-- This ensures that malformed dates do not crash the inventory page
CREATE OR REPLACE FUNCTION get_inventory_data(
  p_session_id INTEGER,
  p_funcionario_id INTEGER
)
RETURNS TABLE (
  id INTEGER,
  codigo_barras TEXT,
  codigo_produto INTEGER,
  mercadoria TEXT,
  tipo TEXT,
  preco NUMERIC,
  saldo_inicial NUMERIC,
  saldo_final NUMERIC,
  contagem NUMERIC,
  entrada_estoque_carro NUMERIC,
  saida_carro_estoque NUMERIC,
  entrada_cliente_carro NUMERIC,
  saida_carro_cliente NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date TIMESTAMP;
BEGIN
  -- Get Session Start Date
  IF p_session_id IS NOT NULL THEN
    SELECT "Data de Início de Inventário"::TIMESTAMP INTO v_start_date
    FROM "DATAS DE INVENTÁRIO"
    WHERE "ID INVENTÁRIO" = p_session_id;
  END IF;

  -- If no session or session not found, assume 'Now' (Snaphot mode, no movements accumulated yet)
  IF v_start_date IS NULL THEN
    v_start_date := NOW();
  END IF;

  RETURN QUERY
  WITH product_movements AS (
    SELECT 
      "COD. PRODUTO",
      -- Stock -> Car (Repo) [TIPO='MOVIMENTACAO', NOVAS CONSIGNAÇÕES]
      SUM(CASE WHEN TIPO = 'MOVIMENTACAO' THEN parse_currency_sql("NOVAS CONSIGNAÇÕES") ELSE 0 END) as repo,
      -- Car -> Stock (Devolucao) [TIPO='MOVIMENTACAO', RECOLHIDO]
      SUM(CASE WHEN TIPO = 'MOVIMENTACAO' THEN parse_currency_sql("RECOLHIDO") ELSE 0 END) as devolucao,
      -- Client -> Car (Recolhido from Client) [TIPO!='MOVIMENTACAO', RECOLHIDO]
      SUM(CASE WHEN TIPO != 'MOVIMENTACAO' THEN parse_currency_sql("RECOLHIDO") ELSE 0 END) as client_in,
      -- Car -> Client (Consign to Client) [TIPO!='MOVIMENTACAO', NOVAS CONSIGNAÇÕES]
      SUM(CASE WHEN TIPO != 'MOVIMENTACAO' THEN parse_currency_sql("NOVAS CONSIGNAÇÕES") ELSE 0 END) as client_out
    FROM "BANCO_DE_DADOS"
    WHERE 
      (p_funcionario_id IS NULL OR "CODIGO FUNCIONARIO" = p_funcionario_id) AND
      -- Use safe timestamp combine. If NULL (malformed), it evaluates to false or null, effectively excluding the record from movements
      safe_timestamp_combine("DATA DO ACERTO"::TEXT, "HORA DO ACERTO") >= v_start_date
    GROUP BY "COD. PRODUTO"
  ),
  latest_balance AS (
    SELECT DISTINCT ON ("COD. PRODUTO")
      "COD. PRODUTO",
      "SALDO FINAL"
    FROM "BANCO_DE_DADOS"
    WHERE (p_funcionario_id IS NULL OR "CODIGO FUNCIONARIO" = p_funcionario_id)
    -- Order by safe timestamp desc. Invalid dates go to the bottom (treated as old)
    -- Explicitly specifying NULLS LAST ensures valid recent dates take precedence
    ORDER BY "COD. PRODUTO", safe_timestamp_combine("DATA DO ACERTO"::TEXT, "HORA DO ACERTO") DESC NULLS LAST, "ID VENDA ITENS" DESC
  ),
  initial_balance AS (
    SELECT DISTINCT ON ("COD. PRODUTO")
      "COD. PRODUTO",
      "SALDO FINAL" as saldo
    FROM "BANCO_DE_DADOS"
    WHERE 
      (p_funcionario_id IS NULL OR "CODIGO FUNCIONARIO" = p_funcionario_id) AND
      -- Use safe timestamp. If NULL, logic evaluates false/null, effectively excluding it from initial balance (before session)
      safe_timestamp_combine("DATA DO ACERTO"::TEXT, "HORA DO ACERTO") < v_start_date
    ORDER BY "COD. PRODUTO", safe_timestamp_combine("DATA DO ACERTO"::TEXT, "HORA DO ACERTO") DESC NULLS LAST, "ID VENDA ITENS" DESC
  ),
  session_counts AS (
    SELECT produto_id, quantidade 
    FROM "CONTAGEM DE ESTOQUE FINAL"
    WHERE session_id = p_session_id
  )
  SELECT
    p."ID",
    p."CÓDIGO BARRAS"::TEXT,
    p."CODIGO",
    COALESCE(p."PRODUTO", 'N/D'),
    p."TIPO",
    parse_currency_sql(p."PREÇO"),
    -- If no record before session, assume 0.
    COALESCE(ib.saldo, 0),
    -- Current balance from latest record
    COALESCE(lb."SALDO FINAL", 0),
    -- Saved Count
    COALESCE(sc.quantidade, 0),
    -- Movements
    COALESCE(pm.repo, 0),
    COALESCE(pm.devolucao, 0),
    COALESCE(pm.client_in, 0),
    COALESCE(pm.client_out, 0)
  FROM "PRODUTOS" p
  LEFT JOIN product_movements pm ON p."CODIGO" = pm."COD. PRODUTO"
  LEFT JOIN latest_balance lb ON p."CODIGO" = lb."COD. PRODUTO"
  LEFT JOIN initial_balance ib ON p."CODIGO" = ib."COD. PRODUTO"
  LEFT JOIN session_counts sc ON p."ID" = sc.produto_id
  ORDER BY p."PRODUTO";
END;
$$;
