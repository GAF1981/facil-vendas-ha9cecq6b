-- Migration to cleanup specific order data (ID 386 to 487)
-- Deleting child records first to maintain referential integrity where cascades are not guaranteed

BEGIN;

-- 1. Delete Payment Related Records
DELETE FROM "PIX" 
WHERE "venda_id" >= 386 AND "venda_id" <= 487;

DELETE FROM "RECEBIMENTOS" 
WHERE "venda_id" >= 386 AND "venda_id" <= 487;

DELETE FROM "notas_fiscais_emitidas" 
WHERE "pedido_id" >= 386 AND "pedido_id" <= 487;

-- 2. Delete Debt & Collection Records
DELETE FROM "debitos_historico" 
WHERE "pedido_id" >= 386 AND "pedido_id" <= 487;

DELETE FROM "acoes_cobranca_vencimentos" 
WHERE "acao_cobranca_id" IN (
    SELECT id FROM "acoes_cobranca" WHERE "pedido_id" >= 386 AND "pedido_id" <= 487
);

DELETE FROM "acoes_cobranca" 
WHERE "pedido_id" >= 386 AND "pedido_id" <= 487;

-- 3. Delete Stock & Reporting Records
DELETE FROM "RELATORIO_DE_ESTOQUE" 
WHERE "numero_pedido" >= 386 AND "numero_pedido" <= 487;

DELETE FROM "ESTOQUE CARRO: CLIENTE PARA O CARRO" 
WHERE "pedido" >= 386 AND "pedido" <= 487;

DELETE FROM "ESTOQUE CARRO: CARRO PARA O CLIENTE" 
WHERE "pedido" >= 386 AND "pedido" <= 487;

DELETE FROM "AJUSTE_SALDO_INICIAL" 
WHERE "numero_pedido" >= 386 AND "numero_pedido" <= 487;

DELETE FROM "inativar_clientes"
WHERE "pedido_id" >= 386 AND "pedido_id" <= 487;

-- 4. Delete Main Order Records
DELETE FROM "BANCO_DE_DADOS" 
WHERE "NÚMERO DO PEDIDO" >= 386 AND "NÚMERO DO PEDIDO" <= 487;

-- 5. Clean up any orphaned Nota Fiscal records if linked by venda_id
DELETE FROM "NOTA_FISCAL"
WHERE "venda_id" >= 386 AND "venda_id" <= 487;

COMMIT;
