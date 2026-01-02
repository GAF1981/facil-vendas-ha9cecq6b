-- Migration to improve resilience of inventory data fetching
-- Addresses: Safe Joins (LEFT JOIN), Aggressive Numeric Sanitization, and Handling Missing Products

-- Enhanced RPC for Paginated Inventory Data with LEFT JOIN and Resilience
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

  -- Calculate Total Count First (Efficiently)
  -- Using LEFT JOIN to include items even if product is missing in PRODUTOS table
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
  WITH base_data AS (
    SELECT
      p."ID" as p_id,
      p."CÓDIGO BARRAS"::TEXT as p_codigo_barras,
      bd."COD. PRODUTO" as p_codigo_produto,
      
      -- Robust Fallback logic for Product Name
      -- Tries Product Table Name -> BD Historical Name -> Placeholder
      COALESCE(
        p."PRODUTO", 
        bd."MERCADORIA", 
        'Produto Não Identificado (ID: ' || COALESCE(bd."COD. PRODUTO"::TEXT, '?') || ')'
      ) as p_mercadoria,
      
      COALESCE(p."TIPO", 'OUTROS') as p_tipo,
      
      -- Robust Price Parsing: Convert any garbage to 0
      parse_currency_sql(COALESCE(p."PREÇO"::TEXT, '0')) as p_preco,
      
      -- Safe casting for BD columns using COALESCE and robust parsing
      COALESCE(bd."SALDO INICIAL", 0) as bd_saldo_inicial,
      COALESCE(bd."SALDO FINAL", 0) as bd_saldo_final,
      
      -- Mapping string columns safely using aggressive sanitization
      parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as bd_entrada_estoque_carro,
      parse_currency_sql(bd."RECOLHIDO") as bd_saida_carro_estoque,
      parse_currency_sql(bd."QUANTIDADE VENDIDA") as bd_saida_carro_cliente,
      
      -- Priority to Physical Count Table, fallback to BD
      COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as final_contagem
      
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
  )
  SELECT
    COALESCE(p_id, p_codigo_produto, 0) as id, -- Ensure ID is never null
    p_codigo_barras,
    p_codigo_produto,
    p_mercadoria,
    p_tipo,
    p_preco,
    bd_saldo_inicial,
    bd_entrada_estoque_carro,
    0::NUMERIC as entrada_cliente_carro,
    bd_saida_carro_estoque,
    bd_saida_carro_cliente,
    bd_saldo_final,
    final_contagem,
    v_total_count
  FROM base_data
  ORDER BY p_mercadoria ASC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;

-- Enhanced RPC for Inventory Summary (Totals) with LEFT JOIN and Resilience
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
      parse_currency_sql(COALESCE(p."PREÇO"::TEXT, '0')) as preco_unit
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
