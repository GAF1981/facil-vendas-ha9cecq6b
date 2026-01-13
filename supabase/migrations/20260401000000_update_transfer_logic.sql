-- Migration to update transfer_unattended_items logic for intelligent route finalization
-- Preserves x_na_rota and vendedor_id for unattended clients

CREATE OR REPLACE FUNCTION transfer_unattended_items(p_old_rota_id integer, p_new_rota_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data_inicio timestamp;
BEGIN
    -- Get start date of the old route to check for attendance
    SELECT data_inicio INTO v_data_inicio FROM "ROTA" WHERE id = p_old_rota_id;

    -- Insert items for the new route based on unattended clients from the old route
    -- We copy x_na_rota and vendedor_id as is (preserved)
    INSERT INTO "ROTA_ITEMS" (
        rota_id, 
        cliente_id, 
        x_na_rota, 
        vendedor_id, 
        boleto, 
        agregado
    )
    SELECT 
        p_new_rota_id,
        ri.cliente_id,
        ri.x_na_rota, -- Preserved (No increment here, assuming increment happens on assignment or manual update if needed)
        ri.vendedor_id, -- Preserved
        ri.boleto,
        ri.agregado
    FROM "ROTA_ITEMS" ri
    WHERE ri.rota_id = p_old_rota_id
    -- Exclude clients who had attendance (Acerto) in BANCO_DE_DADOS after route start
    AND NOT EXISTS (
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
    -- Exclude clients who had attendance (Recebimento) in RECEBIMENTOS after route start
    AND NOT EXISTS (
        SELECT 1
        FROM "RECEBIMENTOS" rec
        WHERE rec.cliente_id = ri.cliente_id
        AND rec.created_at::timestamp >= v_data_inicio
    );
END;
$$;
