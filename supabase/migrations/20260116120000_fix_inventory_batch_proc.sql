CREATE OR REPLACE FUNCTION process_inventory_batch(
  p_session_id INTEGER,
  p_items JSONB,
  p_funcionario_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  item JSONB;
  v_prod_id INTEGER;
  v_prod_code INTEGER;
  v_qty NUMERIC;
  v_price NUMERIC;
  v_prod_name TEXT;
  v_prev_balance NUMERIC;
  v_current_record_id INTEGER;
  v_now TIMESTAMP;
  v_date_str TEXT;
  v_time_str TEXT;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Session ID cannot be null';
  END IF;

  v_now := NOW();
  v_date_str := to_char(v_now, 'YYYY-MM-DD');
  v_time_str := to_char(v_now, 'HH24:MI:SS');

  -- 1. Clear existing counts snapshot for this session to ensure we replace with new batch
  -- This ensures data integrity and prevents duplicate entries if re-saved
  DELETE FROM "CONTAGEM DE ESTOQUE FINAL"
  WHERE session_id = p_session_id;

  -- 2. Loop through items to process
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Safe casting with checks
    v_prod_id := (item->>'productId')::INTEGER;
    
    -- Handle nullable productCode
    IF (item->>'productCode') IS NULL OR (item->>'productCode') = 'null' THEN
       v_prod_code := NULL;
    ELSE
       v_prod_code := (item->>'productCode')::INTEGER;
    END IF;

    -- Default quantity to 0 if missing
    IF (item->>'quantity') IS NULL OR (item->>'quantity') = 'null' THEN
       v_qty := 0;
    ELSE
       v_qty := (item->>'quantity')::NUMERIC;
    END IF;

    v_price := (item->>'price')::NUMERIC;
    v_prod_name := item->>'productName';

    -- Insert into snapshot table
    INSERT INTO "CONTAGEM DE ESTOQUE FINAL" (produto_id, quantidade, session_id, valor_unitario_snapshot)
    VALUES (v_prod_id, v_qty, p_session_id, v_price);

    -- Update BANCO_DE_DADOS Ledger if we have a product code
    -- This table drives the historical reports and session continuity
    IF v_prod_code IS NOT NULL THEN
      -- Check for existing record in this session
      SELECT "ID VENDA ITENS" INTO v_current_record_id
      FROM "BANCO_DE_DADOS"
      WHERE "COD. PRODUTO" = v_prod_code
        AND session_id = p_session_id
      LIMIT 1;

      IF v_current_record_id IS NOT NULL THEN
        -- UPDATE EXISTING:
        -- Overwrite SALDO FINAL and CONTAGEM with the new verified count.
        UPDATE "BANCO_DE_DADOS"
        SET
          "SALDO FINAL" = v_qty,
          "CONTAGEM" = v_qty,
          "DATA DO ACERTO" = v_date_str,
          "HORA DO ACERTO" = v_time_str,
          "CODIGO FUNCIONARIO" = p_funcionario_id
        WHERE "ID VENDA ITENS" = v_current_record_id;
      ELSE
        -- INSERT NEW:
        -- Continuity Logic: Find the closing balance from the previous session.
        -- We prioritize the session with the highest ID that is NOT the current one.
        SELECT "SALDO FINAL" INTO v_prev_balance
        FROM "BANCO_DE_DADOS"
        WHERE "COD. PRODUTO" = v_prod_code
          AND (session_id IS NULL OR session_id != p_session_id)
        ORDER BY 
          session_id DESC NULLS LAST,
          "DATA DO ACERTO" DESC,
          "HORA DO ACERTO" DESC
        LIMIT 1;

        -- Default to 0 if no history exists
        IF v_prev_balance IS NULL THEN
          v_prev_balance := 0;
        END IF;

        INSERT INTO "BANCO_DE_DADOS" (
          "COD. PRODUTO",
          "CODIGO FUNCIONARIO",
          "SALDO FINAL",
          "CONTAGEM",
          "DATA DO ACERTO",
          "HORA DO ACERTO",
          "MERCADORIA",
          "TIPO",
          "SALDO INICIAL",
          "session_id"
        ) VALUES (
          v_prod_code,
          p_funcionario_id,
          v_qty,        -- New Balance becomes Saldo Final
          v_qty,        -- Count
          v_date_str,
          v_time_str,
          v_prod_name,
          'CONTAGEM_FINAL',
          v_prev_balance, -- Carried over Balance from previous session
          p_session_id
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
