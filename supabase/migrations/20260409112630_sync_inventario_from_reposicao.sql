DO $$
BEGIN
  -- 1. Drop the trigger and function if they already exist to maintain idempotency
  DROP TRIGGER IF EXISTS trg_sync_inventario_from_reposicao ON public."REPOSIÇÃO E DEVOLUÇÃO";
  DROP FUNCTION IF EXISTS public.sync_inventario_from_reposicao();
END $$;

CREATE OR REPLACE FUNCTION public.sync_inventario_from_reposicao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_id_inventario bigint;
    v_record_id bigint;
    v_produto_nome text;
    v_preco numeric;
BEGIN
    -- Locate the currently OPEN general inventory session
    SELECT id INTO v_id_inventario
    FROM public."ID Inventário"
    WHERE status = 'ABERTO'
    ORDER BY id DESC
    LIMIT 1;

    IF v_id_inventario IS NOT NULL THEN
        -- Check if the product already exists in BANCO_DE_DADOS for this session
        SELECT "ID VENDA ITENS" INTO v_record_id
        FROM public."BANCO_DE_DADOS"
        WHERE session_id = v_id_inventario
          AND "COD. PRODUTO" = NEW.produto_id
        LIMIT 1;

        IF v_record_id IS NOT NULL THEN
            IF NEW."TIPO" = 'DEVOLUCAO' OR NEW."TIPO" = 'DEVOLUÇÃO' THEN
                -- Increment RECOLHIDO (which represents CARRO PARA ESTOQUE in General Inventory)
                UPDATE public."BANCO_DE_DADOS"
                SET "RECOLHIDO" = (COALESCE(public.parse_currency_sql("RECOLHIDO"::text), 0) + NEW.quantidade)::text,
                    "SALDO FINAL" = COALESCE("SALDO FINAL", 0) + NEW.quantidade
                WHERE "ID VENDA ITENS" = v_record_id;
                
            ELSIF NEW."TIPO" = 'REPOSICAO' OR NEW."TIPO" = 'REPOSIÇÃO' THEN
                -- Increment NOVAS CONSIGNAÇÕES (which represents ESTOQUE PARA CARRO in General Inventory)
                UPDATE public."BANCO_DE_DADOS"
                SET "NOVAS CONSIGNAÇÕES" = (COALESCE(public.parse_currency_sql("NOVAS CONSIGNAÇÕES"::text), 0) + NEW.quantidade)::text,
                    "SALDO FINAL" = GREATEST(0, COALESCE("SALDO FINAL", 0) - NEW.quantidade)
                WHERE "ID VENDA ITENS" = v_record_id;
            END IF;
        ELSE
            -- Insert the product if it doesn't exist
            SELECT "PRODUTO", public.parse_currency_sql("PREÇO"::text) INTO v_produto_nome, v_preco
            FROM public."PRODUTOS"
            WHERE "ID" = NEW.produto_id;

            IF NEW."TIPO" = 'DEVOLUCAO' OR NEW."TIPO" = 'DEVOLUÇÃO' THEN
                INSERT INTO public."BANCO_DE_DADOS" (
                    session_id, "COD. PRODUTO", "MERCADORIA", "RECOLHIDO", "SALDO FINAL", "SALDO INICIAL", "TIPO"
                ) VALUES (
                    v_id_inventario, NEW.produto_id, v_produto_nome, NEW.quantidade::text, NEW.quantidade, 0, 'AJUSTE_INVENTARIO'
                );
            ELSIF NEW."TIPO" = 'REPOSICAO' OR NEW."TIPO" = 'REPOSIÇÃO' THEN
                INSERT INTO public."BANCO_DE_DADOS" (
                    session_id, "COD. PRODUTO", "MERCADORIA", "NOVAS CONSIGNAÇÕES", "SALDO FINAL", "SALDO INICIAL", "TIPO"
                ) VALUES (
                    v_id_inventario, NEW.produto_id, v_produto_nome, NEW.quantidade::text, 0, 0, 'AJUSTE_INVENTARIO'
                );
            END IF;
        END IF;

        -- Also ensure the audit tables for general inventory are updated to keep the detailed trace,
        -- but avoid duplicates if the front-end (e.g. inventoryGeneralService) already inserted it within the last 5 seconds.
        IF NEW."TIPO" = 'DEVOLUCAO' OR NEW."TIPO" = 'DEVOLUÇÃO' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public."ESTOQUE GERAL CARRO PARA ESTOQUE"
                WHERE id_inventario = v_id_inventario
                  AND produto_id = NEW.produto_id
                  AND quantidade = NEW.quantidade
                  AND (funcionario_id = NEW.funcionario_id OR (funcionario_id IS NULL AND NEW.funcionario_id IS NULL))
                  AND created_at >= NOW() - INTERVAL '5 seconds'
            ) THEN
                INSERT INTO public."ESTOQUE GERAL CARRO PARA ESTOQUE" (
                    id_inventario, produto_id, quantidade, funcionario_id
                ) VALUES (
                    v_id_inventario, NEW.produto_id, NEW.quantidade, NEW.funcionario_id
                );
            END IF;
        ELSIF NEW."TIPO" = 'REPOSICAO' OR NEW."TIPO" = 'REPOSIÇÃO' THEN
            IF NOT EXISTS (
                SELECT 1 FROM public."ESTOQUE GERAL ESTOQUE PARA CARRO"
                WHERE id_inventario = v_id_inventario
                  AND produto_id = NEW.produto_id
                  AND quantidade = NEW.quantidade
                  AND (funcionario_id = NEW.funcionario_id OR (funcionario_id IS NULL AND NEW.funcionario_id IS NULL))
                  AND created_at >= NOW() - INTERVAL '5 seconds'
            ) THEN
                INSERT INTO public."ESTOQUE GERAL ESTOQUE PARA CARRO" (
                    id_inventario, produto_id, quantidade, funcionario_id
                ) VALUES (
                    v_id_inventario, NEW.produto_id, NEW.quantidade, NEW.funcionario_id
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_inventario_from_reposicao
AFTER INSERT ON public."REPOSIÇÃO E DEVOLUÇÃO"
FOR EACH ROW EXECUTE FUNCTION public.sync_inventario_from_reposicao();
