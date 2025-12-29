-- Add VALOR DEVIDO column to BANCO_DE_DADOS if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BANCO_DE_DADOS' AND column_name = 'VALOR DEVIDO') THEN
        ALTER TABLE "BANCO_DE_DADOS" ADD COLUMN "VALOR DEVIDO" NUMERIC(10,2);
    END IF;
END $$;

-- Update existing rows to populate VALOR DEVIDO based on VALOR VENDIDO and DESCONTO POR GRUPO
-- We handle text conversion for currency (pt-BR format) and percentage
UPDATE "BANCO_DE_DADOS"
SET "VALOR DEVIDO" = (
  CASE
    WHEN "VALOR VENDIDO" IS NULL OR "VALOR VENDIDO" = '' THEN 0
    ELSE CAST(REPLACE(REPLACE("VALOR VENDIDO", '.', ''), ',', '.') AS NUMERIC)
  END
  *
  (
    1 -
    CASE
      WHEN "DESCONTO POR GRUPO" IS NULL OR "DESCONTO POR GRUPO" = '' THEN 0
      WHEN "DESCONTO POR GRUPO" LIKE '%\%%' THEN CAST(REPLACE("DESCONTO POR GRUPO", '%', '') AS NUMERIC) / 100
      ELSE 
        CASE 
          WHEN CAST(REPLACE("DESCONTO POR GRUPO", ',', '.') AS NUMERIC) > 1 THEN CAST(REPLACE("DESCONTO POR GRUPO", ',', '.') AS NUMERIC) / 100
          ELSE CAST(REPLACE("DESCONTO POR GRUPO", ',', '.') AS NUMERIC)
        END
    END
  )
)
WHERE "VALOR DEVIDO" IS NULL;
