CREATE OR REPLACE FUNCTION public.finalize_route_atomic(p_old_rota_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_rota_id integer;
    v_next_id integer;
BEGIN
    -- 1. Verify if the route is still active
    IF EXISTS (SELECT 1 FROM public."ROTA" WHERE id = p_old_rota_id AND data_fim IS NOT NULL) THEN
        RAISE EXCEPTION 'Route % is already finalized', p_old_rota_id;
    END IF;

    -- 2. Backup sellers safely
    UPDATE public."ROTA_ITEMS"
    SET vendedor_id_backup = vendedor_id
    WHERE rota_id = p_old_rota_id;

    -- 3. Finalize old route
    UPDATE public."ROTA"
    SET data_fim = NOW()
    WHERE id = p_old_rota_id;

    -- 4. Get next route ID safely
    SELECT COALESCE(MAX(id), p_old_rota_id) + 1 INTO v_next_id FROM public."ROTA";

    -- 5. Create new route
    INSERT INTO public."ROTA" (id, data_inicio)
    VALUES (v_next_id, NOW())
    RETURNING id INTO v_new_rota_id;

    -- 6. Transfer unattended items preserving logic
    PERFORM public.transfer_unattended_items_v3(p_old_rota_id, v_new_rota_id);

    RETURN jsonb_build_object(
        'old_rota_id', p_old_rota_id,
        'new_rota_id', v_new_rota_id,
        'status', 'success'
    );
END;
$$;
