-- Migration to add discount to debitos_historico and update stock calculation

-- 1. Add desconto column to debitos_historico
ALTER TABLE public.debitos_historico ADD COLUMN IF NOT EXISTS desconto NUMERIC(10,2) DEFAULT 0;

-- 2. Update the refresh_debitos_historico function to include discount calculation
CREATE OR REPLACE FUNCTION public.refresh_debitos_historico()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.debitos_historico;

    INSERT INTO public.debitos_historico (
        pedido_id,
        data_acerto,
        hora_acerto,
        cliente_codigo,
        cliente_nome,
        rota,
        rota_id,
        vendedor_nome,
        valor_venda,
        valor_pago,
        saldo_a_pagar,
        debito,
        media_mensal,
        desconto
    )
    SELECT
        bd."NÚMERO DO PEDIDO" as pedido_id,
        bd."DATA DO ACERTO" as data_acerto,
        bd."HORA DO ACERTO" as hora_acerto,
        bd."CÓDIGO DO CLIENTE" as cliente_codigo,
        bd.CLIENTE as cliente_nome,
        c."GRUPO ROTA" as rota,
        NULL as rota_id, -- Placeholder as join with ROTA table might be complex or unnecessary for this view
        bd."FUNCIONÁRIO" as vendedor_nome,
        SUM(
            CASE 
                WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                    CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                     CAST(bd."VALOR VENDIDO" AS NUMERIC)
                ELSE 0
            END
        ) as valor_venda,
        COALESCE(SUM(rec.valor_pago), 0) as valor_pago,
        -- Calculate Saldo a Pagar (Net Value after Discount)
        SUM(
            CASE 
                WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                    CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                     CAST(bd."VALOR VENDIDO" AS NUMERIC)
                ELSE 0
            END
        ) - (
            SUM(
                CASE 
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                        CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                         CAST(bd."VALOR VENDIDO" AS NUMERIC)
                ELSE 0
                END
            ) * (
                CASE 
                    WHEN MAX(bd."DESCONTO POR GRUPO") IS NOT NULL AND MAX(bd."DESCONTO POR GRUPO") != '' THEN
                         CAST(REPLACE(MAX(bd."DESCONTO POR GRUPO"), '%', '') AS NUMERIC) / 100
                    ELSE 0
                END
            )
        ) as saldo_a_pagar,
        -- Debito = Saldo a Pagar - Valor Pago
        (
             SUM(
                CASE 
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                        CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                         CAST(bd."VALOR VENDIDO" AS NUMERIC)
                    ELSE 0
                END
            ) - (
                SUM(
                    CASE 
                        WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                            CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                        WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                             CAST(bd."VALOR VENDIDO" AS NUMERIC)
                        ELSE 0
                    END
                ) * (
                    CASE 
                        WHEN MAX(bd."DESCONTO POR GRUPO") IS NOT NULL AND MAX(bd."DESCONTO POR GRUPO") != '' THEN
                             CAST(REPLACE(MAX(bd."DESCONTO POR GRUPO"), '%', '') AS NUMERIC) / 100
                        ELSE 0
                    END
                )
            )
        ) - COALESCE(SUM(rec.valor_pago), 0) as debito,
        0 as media_mensal, -- Logic for media mensal is complex in SQL, kept as 0 for now or update later
        -- Desconto Calculation
        (
             SUM(
                CASE 
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                        CAST(REPLACE(REPLACE(bd."VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
                    WHEN bd."VALOR VENDIDO" ~ '^[0-9\.]+$' THEN
                         CAST(bd."VALOR VENDIDO" AS NUMERIC)
                    ELSE 0
                END
            ) * (
                CASE 
                    WHEN MAX(bd."DESCONTO POR GRUPO") IS NOT NULL AND MAX(bd."DESCONTO POR GRUPO") != '' THEN
                         CAST(REPLACE(MAX(bd."DESCONTO POR GRUPO"), '%', '') AS NUMERIC) / 100
                    ELSE 0
                END
            )
        ) as desconto
    FROM
        public."BANCO_DE_DADOS" bd
    LEFT JOIN
        public."CLIENTES" c ON bd."CÓDIGO DO CLIENTE" = c.CODIGO
    LEFT JOIN
        (SELECT venda_id, SUM(valor_pago) as valor_pago FROM public."RECEBIMENTOS" GROUP BY venda_id) rec
        ON bd."NÚMERO DO PEDIDO" = rec.venda_id
    WHERE
        bd."NÚMERO DO PEDIDO" IS NOT NULL
    GROUP BY
        bd."NÚMERO DO PEDIDO",
        bd."DATA DO ACERTO",
        bd."HORA DO ACERTO",
        bd."CÓDIGO DO CLIENTE",
        bd.CLIENTE,
        c."GRUPO ROTA",
        bd."FUNCIONÁRIO";

END;
$function$;

-- 3. Update get_clients_last_stock_value RPC
-- Logic: For each client, find the last order (max order number). 
-- Then sum(SALDO FINAL * PRICE) for items in that order.

CREATE OR REPLACE FUNCTION public.get_clients_last_stock_value()
 RETURNS TABLE(client_id integer, stock_value numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH LastOrders AS (
        SELECT 
            "CÓDIGO DO CLIENTE" as cid, 
            MAX("NÚMERO DO PEDIDO") as max_oid
        FROM public."BANCO_DE_DADOS"
        WHERE "NÚMERO DO PEDIDO" IS NOT NULL
        GROUP BY "CÓDIGO DO CLIENTE"
    ),
    OrderItems AS (
        SELECT 
            bd."CÓDIGO DO CLIENTE",
            bd."COD. PRODUTO",
            bd."SALDO FINAL"
        FROM public."BANCO_DE_DADOS" bd
        JOIN LastOrders lo ON bd."NÚMERO DO PEDIDO" = lo.max_oid
    )
    SELECT
        oi."CÓDIGO DO CLIENTE" as client_id,
        COALESCE(SUM(
            oi."SALDO FINAL" * 
            CASE 
                WHEN p."PREÇO" ~ '^[0-9\.]+,[0-9]{2}$' THEN
                    CAST(REPLACE(REPLACE(p."PREÇO", '.', ''), ',', '.') AS NUMERIC)
                WHEN p."PREÇO" ~ '^[0-9\.]+$' THEN
                     CAST(p."PREÇO" AS NUMERIC)
                ELSE 0
            END
        ), 0) as stock_value
    FROM OrderItems oi
    LEFT JOIN public."PRODUTOS" p ON oi."COD. PRODUTO" = p."ID"
    GROUP BY oi."CÓDIGO DO CLIENTE";
END;
$function$;
