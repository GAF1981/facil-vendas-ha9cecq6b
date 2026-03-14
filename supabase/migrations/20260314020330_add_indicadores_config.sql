-- Adiciona a chave de configuração para os Indicadores (Dias sem ação de Cobrança)
INSERT INTO configuracoes (chave, valor) 
VALUES ('dias_sem_acao_cobranca', '10') 
ON CONFLICT (chave) DO NOTHING;
