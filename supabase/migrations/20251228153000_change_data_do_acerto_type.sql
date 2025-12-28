-- Migration to change DATA DO ACERTO column from text to DATE in BANCO_DE_DADOS table
-- This ensures correct chronological sorting and data integrity as per user story.

-- 1. Sanitize data: Convert empty strings to NULL to avoid casting errors
UPDATE "public"."BANCO_DE_DADOS"
SET "DATA DO ACERTO" = NULL
WHERE "DATA DO ACERTO" = '';

-- 2. Alter the column type to DATE using explicit casting with to_date
-- We use a CASE statement to handle potential format variations and ensuring safe conversion
-- The error "date/time field value out of range" was caused by implicit casting of "DD/MM/YY" format
ALTER TABLE "public"."BANCO_DE_DADOS"
ALTER COLUMN "DATA DO ACERTO" TYPE DATE
USING CASE
    WHEN "DATA DO ACERTO" IS NULL THEN NULL
    -- Matches DD/MM/YY (e.g. 15/12/25)
    WHEN "DATA DO ACERTO" ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$' THEN to_date("DATA DO ACERTO", 'DD/MM/YY')
    -- Matches DD/MM/YYYY (e.g. 15/12/2025)
    WHEN "DATA DO ACERTO" ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN to_date("DATA DO ACERTO", 'DD/MM/YYYY')
    -- Fallback for unparseable formats: NULL
    ELSE NULL
END;

-- 3. Create an index on the DATA DO ACERTO column to improve sorting and filtering performance
CREATE INDEX IF NOT EXISTS "idx_banco_de_dados_data_do_acerto"
ON "public"."BANCO_DE_DADOS" ("DATA DO ACERTO");
