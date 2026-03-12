-- Insert default configuration for DRE Desconto Cliente
INSERT INTO configuracoes (chave, valor)
VALUES ('dre_desconto_cliente_percentual', '0')
ON CONFLICT (chave) DO NOTHING;
