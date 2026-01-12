-- Migration to ensure reliable synchronization between BANCO_DE_DADOS and QUANTIDADE DE ESTOQUE FINAL
-- 1. Ensure `banco_de_dados_id` exists for uniqueness linking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QUANTIDADE DE ESTOQUE FINAL' AND column_name = 'banco_de_dados_id') THEN
        ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" ADD COLUMN "banco_de_dados_id" BIGINT;
        CREATE UNIQUE INDEX idx_qef_banco_de_dados_id ON "QUANTIDADE DE ESTOQUE FINAL" ("banco_de_dados_id");
    END IF;
END $$;

-- 2. Create or Replace the Sync Function with robust Logic
CREATE OR REPLACE FUNCTION sync_banco_to_estoque_final()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_preco_num NUMERIC := 0;
    v_saldo_final NUMERIC := 0;
    v_val_produto NUMERIC := 0;
    v_total_pedido NUMERIC := 0;
    v_data_hora TIMESTAMP WITH TIME ZONE;
    v_pedido BIGINT;
    v_id_venda_itens BIGINT;
BEGIN
    -- Only process if NÚMERO DO PEDIDO is present
    IF NEW."NÚMERO DO PEDIDO" IS NULL THEN
        RETURN NEW;
    END IF;

    v_pedido := NEW."NÚMERO DO PEDIDO";
    v_id_venda_itens := NEW."ID VENDA ITENS";

    -- Parse Price robustly handling BR (1.000,00) and US (1000.00) formats
    IF NEW."PREÇO VENDIDO" IS NOT NULL AND NEW."PREÇO VENDIDO" != '' THEN
        BEGIN
            -- Remove 'R$', spaces, and other non-numeric/comma/dot characters
            v_preco_num := REGEXP_REPLACE(NEW."PREÇO VENDIDO", '[^0-9,.]', '', 'g');
            
            -- If format is likely BR (e.g. 1.234,56 or 12,50) - comma is separator
            IF v_preco_num ~ '^[0-9]+(\.[0-9]{3})*,[0-9]+$' OR v_preco_num ~ '^[0-9]+,[0-9]+$' THEN
                 v_preco_num := REPLACE(REPLACE(v_preco_num, '.', ''), ',', '.');
            -- If format is likely US/DB (e.g. 1234.56) - dot is separator
            ELSIF v_preco_num ~ '^[0-9]+(\.[0-9]+)?$' THEN
                 -- already good
                 NULL;
            ELSE
                 -- Fallback or weird format
                 v_preco_num := 0;
            END IF;
            
            -- Cast to numeric
            IF v_preco_num IS NOT NULL AND v_preco_num::text != '' THEN
               v_preco_num := CAST(v_preco_num AS NUMERIC);
            ELSE
               v_preco_num := 0;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_preco_num := 0;
        END;
    END IF;

    -- Calculate Product Value (Stock Value = Final Balance * Sale Price)
    v_saldo_final := COALESCE(NEW."SALDO FINAL", 0);
    v_val_produto := v_saldo_final * v_preco_num;

    -- Determine Data/Hora
    BEGIN
        IF NEW."DATA E HORA" IS NOT NULL THEN
            v_data_hora := NEW."DATA E HORA";
        ELSE
            v_data_hora := (NULLIF(NEW."DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF(NEW."HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_data_hora := NOW();
    END;

    -- Upsert Record into QUANTIDADE DE ESTOQUE FINAL
    -- We use "banco_de_dados_id" (which links to ID VENDA ITENS) as the unique key
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
        v_pedido,
        v_data_hora,
        NEW."CÓDIGO DO CLIENTE",
        NEW."CLIENTE",
        NEW."COD. PRODUTO",
        NEW."MERCADORIA",
        v_saldo_final,
        v_preco_num,
        v_val_produto,
        v_id_venda_itens
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

    -- Calculate Total for this Order (Sum of all products in this order)
    SELECT COALESCE(SUM("VALOR ESTOQUE POR PRODUTO"), 0)
    INTO v_total_pedido
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    WHERE "NUMERO DO PEDIDO" = v_pedido;

    -- Update all records for this order with the aggregated total
    UPDATE "QUANTIDADE DE ESTOQUE FINAL"
    SET "VALOR ESTOQUE SALDO FINAL" = v_total_pedido
    WHERE "NUMERO DO PEDIDO" = v_pedido;

    RETURN NEW;
END;
$$;

-- 3. Create Trigger to keep data in sync on Insert or Update
DROP TRIGGER IF EXISTS trg_sync_stock_final ON "BANCO_DE_DADOS";

CREATE TRIGGER trg_sync_stock_final
AFTER INSERT OR UPDATE ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION sync_banco_to_estoque_final();

-- 4. Force Data Refresh (Backfill)
-- We truncate to remove any stale or duplicated data and re-insert everything from the source of truth (BANCO_DE_DADOS)
TRUNCATE TABLE "QUANTIDADE DE ESTOQUE FINAL";

-- Insert all existing valid records
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
    CASE
        WHEN "PREÇO VENDIDO" IS NULL OR "PREÇO VENDIDO" = '' THEN 0
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE("PREÇO VENDIDO", '.', ''), ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9,]+$' THEN CAST(REPLACE("PREÇO VENDIDO", ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+$' THEN CAST("PREÇO VENDIDO" AS NUMERIC)
        ELSE 0
    END,
    (COALESCE("SALDO FINAL", 0) * 
    CASE
        WHEN "PREÇO VENDIDO" IS NULL OR "PREÇO VENDIDO" = '' THEN 0
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+,[0-9]+$' THEN CAST(REPLACE(REPLACE("PREÇO VENDIDO", '.', ''), ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9,]+$' THEN CAST(REPLACE("PREÇO VENDIDO", ',', '.') AS NUMERIC)
        WHEN "PREÇO VENDIDO" ~ '^[0-9.]+$' THEN CAST("PREÇO VENDIDO" AS NUMERIC)
        ELSE 0
    END),
    "ID VENDA ITENS"
FROM "BANCO_DE_DADOS"
WHERE "NÚMERO DO PEDIDO" IS NOT NULL;

-- 5. Calculate and Update the Total Value per Order for all backfilled rows
WITH order_totals AS (
    SELECT "NUMERO DO PEDIDO", SUM("VALOR ESTOQUE POR PRODUTO") as total
    FROM "QUANTIDADE DE ESTOQUE FINAL"
    GROUP BY "NUMERO DO PEDIDO"
)
UPDATE "QUANTIDADE DE ESTOQUE FINAL" q
SET "VALOR ESTOQUE SALDO FINAL" = ot.total
FROM order_totals ot
WHERE q."NUMERO DO PEDIDO" = ot."NUMERO DO PEDIDO";
