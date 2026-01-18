-- Add collection contact fields to CLIENTES
ALTER TABLE "CLIENTES" ADD COLUMN IF NOT EXISTS "telefone_cobranca" TEXT;
ALTER TABLE "CLIENTES" ADD COLUMN IF NOT EXISTS "email_cobranca" TEXT;

-- Add reason column to acoes_cobranca
ALTER TABLE "acoes_cobranca" ADD COLUMN IF NOT EXISTS "motivo" TEXT;

-- Add reason column to RECEBIMENTOS for current status tracking in Billing Tab
ALTER TABLE "RECEBIMENTOS" ADD COLUMN IF NOT EXISTS "motivo" TEXT;
