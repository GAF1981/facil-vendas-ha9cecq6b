-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trg_check_inativo_cobranca ON "CLIENTES";
DROP FUNCTION IF EXISTS check_inativo_cobranca();

DROP TRIGGER IF EXISTS trg_sync_inativo_cobranca_debito ON debitos_historico;
DROP FUNCTION IF EXISTS sync_inativo_cobranca_from_debito();

CREATE OR REPLACE FUNCTION check_inativo_cobranca()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debito NUMERIC;
BEGIN
    IF NEW.situacao IN ('INATIVO', 'INATIVO-COBRANÇA') THEN
        -- Get total debit from debitos_historico
        SELECT COALESCE(SUM(debito), 0) INTO v_total_debito
        FROM debitos_historico
        WHERE cliente_codigo = NEW."CODIGO";

        IF v_total_debito > 0 THEN
            NEW.situacao := 'INATIVO-COBRANÇA';
        ELSE
            NEW.situacao := 'INATIVO';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_inativo_cobranca
BEFORE INSERT OR UPDATE OF situacao ON "CLIENTES"
FOR EACH ROW EXECUTE FUNCTION check_inativo_cobranca();

CREATE OR REPLACE FUNCTION sync_inativo_cobranca_from_debito()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_codigo BIGINT;
    v_total_debito NUMERIC;
    v_situacao TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_cliente_codigo := OLD.cliente_codigo;
    ELSE
        v_cliente_codigo := NEW.cliente_codigo;
    END IF;

    IF v_cliente_codigo IS NOT NULL THEN
        SELECT situacao INTO v_situacao FROM "CLIENTES" WHERE "CODIGO" = v_cliente_codigo;
        
        IF v_situacao IN ('INATIVO', 'INATIVO-COBRANÇA') THEN
            SELECT COALESCE(SUM(debito), 0) INTO v_total_debito
            FROM debitos_historico
            WHERE cliente_codigo = v_cliente_codigo;

            IF v_total_debito > 0 AND v_situacao = 'INATIVO' THEN
                UPDATE "CLIENTES" SET situacao = 'INATIVO-COBRANÇA' WHERE "CODIGO" = v_cliente_codigo;
            ELSIF v_total_debito <= 0 AND v_situacao = 'INATIVO-COBRANÇA' THEN
                UPDATE "CLIENTES" SET situacao = 'INATIVO' WHERE "CODIGO" = v_cliente_codigo;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_inativo_cobranca_debito
AFTER INSERT OR UPDATE OF debito OR DELETE ON debitos_historico
FOR EACH ROW EXECUTE FUNCTION sync_inativo_cobranca_from_debito();

-- Sync existing data
UPDATE "CLIENTES" c
SET situacao = 'INATIVO-COBRANÇA'
FROM (
    SELECT cliente_codigo, COALESCE(SUM(debito), 0) as total_debito
    FROM debitos_historico
    GROUP BY cliente_codigo
) d
WHERE c."CODIGO" = d.cliente_codigo
  AND c.situacao = 'INATIVO'
  AND d.total_debito > 0;

UPDATE "CLIENTES" c
SET situacao = 'INATIVO'
FROM (
    SELECT cliente_codigo, COALESCE(SUM(debito), 0) as total_debito
    FROM debitos_historico
    GROUP BY cliente_codigo
) d
WHERE c."CODIGO" = d.cliente_codigo
  AND c.situacao = 'INATIVO-COBRANÇA'
  AND d.total_debito <= 0;
