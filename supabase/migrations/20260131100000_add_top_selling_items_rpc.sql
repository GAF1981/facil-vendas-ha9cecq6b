CREATE OR REPLACE FUNCTION get_top_selling_items(start_date text, end_date text)
RETURNS TABLE (
  produto_nome text,
  produto_codigo integer,
  quantidade_total numeric,
  valor_total numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    "MERCADORIA" as produto_nome,
    "COD. PRODUTO" as produto_codigo,
    SUM(
        CASE 
            WHEN "QUANTIDADE VENDIDA" IS NULL OR "QUANTIDADE VENDIDA" = '' THEN 0 
            ELSE CAST(REPLACE(REPLACE("QUANTIDADE VENDIDA", '.', ''), ',', '.') AS numeric) 
        END
    ) as quantidade_total,
    SUM(
        CASE 
            WHEN "VALOR VENDIDO" IS NULL OR "VALOR VENDIDO" = '' THEN 0 
            ELSE CAST(REPLACE(REPLACE("VALOR VENDIDO", '.', ''), ',', '.') AS numeric) 
        END
    ) as valor_total
  FROM
    "BANCO_DE_DADOS"
  WHERE
    "DATA DO ACERTO" >= start_date AND "DATA DO ACERTO" <= end_date
    AND "MERCADORIA" IS NOT NULL
  GROUP BY
    "MERCADORIA", "COD. PRODUTO"
  ORDER BY
    quantidade_total DESC;
END;
$$;
