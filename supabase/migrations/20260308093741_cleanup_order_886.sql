BEGIN;

-- 1. Clean up duplicated RECEBIMENTOS for order 886
DELETE FROM "RECEBIMENTOS"
WHERE venda_id = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "RECEBIMENTOS"
    WHERE venda_id = 886
    GROUP BY forma_pagamento, valor_registrado, valor_pago
  );

-- 2. Clean up duplicated ESTOQUE CARRO movements
DELETE FROM "ESTOQUE CARRO: CARRO PARA O CLIENTE"
WHERE pedido = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "ESTOQUE CARRO: CARRO PARA O CLIENTE"
    WHERE pedido = 886
    GROUP BY produto_id, quantidade
  );

DELETE FROM "ESTOQUE CARRO: CLIENTE PARA O CARRO"
WHERE pedido = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "ESTOQUE CARRO: CLIENTE PARA O CARRO"
    WHERE pedido = 886
    GROUP BY produto_id, quantidade
  );

-- 3. Clean up duplicated NOTA_FISCAL records
DELETE FROM "NOTA_FISCAL"
WHERE venda_id = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "NOTA_FISCAL"
    WHERE venda_id = 886
  );

-- 4. Clean up duplicated RELATORIO_DE_ESTOQUE records
DELETE FROM "RELATORIO_DE_ESTOQUE"
WHERE numero_pedido = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "RELATORIO_DE_ESTOQUE"
    WHERE numero_pedido = 886
    GROUP BY produto_nome
  );

-- 5. Clean up duplicated AJUSTE_SALDO_INICIAL
DELETE FROM "AJUSTE_SALDO_INICIAL"
WHERE numero_pedido = 886
  AND id NOT IN (
    SELECT MIN(id)
    FROM "AJUSTE_SALDO_INICIAL"
    WHERE numero_pedido = 886
    GROUP BY produto_id
  );

-- 6. Clean up duplicated BANCO_DE_DADOS records for order 886
DELETE FROM "BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" = 886
  AND "ID VENDA ITENS" NOT IN (
    SELECT MIN("ID VENDA ITENS")
    FROM "BANCO_DE_DADOS"
    WHERE "NÚMERO DO PEDIDO" = 886
    GROUP BY "COD. PRODUTO"
  );

-- 7. Recalculate debitos_historico for order 886 to reflect correct totals
SELECT update_debito_historico_order(886);

COMMIT;
