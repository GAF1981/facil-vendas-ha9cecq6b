ALTER TABLE "ROTA_ITEMS" ADD COLUMN IF NOT EXISTS "vendedor_proximo_id" INTEGER REFERENCES "FUNCIONARIOS"(id);
CREATE INDEX IF NOT EXISTS idx_rota_items_vendedor_proximo_id ON "ROTA_ITEMS"(vendedor_proximo_id);
