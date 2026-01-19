ALTER TABLE "fechamento_caixa" ADD COLUMN IF NOT EXISTS "valor_boleto" NUMERIC DEFAULT 0;
ALTER TABLE "fechamento_caixa" ADD COLUMN IF NOT EXISTS "boleto_aprovado" BOOLEAN DEFAULT FALSE;

