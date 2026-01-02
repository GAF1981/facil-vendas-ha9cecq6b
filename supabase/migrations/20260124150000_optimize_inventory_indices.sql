-- Migration to add indices for performance optimization on Inventory queries

-- Index on session_id for filtering by inventory session
CREATE INDEX IF NOT EXISTS idx_banco_dados_session_id ON "public"."BANCO_DE_DADOS" ("session_id");

-- Index on CODIGO FUNCIONARIO for filtering by employee
CREATE INDEX IF NOT EXISTS idx_banco_dados_funcionario_id ON "public"."BANCO_DE_DADOS" ("CODIGO FUNCIONARIO");

-- Composite index for when both are used (common in filtering specific session for an employee)
CREATE INDEX IF NOT EXISTS idx_banco_dados_session_func ON "public"."BANCO_DE_DADOS" ("session_id", "CODIGO FUNCIONARIO");

-- Index on COD. PRODUTO to speed up joins with PRODUTOS table
CREATE INDEX IF NOT EXISTS idx_banco_dados_cod_produto ON "public"."BANCO_DE_DADOS" ("COD. PRODUTO");

-- Index on CONTAGEM DE ESTOQUE FINAL for faster lookups of physical counts
CREATE INDEX IF NOT EXISTS idx_contagem_estoque_session_prod ON "public"."CONTAGEM DE ESTOQUE FINAL" ("session_id", "produto_id");
