CREATE OR REPLACE FUNCTION public.get_inventory_data(p_session_id integer, p_funcionario_id integer)
 RETURNS TABLE(id integer, codigo_barras text, codigo_produto integer, mercadoria text, tipo text, preco numeric, saldo_inicial numeric, saldo_final numeric, contagem numeric, entrada_estoque_carro numeric, saida_carro_estoque numeric, entrada_cliente_carro numeric, saida_carro_cliente numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p."ID", bd."COD. PRODUTO", 0)::INTEGER as id,
    COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
    COALESCE(bd."COD. PRODUTO", 0)::INTEGER as codigo_produto,
    COALESCE(p."PRODUTO", bd."MERCADORIA", 'Produto Não Identificado') as mercadoria,
    COALESCE(p."TIPO", 'OUTROS') as tipo,
    COALESCE(parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
    COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as saldo_inicial,
    COALESCE(bd."SALDO FINAL", 0)::NUMERIC as saldo_final,
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as contagem,
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
$function$;

CREATE OR REPLACE FUNCTION public.get_inventory_items_paginated(p_session_id bigint DEFAULT NULL::bigint, p_funcionario_id bigint DEFAULT NULL::bigint, p_page integer DEFAULT 1, p_page_size integer DEFAULT 50, p_search text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, codigo_barras text, codigo_produto bigint, mercadoria text, tipo text, preco numeric, saldo_inicial numeric, entrada_estoque_carro numeric, entrada_cliente_carro numeric, saida_carro_estoque numeric, saida_carro_cliente numeric, saldo_final numeric, estoque_contagem_carro numeric, total_count bigint)
 LANGUAGE plpgsql
AS $function$
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
    COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as saldo_inicial,
    
    -- Simplified Movement Logic (Direct from BD Snapshot)
    parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
    
    -- Client movements forced to 0 as per requirement to prevent calculation errors
    0::NUMERIC as entrada_cliente_carro,
    
    parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
    
    -- Client movements forced to 0
    0::NUMERIC as saida_carro_cliente,
    
    COALESCE(bd."SALDO FINAL", 0)::NUMERIC as saldo_final,
    
    -- Priority to Physical Count Table, fallback to BD
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as estoque_contagem_carro,
    
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
$function$;

CREATE OR REPLACE FUNCTION public.get_inventory_summary_v2(p_session_id bigint DEFAULT NULL::bigint, p_funcionario_id bigint DEFAULT NULL::bigint, p_search text DEFAULT NULL::text)
 RETURNS TABLE(total_saldo_inicial_qtd numeric, total_saldo_inicial_valor numeric, total_saldo_final_qtd numeric, total_saldo_final_valor numeric, total_diferenca_positiva_qtd numeric, total_diferenca_positiva_valor numeric, total_diferenca_negativa_qtd numeric, total_diferenca_negativa_valor numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH calculated_rows AS (
    SELECT
      COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as qtd_inicial,
      COALESCE(bd."SALDO FINAL", 0)::NUMERIC as qtd_final,
      COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as qtd_contagem,
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
$function$;
