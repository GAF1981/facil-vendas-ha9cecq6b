-- Migration to add missing indices for inventory performance and stability

-- Index on DATAS DE INVENTÁRIO (which acts as the Inventory Session table)
-- This improves filtering sessions by employee, which is a common operation
CREATE INDEX IF NOT EXISTS idx_datas_inventario_funcionario ON "public"."DATAS DE INVENTÁRIO" ("CODIGO FUNCIONARIO");

-- Index on TIPO to quickly separate GERAL from FUNCIONARIO inventories
CREATE INDEX IF NOT EXISTS idx_datas_inventario_tipo ON "public"."DATAS DE INVENTÁRIO" ("TIPO");

-- Redundant safety indices for BANCO_DE_DADOS (in case they weren't applied previously)
-- Crucial for the LEFT JOIN performance in get_inventory_items_paginated
CREATE INDEX IF NOT EXISTS idx_banco_dados_cod_produto ON "public"."BANCO_DE_DADOS" ("COD. PRODUTO");
CREATE INDEX IF NOT EXISTS idx_banco_dados_session_id ON "public"."BANCO_DE_DADOS" ("session_id");

-- Index for the Physical Counts table to ensure fast lookups during joins
CREATE INDEX IF NOT EXISTS idx_contagem_estoque_session_prod ON "public"."CONTAGEM DE ESTOQUE FINAL" ("session_id", "produto_id");
