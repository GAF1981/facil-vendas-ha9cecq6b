-- Migration to enforce automatic synchronization of Stock Values (Controle de Rota)
-- This migration ensures that the 'VALOR ESTOQUE SALDO FINAL' column in 'QUANTIDADE DE ESTOQUE FINAL'
-- is automatically updated whenever data in 'BANCO_DE_DADOS' changes.

-- 1. Ensure required columns exist in the destination table
ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" 
ADD COLUMN IF NOT EXISTS "VALOR ESTOQUE POR PRODUTO" NUMERIC DEFAULT 0;

ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" 
ADD COLUMN IF NOT EXISTS "VALOR ESTOQUE SALDO FINAL" NUMERIC DEFAULT 0;

ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" 
ADD COLUMN IF NOT EXISTS "banco_de_dados_id" BIGINT;

-- 2. Create indices for performance and data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_qef_banco_de_dados_id 
ON "QUANTIDADE DE ESTOQUE FINAL" ("banco_de_dados_id");

CREATE INDEX IF NOT EXISTS idx_qef_pedido_client 
ON "QUANTIDADE DE ESTOQUE FINAL" ("NUMERO DO PEDIDO", "CÓDIGO DO CLIENTE");

-- 3. Define the Trigger Function to handle synchronization
CREATE OR REPLACE FUNCTION sync_stock_values_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_price NUMERIC := 0;
    v_total_stock_value NUMERIC := 0;
    v_row_stock_value NUMERIC := 0;
    v_clean_price TEXT;
    v_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only proceed if we have an Order Number
    IF NEW."NÚMERO DO PEDIDO" IS NULL THEN
        RETURN NEW;
    END IF;

    -- Robust Price Parsing Logic
    -- Handles 'R$ 1.200,50' (BR), '1.200,50', '1200.50' (US), etc.
    BEGIN
        IF NEW."PREÇO VENDIDO" IS NOT NULL AND NEW."PREÇO VENDIDO" != '' THEN
            -- Remove everything except digits, comma, and dot
            v_clean_price := REGEXP_REPLACE(NEW."PREÇO VENDIDO", '[^0-9,.]', '', 'g');
            
            -- Detect format: Comma as decimal separator (BR style: 1.234,56 or 1234,56)
            IF v_clean_price ~ '^[0-9.]+,[0-9]+$' OR v_clean_price ~ '^[0-9]+,[0-9]+$' THEN
                 v_clean_price := REPLACE(REPLACE(v_clean_price, '.', ''), ',', '.');
            -- Detect format: Dot as decimal separator (US style: 1234.56)
            ELSIF v_clean_price ~ '^[0-9]+(\.[0-9]+)?$' THEN
                 -- Format is already correct for casting
                 NULL;
            ELSE
                 -- Fallback for unrecognized formats
                 v_clean_price := '0';
            END IF;
            
            v_price := CAST(v_clean_price AS NUMERIC);
        ELSE
            v_price := 0;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_price := 0;
    END;

    -- Calculate Value for THIS specific item/row
    v_row_stock_value := COALESCE(NEW."SALDO FINAL", 0) * v_price;

    -- Determine Date/Time
    BEGIN
        IF NEW."DATA E HORA" IS NOT NULL THEN
            v_date := NEW."DATA E HORA";
        ELSE
             -- Fallback to combining separate Date/Time columns if available
            v_date := (NULLIF(NEW."DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF(NEW."HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_date := NOW();
    END;

    -- Upsert the record into 'QUANTIDADE DE ESTOQUE FINAL'
    -- Matches on 'banco_de_dados_id' (which maps to 'ID VENDA ITENS')
    INSERT INTO "QUANTIDADE DE ESTOQUE FINAL" (
        "NUMERO DO PEDIDO",
        "DATA E HORA DO ACERTO",
        "CÓDIGO DO CLIENTE",
        "CLIENTE",
        "CÓDIGO DO PRODUTO",
        "MERCADORIA",
        "SALDO FINAL",
        "PREÇO VENDIDO",
        "VALOR ESTOQUE POR PRODUTO",
        "banco_de_dados_id"
    ) VALUES (
        NEW."NÚMERO DO PEDIDO",
        v_date,
        NEW."CÓDIGO DO CLIENTE",
        NEW."CLIENTE",
        NEW."COD. PRODUTO",
        NEW."MERCADORIA",
        COALESCE(NEW."SALDO FINAL", 0),
        v_price,
        v_row_stock_value,
        NEW."ID VENDA ITENS"
    )
    ON CONFLICT ("banco_de_dados_id") DO UPDATE SET
        "NUMERO DO PEDIDO" = EXCLUDED."NUMERO DO PEDIDO",
        "DATA E HORA DO ACERTO" = EXCLUDED."DATA E HORA DO ACERTO",
        "CÓDIGO DO CLIENTE" = EXCLUDED."CÓDIGO DO CLIENTE",
        "CLIENTE" = EXCLUDED."CLIENTE",
        "CÓDIGO DO PRODUTO" = EXCLUDED."CÓDIGO DO PRODUTO",
        "MERCADORIA" = EXCLUDED."MERCADORIA",
        "SALDO FINAL" = EXCLUDED."SALDO FINAL",
        "PREÇO VENDIDO" = EXCLUDED."PREÇO VENDIDO",
        "VALOR ESTOQUE POR PRODUTO" = EXCLUDED."VALOR ESTOQUE POR PRODUTO";

    -- Recalculate the TOTAL Stock Value for the entire Order (Aggregated)
    SELECT COALESCE(SUM("VALOR ESTOQUE POR PRODUTO"), 0)
    INTO v_total_stock_value
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    WHERE "NUMERO DO PEDIDO" = NEW."NÚMERO DO PEDIDO";

    -- Update the 'VALOR ESTOQUE SALDO FINAL' column for ALL rows belonging to this Order
    -- This ensures that any row fetched for this order will have the correct total
    UPDATE "QUANTIDADE DE ESTOQUE FINAL"
    SET "VALOR ESTOQUE SALDO FINAL" = v_total_stock_value
    WHERE "NUMERO DO PEDIDO" = NEW."NÚMERO DO PEDIDO";

    RETURN NEW;
END;
$$;

-- 4. Create or Replace the Trigger on 'BANCO_DE_DADOS'
DROP TRIGGER IF EXISTS trg_auto_sync_stock_values ON "BANCO_DE_DADOS";

CREATE TRIGGER trg_auto_sync_stock_values
AFTER INSERT OR UPDATE ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION sync_stock_values_trigger();

-- 5. Backfill Data (Resync existing data to ensure consistency)
-- Clear current table
TRUNCATE TABLE "QUANTIDADE DE ESTOQUE FINAL";

-- Insert all valid records from source
INSERT INTO "QUANTIDADE DE ESTOQUE FINAL" (
    "NUMERO DO PEDIDO",
    "DATA E HORA DO ACERTO",
    "CÓDIGO DO CLIENTE",
    "CLIENTE",
    "CÓDIGO DO PRODUTO",
    "MERCADORIA",
    "SALDO FINAL",
    "PREÇO VENDIDO",
    "VALOR ESTOQUE POR PRODUTO",
    "banco_de_dados_id"
)
SELECT
    "NÚMERO DO PEDIDO",
    CASE
        WHEN "DATA E HORA" IS NOT NULL THEN "DATA E HORA"
        ELSE (NULLIF("DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF("HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone
    END,
    "CÓDIGO DO CLIENTE",
    "CLIENTE",
    "COD. PRODUTO",
    "MERCADORIA",
    COALESCE("SALDO FINAL", 0),
    -- Parsing Price Logic for Backfill
    CASE 
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9.]+,[0-9]+$' 
            THEN CAST(REPLACE(REPLACE(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9]+,[0-9]+$' 
            THEN CAST(REPLACE(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g'), ',', '.') AS NUMERIC)
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9]+(\.[0-9]+)?$' 
            THEN CAST(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') AS NUMERIC)
        ELSE 0 
    END,
    (COALESCE("SALDO FINAL", 0) * 
    CASE 
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9.]+,[0-9]+$' 
            THEN CAST(REPLACE(REPLACE(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g'), '.', ''), ',', '.') AS NUMERIC)
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9]+,[0-9]+$' 
            THEN CAST(REPLACE(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g'), ',', '.') AS NUMERIC)
        WHEN REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') ~ '^[0-9]+(\.[0-9]+)?$' 
            THEN CAST(REGEXP_REPLACE("PREÇO VENDIDO", '[^0-9,.]', '', 'g') AS NUMERIC)
        ELSE 0 
    END),
    "ID VENDA ITENS"
FROM "BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" IS NOT NULL;

-- Bulk Update the Total Column (Aggregated Sum)
WITH order_totals AS (
    SELECT "NUMERO DO PEDIDO", SUM("VALOR ESTOQUE POR PRODUTO") as total
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    GROUP BY "NUMERO DO PEDIDO"
)
UPDATE "QUANTIDADE DE ESTOQUE FINAL" q
SET "VALOR ESTOQUE SALDO FINAL" = ot.total
FROM order_totals ot
WHERE q."NUMERO DO PEDIDO" = ot."NUMERO DO PEDIDO";
