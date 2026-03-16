-- Migration: Additive (Cumulative) Update Logic for Inventory Batches
-- Replaces the overwrite logic with an ON CONFLICT / check-then-update logic.

CREATE OR REPLACE FUNCTION public.process_inventory_batch(p_session_id integer, p_items jsonb, p_funcionario_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
  v_cef_id INTEGER;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Session ID cannot be null';
  END IF;

  v_now := NOW();
  v_date_str := to_char(v_now, 'YYYY-MM-DD');
  v_time_str := to_char(v_now, 'HH24:MI:SS');

  -- REMOVED: DELETE FROM "CONTAGEM DE ESTOQUE FINAL" WHERE session_id = p_session_id;

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

    -- Additive logic for CONTAGEM DE ESTOQUE FINAL
    SELECT id INTO v_cef_id FROM "CONTAGEM DE ESTOQUE FINAL" 
    WHERE session_id = p_session_id AND produto_id = v_prod_id LIMIT 1;

    IF v_cef_id IS NOT NULL THEN
      UPDATE "CONTAGEM DE ESTOQUE FINAL"
      SET quantidade = COALESCE(quantidade, 0) + v_qty,
          valor_unitario_snapshot = v_price
      WHERE id = v_cef_id;
    ELSE
      INSERT INTO "CONTAGEM DE ESTOQUE FINAL" (produto_id, quantidade, session_id, valor_unitario_snapshot)
      VALUES (v_prod_id, v_qty, p_session_id, v_price);
    END IF;

    -- Update BANCO_DE_DADOS Ledger if we have a product code
    IF v_prod_code IS NOT NULL THEN
      -- Check for existing record in this session
      SELECT "ID VENDA ITENS" INTO v_current_record_id
      FROM "BANCO_DE_DADOS"
      WHERE "COD. PRODUTO" = v_prod_code
        AND session_id = p_session_id
      LIMIT 1;

      IF v_current_record_id IS NOT NULL THEN
        -- UPDATE EXISTING (ADDITIVE LOGIC)
        UPDATE "BANCO_DE_DADOS"
        SET
          "SALDO FINAL" = COALESCE("SALDO FINAL", 0) + v_qty,
          "CONTAGEM" = COALESCE("CONTAGEM", 0) + v_qty,
          "DATA DO ACERTO" = v_date_str::DATE,
          "HORA DO ACERTO" = v_time_str,
          "CODIGO FUNCIONARIO" = p_funcionario_id
        WHERE "ID VENDA ITENS" = v_current_record_id;
      ELSE
        -- INSERT NEW (v_qty starts as the first addition)
        -- Continuity Logic: Find the closing balance from the previous session.
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
          v_qty,
          v_qty,
          v_date_str::DATE,
          v_time_str,
          v_prod_name,
          'CONTAGEM_FINAL',
          v_prev_balance,
          p_session_id
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;
