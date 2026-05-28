CREATE INDEX IF NOT EXISTS idx_rota_items_vendedor_id ON public."ROTA_ITEMS" USING btree (vendedor_id);
CREATE INDEX IF NOT EXISTS idx_rota_items_vendedor_proximo_id ON public."ROTA_ITEMS" USING btree (vendedor_proximo_id);
