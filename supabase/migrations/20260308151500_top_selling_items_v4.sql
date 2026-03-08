CREATE OR REPLACE FUNCTION public.get_top_selling_items_v4(
    start_date text,
    end_date text,
    p_funcionario_id integer DEFAULT NULL::integer,
    p_grupo text DEFAULT NULL::text
)
RETURNS TABLE(
    produto_nome text,
    produto_codigo bigint,
    quantidade_total numeric,
    valor_total numeric,
    estoque_inicial_total numeric,
    tipo text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    bd."MERCADORIA" as produto_nome,
    bd."COD. PRODUTO" as produto_codigo,
    SUM(public.parse_currency_sql(bd."QUANTIDADE VENDIDA"::text)) as quantidade_total,
    SUM(public.parse_currency_sql(bd."VALOR VENDIDO"::text)) as valor_total,
    SUM(COALESCE(bd."SALDO INICIAL", 0)) as estoque_inicial_total,
    MAX(p."TIPO") as tipo
  FROM
    "BANCO_DE_DADOS" bd
  LEFT JOIN "PRODUTOS" p ON bd."COD. PRODUTO" = p."ID"
  WHERE
    bd."DATA DO ACERTO" >= start_date::date AND bd."DATA DO ACERTO" <= end_date::date
    AND bd."MERCADORIA" IS NOT NULL
    AND (p_funcionario_id IS NULL OR bd."CODIGO FUNCIONARIO" = p_funcionario_id)
    AND (p_grupo IS NULL OR p_grupo = '' OR p_grupo = 'todos' OR p."GRUPO" = p_grupo)
  GROUP BY
    bd."MERCADORIA", bd."COD. PRODUTO"
  ORDER BY
    quantidade_total DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_unique_product_types()
RETURNS TABLE(tipo text)
LANGUAGE sql
AS $function$
  SELECT DISTINCT "TIPO"
  FROM "PRODUTOS"
  WHERE "TIPO" IS NOT NULL AND "TIPO" <> ''
  ORDER BY "TIPO";
$function$;
