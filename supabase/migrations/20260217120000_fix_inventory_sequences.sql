-- 1. Synchronize sequences to resolve ID conflicts
DO $$
DECLARE
    seq_name text;
BEGIN
    -- Fix sequence for 'ID Inventário'
    -- This ensures the next ID generated is MAX(id) + 1, resolving the "Falha ao finalizar" due to PK violation
    SELECT pg_get_serial_sequence('"ID Inventário"', 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, (SELECT COALESCE(MAX(id), 0) FROM "ID Inventário"));
    END IF;

    -- Fix sequence for 'sessoes_inventario' (defensive measure)
    SELECT pg_get_serial_sequence('sessoes_inventario', 'id') INTO seq_name;
    IF seq_name IS NOT NULL THEN
        PERFORM setval(seq_name, (SELECT COALESCE(MAX(id), 0) FROM sessoes_inventario));
    END IF;
END $$;

-- 2. Create RPC for robust, atomic session transition
CREATE OR REPLACE FUNCTION start_new_inventory_session()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_new_session_id integer;
    v_last_session_id integer;
    v_new_session_record record;
BEGIN
    -- Close current open sessions
    UPDATE "ID Inventário"
    SET status = 'FECHADO', data_fim = NOW()
    WHERE status = 'ABERTO';

    -- Create new session
    INSERT INTO "ID Inventário" (status, data_inicio)
    VALUES ('ABERTO', NOW())
    RETURNING * INTO v_new_session_record;
    
    v_new_session_id := v_new_session_record.id;

    -- Find last closed session to carry over balances
    SELECT id INTO v_last_session_id
    FROM "ID Inventário"
    WHERE status = 'FECHADO' AND id < v_new_session_id
    ORDER BY id DESC
    LIMIT 1;

    -- Copy balances if last session exists
    IF v_last_session_id IS NOT NULL THEN
        INSERT INTO "ESTOQUE GERAL SALDO INICIAL" (
            id_inventario,
            produto_id,
            saldo_inicial,
            produto,
            preco,
            codigo_produto,
            barcode
        )
        SELECT
            v_new_session_id,
            a.produto_id,
            a.novo_saldo_final,
            p."PRODUTO",
            -- Use existing helper to safely parse currency string to numeric
            parse_currency_sql(p."PREÇO"),
            p."CODIGO",
            CAST(p."CÓDIGO BARRAS" AS TEXT)
        FROM "ESTOQUE GERAL AJUSTES" a
        JOIN "PRODUTOS" p ON a.produto_id = p."ID"
        WHERE a.id_inventario = v_last_session_id;
    END IF;

    RETURN row_to_json(v_new_session_record);
END;
$$;
