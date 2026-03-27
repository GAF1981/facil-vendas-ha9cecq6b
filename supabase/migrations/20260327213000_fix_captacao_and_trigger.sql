-- 1. Update the 4 orders directly as requested
UPDATE "BANCO_DE_DADOS"
SET "TIPO" = 'CAPTAÇÃO'
WHERE "NÚMERO DO PEDIDO" IN (3026, 3035, 3037, 3040);

-- 2. Create the protection function and trigger to handle 1-hour window and intermittent connections
CREATE OR REPLACE FUNCTION public.protect_captacao_status()
RETURNS TRIGGER AS $$
DECLARE
    v_last_order RECORD;
BEGIN
    -- Check if the new record is marked as ACERTO or doesn't have a type yet, and has a valid client
    IF (NEW."TIPO" = 'ACERTO' OR NEW."TIPO" IS NULL) AND NEW."CÓDIGO DO CLIENTE" IS NOT NULL THEN
        -- Find the last order type for this client (excluding the current order number if it's already assigned)
        SELECT "TIPO", "DATA E HORA"
        INTO v_last_order
        FROM "BANCO_DE_DADOS"
        WHERE "CÓDIGO DO CLIENTE" = NEW."CÓDIGO DO CLIENTE"
          AND "NÚMERO DO PEDIDO" IS NOT NULL
          AND "NÚMERO DO PEDIDO" IS DISTINCT FROM NEW."NÚMERO DO PEDIDO"
        ORDER BY "DATA E HORA" DESC NULLS LAST, "ID VENDA ITENS" DESC
        LIMIT 1;

        -- If the last order was a CAPTAÇÃO within the last 1 hour
        IF FOUND AND v_last_order."TIPO" = 'CAPTAÇÃO' THEN
            IF v_last_order."DATA E HORA" >= (NOW() - INTERVAL '1 hour') THEN
                -- If no sales or quantity changes (it's basically an empty/duplicate submit due to poor internet)
                IF (public.parse_currency_sql(NEW."QUANTIDADE VENDIDA") = 0) AND 
                   (public.parse_currency_sql(NEW."VALOR VENDIDO") = 0) THEN
                    -- Override the type back to CAPTAÇÃO
                    NEW."TIPO" := 'CAPTAÇÃO';
                END IF;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_captacao ON "BANCO_DE_DADOS";
CREATE TRIGGER trg_protect_captacao
BEFORE INSERT ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION public.protect_captacao_status();
