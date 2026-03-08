-- Migration to cleanup duplicate and triplicate entries for specific orders (904 and 916)

BEGIN;

-- 1. Remove duplicate entries from the main sales table (BANCO_DE_DADOS)
-- Grouping by Order Number and Product Code to ensure we keep exactly one of each item per order
DELETE FROM "BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" IN (904, 916)
  AND "ID VENDA ITENS" NOT IN (
    SELECT MIN("ID VENDA ITENS")
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" IN (904, 916)
    GROUP BY "NÚMERO DO PEDIDO", "COD. PRODUTO"
  );

-- 2. Remove duplicate payment entries from RECEBIMENTOS
-- Grouping by order, payment form, and value to remove identical duplicate payments
DELETE FROM "RECEBIMENTOS"
WHERE venda_id IN (904, 916)
  AND id NOT IN (
    SELECT MIN(id)
    FROM "RECEBIMENTOS"
    WHERE venda_id IN (904, 916)
    GROUP BY venda_id, forma_pagamento, valor_pago
  );

-- 3. Recalculate financial debt status for these orders to ensure data accuracy
-- The delete trigger on BANCO_DE_DADOS doesn't cover DELETE operations, so we recalculate manually
DO $$
BEGIN
    PERFORM public.update_debito_historico_order(904);
    PERFORM public.update_debito_historico_order(916);
END $$;

COMMIT;
