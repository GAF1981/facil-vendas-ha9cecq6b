-- Recreate currency parsing functions to remove inline SQL comments 
-- that can cause syntax errors when the Supabase CLI introspects 
-- the database and generates the TypeScript types (src/lib/supabase/types.ts).

CREATE OR REPLACE FUNCTION parse_currency(val_str text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF val_str IS NULL OR val_str = '' THEN
    RETURN 0;
  END IF;
  RETURN CAST(REGEXP_REPLACE(REPLACE(REPLACE(val_str, '.', ''), ',', '.'), '[^0-9.-]', '', 'g') AS numeric);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION safe_cast_numeric(val_str text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF val_str IS NULL OR val_str = '' THEN
    RETURN 0;
  END IF;
  RETURN CAST(REGEXP_REPLACE(REPLACE(REPLACE(val_str, '.', ''), ',', '.'), '[^0-9.-]', '', 'g') AS numeric);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$;

-- Ensure debitos_historico view is clean and uses the updated function
CREATE OR REPLACE VIEW debitos_historico AS
SELECT
    bd."NÚMERO DO PEDIDO" AS pedido_id,
    bd."CÓDIGO DO CLIENTE" AS cliente_codigo,
    bd."CLIENTE" AS cliente_nome,
    bd."DATA DO ACERTO" AS data_acerto,
    bd."HORA DO ACERTO" AS hora_acerto,
    bd."FUNCIONÁRIO" AS vendedor_nome,
    bd."CODIGO FUNCIONARIO" AS vendedor_id,
    MAX(c."GRUPO ROTA") AS rota,
    safe_cast_numeric(MAX(bd."VALOR VENDIDO")) AS valor_venda,
    safe_cast_numeric(MAX(bd."VALOR DEVIDO")) AS saldo_a_pagar,
    COALESCE((
        SELECT SUM(r.valor_pago)
        FROM "RECEBIMENTOS" r
        WHERE r.venda_id = bd."NÚMERO DO PEDIDO"
    ), 0) AS valor_pago,
    GREATEST(0, safe_cast_numeric(MAX(bd."VALOR DEVIDO")) - COALESCE((
        SELECT SUM(r.valor_pago)
        FROM "RECEBIMENTOS" r
        WHERE r.venda_id = bd."NÚMERO DO PEDIDO"
    ), 0)) AS debito,
    safe_cast_numeric(MAX(bd."DESCONTO POR GRUPO")) AS desconto,
    0 AS media_mensal
FROM "BANCO_DE_DADOS" bd
LEFT JOIN "CLIENTES" c ON c."CODIGO" = bd."CÓDIGO DO CLIENTE"
WHERE bd."NÚMERO DO PEDIDO" IS NOT NULL
GROUP BY
    bd."NÚMERO DO PEDIDO",
    bd."CÓDIGO DO CLIENTE",
    bd."CLIENTE",
    bd."DATA DO ACERTO",
    bd."HORA DO ACERTO",
    bd."FUNCIONÁRIO",
    bd."CODIGO FUNCIONARIO";

-- Ensure debitos_com_total_view is clean
CREATE OR REPLACE VIEW debitos_com_total_view AS
SELECT
    dh.cliente_codigo,
    dh.cliente_nome,
    dh.pedido_id,
    dh.data_acerto,
    dh.hora_acerto,
    dh.vendedor_nome,
    dh.rota,
    dh.media_mensal,
    dh.valor_venda,
    dh.saldo_a_pagar,
    dh.valor_pago,
    dh.debito,
    dh.desconto,
    SUM(dh.debito) OVER (PARTITION BY dh.cliente_codigo) AS debito_total
FROM debitos_historico dh;
