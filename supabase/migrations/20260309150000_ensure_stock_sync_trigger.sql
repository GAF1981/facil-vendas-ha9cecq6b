-- Migration to ensure synchronization between BANCO_DE_DADOS and QUANTIDADE DE ESTOQUE FINAL
-- This ensures that any update in BANCO_DE_DADOS reflects in the stock table for accurate values

-- 1. Ensure columns and indexes exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QUANTIDADE DE ESTOQUE FINAL' AND column_name = 'banco_de_dados_id') THEN
        ALTER TABLE "QUANTIDADE DE ESTOQUE FINAL" ADD COLUMN "banco_de_dados_id" BIGINT;
        CREATE UNIQUE INDEX idx_qef_banco_de_dados_id ON "QUANTIDADE DE ESTOQUE FINAL" ("banco_de_dados_id");
    END IF;
END $$;

-- 2. Create or Replace the Sync Function
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
BEGIN
    -- Only process if NÚMERO DO PEDIDO is present
    IF NEW."NÚMERO DO PEDIDO" IS NULL THEN
        RETURN NEW;
    END IF;

    v_pedido := NEW."NÚMERO DO PEDIDO";

    -- Parse Price (handling different formats: 1.234,56 | 1234,56 | 1234.56)
    IF NEW."PREÇO VENDIDO" IS NOT NULL AND NEW."PREÇO VENDIDO" != '' THEN
        IF NEW."PREÇO VENDIDO" ~ '^[0-9.]+,[0-9]+$' THEN
            v_preco_num := CAST(REPLACE(REPLACE(NEW."PREÇO VENDIDO", '.', ''), ',', '.') AS NUMERIC);
        ELSIF NEW."PREÇO VENDIDO" ~ '^[0-9,]+$' THEN
            v_preco_num := CAST(REPLACE(NEW."PREÇO VENDIDO", ',', '.') AS NUMERIC);
        ELSIF NEW."PREÇO VENDIDO" ~ '^[0-9.]+$' THEN
            v_preco_num := CAST(NEW."PREÇO VENDIDO" AS NUMERIC);
        END IF;
    END IF;

    -- Calculate Product Value (Saldo Final * Preço Vendido)
    v_saldo_final := COALESCE(NEW."SALDO FINAL", 0);
    v_val_produto := v_saldo_final * v_preco_num;

    -- Determine Data/Hora
    IF NEW."DATA E HORA" IS NOT NULL THEN
        v_data_hora := NEW."DATA E HORA";
    ELSE
        -- Fallback logic for date parsing
        BEGIN
            v_data_hora := (NULLIF(NEW."DATA DO ACERTO"::text, '') || ' ' || COALESCE(NULLIF(NEW."HORA DO ACERTO"::text, ''), '00:00:00'))::timestamp with time zone;
        EXCEPTION WHEN OTHERS THEN
            v_data_hora := NOW();
        END;
    END IF;

    -- Upsert Record into QUANTIDADE DE ESTOQUE FINAL
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

    -- Calculate Total for this Order (Aggregation of all items for the order)
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

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trg_sync_stock_final ON "BANCO_DE_DADOS";

CREATE TRIGGER trg_sync_stock_final
AFTER INSERT OR UPDATE ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION sync_banco_to_estoque_final();
