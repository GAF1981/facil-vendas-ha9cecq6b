-- Migration to support smart route finalization and automatic xRota management

-- 1. Function to transfer unattended items to the new route
CREATE OR REPLACE FUNCTION transfer_unattended_items(p_old_rota_id integer, p_new_rota_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data_inicio timestamp;
BEGIN
    -- Get start date of the old route
    SELECT data_inicio INTO v_data_inicio FROM "ROTA" WHERE id = p_old_rota_id;

    -- Insert items for the new route based on unattended clients from the old route
    INSERT INTO "ROTA_ITEMS" (rota_id, cliente_id, x_na_rota, vendedor_id, boleto, agregado)
    SELECT 
        p_new_rota_id,
        ri.cliente_id,
        ri.x_na_rota + 1, -- Increment persistence counter for unattended clients
        ri.vendedor_id,
        ri.boleto,
        ri.agregado
    FROM "ROTA_ITEMS" ri
    WHERE ri.rota_id = p_old_rota_id
    AND NOT EXISTS (
        -- Check for attendance (Acerto) in BANCO_DE_DADOS after route start
        SELECT 1 
        FROM "BANCO_DE_DADOS" bd 
        WHERE bd."CÓDIGO DO CLIENTE" = ri.cliente_id 
        AND (
            CASE 
                WHEN bd."DATA DO ACERTO" ~ '^\d{4}-\d{2}-\d{2}' THEN bd."DATA DO ACERTO"::timestamp 
                ELSE NULL 
            END
        ) >= v_data_inicio
    )
    AND NOT EXISTS (
        -- Check for attendance (Recebimento) in RECEBIMENTOS after route start
        SELECT 1
        FROM "RECEBIMENTOS" rec
        WHERE rec.cliente_id = ri.cliente_id
        AND rec.created_at::timestamp >= v_data_inicio
    );
END;
$$;

-- 2. Trigger Function to reset x_na_rota when attendance occurs
CREATE OR REPLACE FUNCTION reset_x_na_rota_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_rota_id integer;
    v_client_id integer;
BEGIN
    -- Identify the active route (route with no end date)
    SELECT id INTO v_active_rota_id FROM "ROTA" WHERE data_fim IS NULL ORDER BY id DESC LIMIT 1;
    
    IF v_active_rota_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine Client ID based on source table
    IF TG_TABLE_NAME = 'BANCO_DE_DADOS' THEN
        v_client_id := NEW."CÓDIGO DO CLIENTE";
    ELSIF TG_TABLE_NAME = 'RECEBIMENTOS' THEN
        v_client_id := NEW.cliente_id;
    END IF;

    IF v_client_id IS NOT NULL THEN
        -- Reset x_na_rota to 0 for this client in the active route
        UPDATE "ROTA_ITEMS"
        SET x_na_rota = 0
        WHERE rota_id = v_active_rota_id
        AND cliente_id = v_client_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Create/Replace Triggers

-- Trigger for BANCO_DE_DADOS
DROP TRIGGER IF EXISTS trg_reset_x_na_rota_bd ON "BANCO_DE_DADOS";
CREATE TRIGGER trg_reset_x_na_rota_bd
AFTER INSERT ON "BANCO_DE_DADOS"
FOR EACH ROW
EXECUTE FUNCTION reset_x_na_rota_on_activity();

-- Trigger for RECEBIMENTOS
DROP TRIGGER IF EXISTS trg_reset_x_na_rota_rec ON "RECEBIMENTOS";
CREATE TRIGGER trg_reset_x_na_rota_rec
AFTER INSERT ON "RECEBIMENTOS"
FOR EACH ROW
EXECUTE FUNCTION reset_x_na_rota_on_activity();
