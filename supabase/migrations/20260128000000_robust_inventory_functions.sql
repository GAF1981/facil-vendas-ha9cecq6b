-- Migration to fix inventory loading errors by simplifying data retrieval and adding robustness
-- Addresses User Story: Fix loading errors in Inventory table by simplifying data retrieval

-- Ensure robust currency parsing function exists
CREATE OR REPLACE FUNCTION parse_currency_sql(p_value TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR p_value = '' THEN RETURN 0; END IF;
  BEGIN
    -- Remove R$, spaces, dots (thousands) and replace comma with dot
    -- Assuming format like 'R$ 1.234,56' or '1.234,56' -> 1234.56
    RETURN REGEXP_REPLACE(REPLACE(REPLACE(p_value, '.', ''), ',', '.'), '[^0-9.-]', '', 'g')::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RETURN 0;
  END;
END;
$$;

-- Redefine get_inventory_items_paginated with resilient LEFT JOINS and simplified logic
-- Removes complex date-time comparisons and conditional sums that caused crashes
CREATE OR REPLACE FUNCTION get_inventory_items_paginated(
  p_session_id BIGINT DEFAULT NULL,
  p_funcionario_id BIGINT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  codigo_barras TEXT,
  codigo_produto BIGINT,
  mercadoria TEXT,
  tipo TEXT,
  preco NUMERIC,
  saldo_inicial NUMERIC,
  entrada_estoque_carro NUMERIC,
  entrada_cliente_carro NUMERIC,
  saida_carro_estoque NUMERIC,
  saida_carro_cliente NUMERIC,
  saldo_final NUMERIC,
  estoque_contagem_carro NUMERIC,
  total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INT;
  v_total_count BIGINT;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  -- Calculate Total Count efficiently using LEFT JOIN to handle missing products
  SELECT COUNT(*)
  INTO v_total_count
  FROM "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
    AND
    (p_search IS NULL OR 
     COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
     COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
    );

  RETURN QUERY
  SELECT
    -- Robust ID selection
    COALESCE(p."ID", bd."COD. PRODUTO", 0) as id,
    -- Robust String casting
    COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
    COALESCE(bd."COD. PRODUTO", 0) as codigo_produto,
    COALESCE(p."PRODUTO", bd."MERCADORIA", 'Produto Não Identificado') as mercadoria,
    COALESCE(p."TIPO", 'OUTROS') as tipo,
    -- Safe numeric parsing
    COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
    COALESCE(bd."SALDO INICIAL", 0) as saldo_inicial,
    
    -- Simplified Movement Logic (Direct from BD Snapshot)
    parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
    
    -- Client movements forced to 0 as per requirement to prevent calculation errors
    0::NUMERIC as entrada_cliente_carro,
    
    parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
    
    -- Client movements forced to 0
    0::NUMERIC as saida_carro_cliente,
    
    COALESCE(bd."SALDO FINAL", 0) as saldo_final,
    
    -- Priority to Physical Count Table, fallback to BD
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as estoque_contagem_carro,
    
    v_total_count
  FROM "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
    ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
    AND
    (p_search IS NULL OR 
     COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
     COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
    )
  ORDER BY mercadoria ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Update get_inventory_summary_v2 to be robust with LEFT JOINS
CREATE OR REPLACE FUNCTION get_inventory_summary_v2(
  p_session_id BIGINT DEFAULT NULL,
  p_funcionario_id BIGINT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_saldo_inicial_qtd NUMERIC,
  total_saldo_inicial_valor NUMERIC,
  total_saldo_final_qtd NUMERIC,
  total_saldo_final_valor NUMERIC,
  total_diferenca_positiva_qtd NUMERIC,
  total_diferenca_positiva_valor NUMERIC,
  total_diferenca_negativa_qtd NUMERIC,
  total_diferenca_negativa_valor NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH calculated_rows AS (
    SELECT
      COALESCE(bd."SALDO INICIAL", 0) as qtd_inicial,
      COALESCE(bd."SALDO FINAL", 0) as qtd_final,
      COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as qtd_contagem,
      COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco_unit
    FROM "BANCO_DE_DADOS" bd
    LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
    LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
    WHERE 
      (p_session_id IS NULL OR bd.session_id = p_session_id)
      AND
      (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
      AND
      (p_search IS NULL OR 
       COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR 
       COALESCE(bd."MERCADORIA", '') ILIKE '%' || p_search || '%'
      )
  ),
  diffs AS (
    SELECT
      qtd_inicial,
      qtd_inicial * preco_unit as val_inicial,
      qtd_final,
      qtd_final * preco_unit as val_final,
      (qtd_contagem - qtd_final) as diff_qtd,
      (qtd_contagem - qtd_final) * preco_unit as diff_val
    FROM calculated_rows
  )
  SELECT
    COALESCE(SUM(qtd_inicial), 0),
    COALESCE(SUM(val_inicial), 0),
    COALESCE(SUM(qtd_final), 0),
    COALESCE(SUM(val_final), 0),
    COALESCE(SUM(CASE WHEN diff_qtd > 0 THEN diff_qtd ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN diff_qtd > 0 THEN diff_val ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN diff_qtd < 0 THEN ABS(diff_qtd) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN diff_qtd < 0 THEN ABS(diff_val) ELSE 0 END), 0)
  FROM diffs;
END;
$$;

-- Update legacy get_inventory_data for compatibility and resilience
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
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p."ID", bd."COD. PRODUTO", 0)::INTEGER as id,
    COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
    COALESCE(bd."COD. PRODUTO", 0)::INTEGER as codigo_produto,
    COALESCE(p."PRODUTO", bd."MERCADORIA", 'Produto Não Identificado') as mercadoria,
    COALESCE(p."TIPO", 'OUTROS') as tipo,
    COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
    COALESCE(bd."SALDO INICIAL", 0) as saldo_inicial,
    COALESCE(bd."SALDO FINAL", 0) as saldo_final,
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as contagem,
    parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
    parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
    0::NUMERIC as entrada_cliente_carro,
    0::NUMERIC as saida_carro_cliente
  FROM "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id) AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
  ORDER BY mercadoria;
END;
$$;
