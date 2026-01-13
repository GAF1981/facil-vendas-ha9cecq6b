CREATE OR REPLACE FUNCTION transfer_unattended_items_v3(p_old_rota_id BIGINT, p_new_rota_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_rota_inicio TIMESTAMP;
BEGIN
    -- Get old route start date
    SELECT data_inicio INTO v_rota_inicio
    FROM "ROTA"
    WHERE id = p_old_rota_id;

    -- Insert into new route items based on logic
    INSERT INTO "ROTA_ITEMS" (rota_id, cliente_id, vendedor_id, x_na_rota, boleto, agregado)
    SELECT 
        p_new_rota_id,
        ri.cliente_id,
        ri.vendedor_id,
        COALESCE(ri.x_na_rota, 0) + 1,
        ri.boleto,
        ri.agregado
    FROM "ROTA_ITEMS" ri
    WHERE ri.rota_id = p_old_rota_id
    -- Exclude clients who have been attended in the previous route
    -- We use STRICT timestamp comparison to ensure visual consistency with the UI
    -- and to avoid counting overlapping same-day previous-cycle settlements as attended in the current cycle
    AND NOT EXISTS (
        SELECT 1 
        FROM "BANCO_DE_DADOS" bd
        WHERE bd."CÓDIGO DO CLIENTE" = ri.cliente_id
        AND (
            bd."DATA E HORA"::TIMESTAMP >= v_rota_inicio
        )
    )
    -- Also exclude clients who have paid (Recebimentos >= Rota Inicio)
    AND NOT EXISTS (
         SELECT 1
         FROM "RECEBIMENTOS" rec
         WHERE rec.cliente_id = ri.cliente_id
         AND rec.created_at >= v_rota_inicio
    );
END;
$$;
