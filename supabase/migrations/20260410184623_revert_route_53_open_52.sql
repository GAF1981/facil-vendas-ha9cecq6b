DO $$
BEGIN
    -- Mover possíveis registros que foram atrelados acidentalmente à rota 53 de volta para a rota 52
    UPDATE public."DESPESAS" SET rota_id = 52 WHERE rota_id = 53;
    UPDATE public."fechamento_caixa" SET rota_id = 52 WHERE rota_id = 53;
    UPDATE public."RECEBIMENTOS" SET rota_id = 52 WHERE rota_id = 53;
    UPDATE public."debitos_historico" SET rota_id = 52 WHERE rota_id = 53;

    -- Remove todos os itens da rota 53
    DELETE FROM public."ROTA_ITEMS" WHERE rota_id = 53;
    
    -- Remove a rota 53
    DELETE FROM public."ROTA" WHERE id = 53;
    
    -- Reabre a rota 52
    UPDATE public."ROTA" SET data_fim = NULL WHERE id = 52;
END $$;
