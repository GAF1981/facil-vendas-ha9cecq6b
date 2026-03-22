BEGIN;

-- 1. Remove from acoes_cobranca_vencimentos (linked to acoes_cobranca)
DELETE FROM public."acoes_cobranca_vencimentos"
WHERE "acao_cobranca_id" IN (
    SELECT id FROM public."acoes_cobranca" WHERE "pedido_id" IN (1060, 1061)
);

-- 2. Remove from acoes_cobranca
DELETE FROM public."acoes_cobranca"
WHERE "pedido_id" IN (1060, 1061);

-- 3. Remove from AÇOES DE COBRANÇA_BACKUP
DELETE FROM public."AÇOES DE COBRANÇA_BACKUP"
WHERE "NÚMERO DO PEDIDO" IN (1060, 1061);

-- 4. Remove from PIX
DELETE FROM public."PIX"
WHERE "venda_id" IN (1060, 1061);

-- 5. Remove from RECEBIMENTOS
DELETE FROM public."RECEBIMENTOS"
WHERE "venda_id" IN (1060, 1061);

-- 6. Remove from BANCO_DE_DADOS
DELETE FROM public."BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" IN (1060, 1061);

-- 7. Remove from debitos_historico
DELETE FROM public."debitos_historico"
WHERE "pedido_id" IN (1060, 1061);

-- 8. Remove from AJUSTE_SALDO_INICIAL
DELETE FROM public."AJUSTE_SALDO_INICIAL"
WHERE "numero_pedido" IN (1060, 1061);

-- 9. Remove from inativar_clientes
DELETE FROM public."inativar_clientes"
WHERE "pedido_id" IN (1060, 1061);

-- 10. Remove from NOTA_FISCAL
DELETE FROM public."NOTA_FISCAL"
WHERE "venda_id" IN (1060, 1061);

-- 11. Remove from notas_fiscais_emitidas
DELETE FROM public."notas_fiscais_emitidas"
WHERE "pedido_id" IN (1060, 1061);

-- 12. Remove from ESTOQUE CARRO tables
DELETE FROM public."ESTOQUE CARRO: CARRO PARA O CLIENTE"
WHERE "pedido" IN (1060, 1061);

DELETE FROM public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
WHERE "pedido" IN (1060, 1061);

DELETE FROM public."ESTOQUE CARRO: CLIENTE PARA O CARRO"
WHERE "pedido" IN (1060, 1061);

DELETE FROM public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
WHERE "pedido" IN (1060, 1061);

-- 13. Remove from RELATORIO_DE_ESTOQUE
DELETE FROM public."RELATORIO_DE_ESTOQUE"
WHERE "numero_pedido" IN (1060, 1061);

-- 14. Ensure Administrador is ATIVO
UPDATE public."FUNCIONARIOS"
SET situacao = 'ATIVO'
WHERE nome_completo ILIKE '%Administrador%';

COMMIT;
