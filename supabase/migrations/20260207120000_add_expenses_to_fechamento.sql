ALTER TABLE "fechamento_caixa" ADD COLUMN IF NOT EXISTS "valor_despesas" NUMERIC DEFAULT 0;
ALTER TABLE "fechamento_caixa" ADD COLUMN IF NOT EXISTS "despesas_aprovadas" BOOLEAN DEFAULT FALSE;
