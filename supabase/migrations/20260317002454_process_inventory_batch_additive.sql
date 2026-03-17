-- Ensure process_inventory_batch performs additive operations for stock counts
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
  IF p_session_id IS NULL THEN
    RAISE EXCEPTION 'Session ID cannot be null';
  END IF;

  v_now := NOW();
  v_date_str := to_char(v_now, 'YYYY-MM-DD');
  v_time_str := to_char(v_now, 'HH24:MI:SS');

  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (item->>'productId')::INTEGER;

    IF (item->>'productCode') IS NULL OR (item->>'productCode') = 'null' THEN
       v_prod_code := NULL;
    ELSE
       v_prod_code := (item->>'productCode')::INTEGER;
    END IF;

    IF (item->>'quantity') IS NULL OR (item->>'quantity') = 'null' THEN
       v_qty := 0;
    ELSE
       v_qty := (item->>'quantity')::NUMERIC;
    END IF;

    v_price := (item->>'price')::NUMERIC;
    v_prod_name := item->>'productName';

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

    IF v_prod_code IS NOT NULL THEN
      SELECT "ID VENDA ITENS" INTO v_current_record_id
      FROM "BANCO_DE_DADOS"
      WHERE "COD. PRODUTO" = v_prod_code
        AND session_id = p_session_id
      LIMIT 1;

      IF v_current_record_id IS NOT NULL THEN
        UPDATE "BANCO_DE_DADOS"
        SET
          "SALDO FINAL" = COALESCE("SALDO FINAL", 0) + v_qty,
          "CONTAGEM" = COALESCE("CONTAGEM", 0) + v_qty,
          "DATA DO ACERTO" = v_date_str::DATE,
          "HORA DO ACERTO" = v_time_str,
          "CODIGO FUNCIONARIO" = p_funcionario_id
        WHERE "ID VENDA ITENS" = v_current_record_id;
      ELSE
        SELECT "SALDO FINAL" INTO v_prev_balance
        FROM "BANCO_DE_DADOS"
        WHERE "COD. PRODUTO" = v_prod_code
          AND (session_id IS NULL OR session_id != p_session_id)
        ORDER BY 
          session_id DESC NULLS LAST,
          "DATA DO ACERTO" DESC,
          "HORA DO ACERTO" DESC
        LIMIT 1;

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
          v_prev_balance + v_qty,
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

-- Adding RLS to CLIENTES
DROP POLICY IF EXISTS "authenticated_select_clientes" ON public."CLIENTES";
CREATE POLICY "authenticated_select_clientes" ON public."CLIENTES" FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_clientes" ON public."CLIENTES";
CREATE POLICY "authenticated_insert_clientes" ON public."CLIENTES" FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_clientes" ON public."CLIENTES";
CREATE POLICY "authenticated_update_clientes" ON public."CLIENTES" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_clientes" ON public."CLIENTES";
CREATE POLICY "authenticated_delete_clientes" ON public."CLIENTES" FOR DELETE TO authenticated USING (true);
