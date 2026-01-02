-- Drop PIX table
DROP TABLE IF EXISTS "PIX";

-- Drop Pix specific columns from BANCO_DE_DADOS
ALTER TABLE "BANCO_DE_DADOS" DROP COLUMN IF EXISTS "pix_acerto_confirmado";
ALTER TABLE "BANCO_DE_DADOS" DROP COLUMN IF EXISTS "pix_confirmado_por";

-- Drop Pix specific columns from RECEBIMENTOS
ALTER TABLE "RECEBIMENTOS" DROP COLUMN IF EXISTS "pix_recebimento_confirmado";
ALTER TABLE "RECEBIMENTOS" DROP COLUMN IF EXISTS "pix_confirmado_por";
