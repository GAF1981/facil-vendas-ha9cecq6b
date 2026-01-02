-- Migration to improve inventory data fetching with pagination, resilience and safe casting

-- Helper function to safely parse dates if needed (though we'll focus on currency mostly as per request)
CREATE OR REPLACE FUNCTION safe_cast_timestamp(p_date TEXT, p_time TEXT)
RETURNS TIMESTAMP
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  BEGIN
    IF p_date IS NULL OR p_date = '' THEN RETURN NULL; END IF;
    -- Try to combine date and time
    IF p_time IS NULL OR p_time = '' THEN
      RETURN p_date::TIMESTAMP;
    ELSE
      RETURN (p_date || ' ' || p_time)::TIMESTAMP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Enhanced RPC for Paginated Inventory Data
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
  SELECT COUNT(*)
  INTO v_total_count
  FROM "BANCO_DE_DADOS" bd
  JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  WHERE 
    (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND
    (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
    AND
    (p_search IS NULL OR p."PRODUTO" ILIKE '%' || p_search || '%');

  RETURN QUERY
  WITH base_data AS (
    SELECT
      p."ID" as p_id,
      p."CÓDIGO BARRAS"::TEXT as p_codigo_barras,
      p."CODIGO" as p_codigo_produto,
      COALESCE(p."PRODUTO", 'PRODUTO SEM NOME') as p_mercadoria,
      p."TIPO" as p_tipo,
      parse_currency_sql(p."PREÇO"::TEXT) as p_preco,
      
      -- Safe casting for BD columns using COALESCE and parsing
      COALESCE(bd."SALDO INICIAL", 0) as bd_saldo_inicial,
      COALESCE(bd."SALDO FINAL", 0) as bd_saldo_final,
      
      -- Mapping string columns safely
      parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as bd_entrada_estoque_carro,
      parse_currency_sql(bd."RECOLHIDO") as bd_saida_carro_estoque,
      parse_currency_sql(bd."QUANTIDADE VENDIDA") as bd_saida_carro_cliente,
      
      -- Priority to Physical Count Table, fallback to BD
      COALESCE(cfe.quantidade, bd."CONTAGEM", 0) as final_contagem
      
    FROM "BANCO_DE_DADOS" bd
    JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
    LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
    WHERE 
      (p_session_id IS NULL OR bd.session_id = p_session_id)
      AND
      (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
      AND
      (p_search IS NULL OR p."PRODUTO" ILIKE '%' || p_search || '%')
  )
  SELECT
    p_id,
    p_codigo_barras,
    p_codigo_produto,
    p_mercadoria,
    p_tipo,
    p_preco,
    bd_saldo_inicial,
    bd_entrada_estoque_carro,
    0::NUMERIC as entrada_cliente_carro, -- Placeholder as mapped in legacy
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

-- RPC for Inventory Summary (Totals)
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
      parse_currency_sql(p."PREÇO"::TEXT) as preco_unit
    FROM "BANCO_DE_DADOS" bd
    JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
    LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
      ON cfe.produto_id = p."ID" AND cfe.session_id = bd.session_id
    WHERE 
      (p_session_id IS NULL OR bd.session_id = p_session_id)
      AND
      (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
      AND
      (p_search IS NULL OR p."PRODUTO" ILIKE '%' || p_search || '%')
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
