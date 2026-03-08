BEGIN;

-- Purge all redundant records associated with venda_id 904 in the RECEBIMENTOS table,
-- leaving exactly one record to ensure the payment amount is not inflated.
DELETE FROM "RECEBIMENTOS"
WHERE venda_id = 904
  AND id NOT IN (
    SELECT MIN(id)
    FROM "RECEBIMENTOS"
    WHERE venda_id = 904
  );

-- Recalculate financial debt status for order 904 to ensure 
-- debitos_historico and Resumo Acertos reflect the single transaction.
DO $$
BEGIN
    PERFORM public.update_debito_historico_order(904);
END $$;

COMMIT;
