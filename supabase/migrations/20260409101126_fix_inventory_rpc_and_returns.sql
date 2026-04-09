-- Fix return types and structure for get_inventory_data to load all products
DROP FUNCTION IF EXISTS public.get_inventory_data(integer, integer);

CREATE OR REPLACE FUNCTION public.get_inventory_data(p_session_id integer, p_funcionario_id integer DEFAULT NULL)
RETURNS TABLE(
    id bigint, 
    codigo_barras text, 
    codigo_produto bigint, 
    mercadoria text, 
    tipo text, 
    preco numeric, 
    saldo_inicial numeric, 
    saldo_final numeric, 
    contagem numeric, 
    entrada_estoque_carro numeric, 
    saida_carro_estoque numeric, 
    entrada_cliente_carro numeric, 
    saida_carro_cliente numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
SELECT
  p."ID"::bigint as id,
  COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
  COALESCE(p."CODIGO", 0)::bigint as codigo_produto,
  COALESCE(p."PRODUTO", 'Produto Não Identificado') as mercadoria,
  COALESCE(p."TIPO", 'OUTROS') as tipo,
  COALESCE(public.parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
  COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as saldo_inicial,
  COALESCE(bd."SALDO FINAL", 0)::NUMERIC as saldo_final,
  COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as contagem,
  public.parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
  public.parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
  0::NUMERIC as entrada_cliente_carro,
  0::NUMERIC as saida_carro_cliente
FROM "PRODUTOS" p
LEFT JOIN "BANCO_DE_DADOS" bd ON bd."COD. PRODUTO" = p."ID" 
    AND (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
    ON cfe.produto_id = p."ID" AND cfe.session_id = p_session_id
ORDER BY p."PRODUTO";
END;
$function$;

-- Fix get_inventory_items_paginated to load all products and match types
DROP FUNCTION IF EXISTS public.get_inventory_items_paginated(bigint, bigint, integer, integer, text);

CREATE OR REPLACE FUNCTION public.get_inventory_items_paginated(
    p_session_id bigint DEFAULT NULL::bigint, 
    p_funcionario_id bigint DEFAULT NULL::bigint, 
    p_page integer DEFAULT 1, 
    p_page_size integer DEFAULT 50, 
    p_search text DEFAULT NULL::text
)
RETURNS TABLE(
    id bigint, 
    codigo_barras text, 
    codigo_produto bigint, 
    mercadoria text, 
    tipo text, 
    preco numeric, 
    saldo_inicial numeric, 
    entrada_estoque_carro numeric, 
    entrada_cliente_carro numeric, 
    saida_carro_estoque numeric, 
    saida_carro_cliente numeric, 
    saldo_final numeric, 
    estoque_contagem_carro numeric, 
    total_count bigint
)
LANGUAGE plpgsql
AS $function$
DECLARE
v_offset INT;
v_total_count BIGINT;
BEGIN
v_offset := (p_page - 1) * p_page_size;

SELECT COUNT(*)
INTO v_total_count
FROM "PRODUTOS" p
WHERE 
  (p_search IS NULL OR 
   COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
   COALESCE(p."CODIGO"::TEXT, '') ILIKE '%' || p_search || '%'
  );

RETURN QUERY
SELECT
  p."ID"::bigint as id,
  COALESCE(p."CÓDIGO BARRAS"::TEXT, '') as codigo_barras,
  COALESCE(p."CODIGO", 0)::bigint as codigo_produto,
  COALESCE(p."PRODUTO", 'Produto Não Identificado') as mercadoria,
  COALESCE(p."TIPO", 'OUTROS') as tipo,
  COALESCE(public.parse_currency_sql(p."PREÇO"::TEXT), 0) as preco,
  COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as saldo_inicial,
  public.parse_currency_sql(bd."NOVAS CONSIGNAÇÕES") as entrada_estoque_carro,
  0::NUMERIC as entrada_cliente_carro,
  public.parse_currency_sql(bd."RECOLHIDO") as saida_carro_estoque,
  0::NUMERIC as saida_carro_cliente,
  COALESCE(bd."SALDO FINAL", 0)::NUMERIC as saldo_final,
  COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as estoque_contagem_carro,
  v_total_count
FROM "PRODUTOS" p
LEFT JOIN "BANCO_DE_DADOS" bd ON bd."COD. PRODUTO" = p."ID" 
    AND (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
  ON cfe.produto_id = p."ID" AND cfe.session_id = p_session_id
WHERE 
  (p_search IS NULL OR 
   COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR
   COALESCE(p."CODIGO"::TEXT, '') ILIKE '%' || p_search || '%'
  )
ORDER BY p."PRODUTO" ASC
LIMIT p_page_size
OFFSET v_offset;
END;
$function$;

-- Fix get_inventory_summary_v2 to load all products and match types
DROP FUNCTION IF EXISTS public.get_inventory_summary_v2(bigint, bigint, text);

CREATE OR REPLACE FUNCTION public.get_inventory_summary_v2(
    p_session_id bigint DEFAULT NULL::bigint, 
    p_funcionario_id bigint DEFAULT NULL::bigint, 
    p_search text DEFAULT NULL::text
)
RETURNS TABLE(
    total_saldo_inicial_qtd numeric, 
    total_saldo_inicial_valor numeric, 
    total_saldo_final_qtd numeric, 
    total_saldo_final_valor numeric, 
    total_diferenca_positiva_qtd numeric, 
    total_diferenca_positiva_valor numeric, 
    total_diferenca_negativa_qtd numeric, 
    total_diferenca_negativa_valor numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
WITH calculated_rows AS (
  SELECT
    COALESCE(bd."SALDO INICIAL", 0)::NUMERIC as qtd_inicial,
    COALESCE(bd."SALDO FINAL", 0)::NUMERIC as qtd_final,
    COALESCE(cfe.quantidade, bd."CONTAGEM", 0)::NUMERIC as qtd_contagem,
    COALESCE(public.parse_currency_sql(p."PREÇO"::TEXT), 0) as preco_unit
  FROM "PRODUTOS" p
  LEFT JOIN "BANCO_DE_DADOS" bd ON bd."COD. PRODUTO" = p."ID"
    AND (p_session_id IS NULL OR bd.session_id = p_session_id)
    AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
  LEFT JOIN "CONTAGEM DE ESTOQUE FINAL" cfe 
    ON cfe.produto_id = p."ID" AND cfe.session_id = p_session_id
  WHERE 
    (p_search IS NULL OR 
     COALESCE(p."PRODUTO", '') ILIKE '%' || p_search || '%' OR 
     COALESCE(p."CODIGO"::TEXT, '') ILIKE '%' || p_search || '%'
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

-- Trigger for invisible reopening/closing on Returns/Replacements for Closed Car Stocks
DROP TRIGGER IF EXISTS trg_process_estoque_carro_retroactive ON public."REPOSIÇÃO E DEVOLUÇÃO";

CREATE OR REPLACE FUNCTION public.process_estoque_carro_retroactive()
RETURNS trigger AS $function$
DECLARE
    v_data_fim timestamp;
    v_preco numeric;
    v_produto text;
    v_codigo bigint;
    v_barcode text;
    v_updated boolean;
BEGIN
    IF NEW.id_estoque_carro IS NOT NULL THEN
        SELECT data_fim INTO v_data_fim FROM "ID ESTOQUE CARRO" WHERE id = NEW.id_estoque_carro;
        
        IF v_data_fim IS NOT NULL THEN
            -- "Reabrir" momentaneamente
            UPDATE "ID ESTOQUE CARRO" SET data_fim = NULL WHERE id = NEW.id_estoque_carro;
            
            -- Atualizar Saldo Final de forma correspondente
            IF NEW."TIPO" = 'DEVOLUCAO' OR NEW."TIPO" = 'DEVOLUÇÃO' THEN
                UPDATE "ESTOQUE CARRO SALDO FINAL"
                SET saldo_final = saldo_final - NEW.quantidade
                WHERE id_estoque_carro = NEW.id_estoque_carro AND produto_id = NEW.produto_id;
                v_updated := FOUND;
            ELSIF NEW."TIPO" = 'REPOSICAO' OR NEW."TIPO" = 'REPOSIÇÃO' THEN
                UPDATE "ESTOQUE CARRO SALDO FINAL"
                SET saldo_final = saldo_final + NEW.quantidade
                WHERE id_estoque_carro = NEW.id_estoque_carro AND produto_id = NEW.produto_id;
                v_updated := FOUND;
            END IF;

            IF NOT v_updated THEN
                -- Fetch product details caso o produto não tenha registro de saldo final
                SELECT public.parse_currency_sql("PREÇO"::TEXT), "PRODUTO", "CODIGO", "CÓDIGO BARRAS"
                INTO v_preco, v_produto, v_codigo, v_barcode
                FROM "PRODUTOS" WHERE "ID" = NEW.produto_id;

                INSERT INTO "ESTOQUE CARRO SALDO FINAL" (
                    id_estoque_carro, produto_id, saldo_final, funcionario_id, preco, produto, codigo_produto, barcode
                ) VALUES (
                    NEW.id_estoque_carro, NEW.produto_id, 
                    CASE WHEN NEW."TIPO" = 'DEVOLUCAO' OR NEW."TIPO" = 'DEVOLUÇÃO' THEN -NEW.quantidade ELSE NEW.quantidade END,
                    NEW.funcionario_id, v_preco, v_produto, v_codigo, v_barcode
                );
            END IF;

            -- "Fechar" novamente preservando a mesma data_fim original ou com NOW(). Usaremos NOW() para sinalizar o último update.
            UPDATE "ID ESTOQUE CARRO" SET data_fim = NOW() WHERE id = NEW.id_estoque_carro;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_estoque_carro_retroactive
AFTER INSERT ON public."REPOSIÇÃO E DEVOLUÇÃO"
FOR EACH ROW
EXECUTE FUNCTION public.process_estoque_carro_retroactive();
