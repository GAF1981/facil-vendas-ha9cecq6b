-- 1. Add column to ESTOQUE CARRO: CARRO PARA O ESTOQUE
ALTER TABLE public."ESTOQUE CARRO: CARRO PARA O ESTOQUE" ADD COLUMN IF NOT EXISTS funcionario_id BIGINT;

-- 2. Add column to ESTOQUE CARRO: ESTOQUE PARA O CARRO
ALTER TABLE public."ESTOQUE CARRO: ESTOQUE PARA O CARRO" ADD COLUMN IF NOT EXISTS funcionario_id BIGINT;

-- 3. Add column to ESTOQUE CARRO: CARRO PARA O CLIENTE
ALTER TABLE public."ESTOQUE CARRO: CARRO PARA O CLIENTE" ADD COLUMN IF NOT EXISTS funcionario_id BIGINT;

-- 4. Add column to ESTOQUE CARRO: CLIENTE PARA O CARRO
ALTER TABLE public."ESTOQUE CARRO: CLIENTE PARA O CARRO" ADD COLUMN IF NOT EXISTS funcionario_id BIGINT;

-- 5. Add column to BANCO_DE_DADOS
ALTER TABLE public."BANCO_DE_DADOS" ADD COLUMN IF NOT EXISTS funcionario_id BIGINT;

-- 6. Function to sync the fields
CREATE OR REPLACE FUNCTION public.sync_funcionario_fields()
RETURNS trigger AS $$
BEGIN
  -- For ESTOQUE CARRO tables
  IF TG_TABLE_NAME IN (
    'ESTOQUE CARRO: CARRO PARA O ESTOQUE', 
    'ESTOQUE CARRO: ESTOQUE PARA O CARRO',
    'ESTOQUE CARRO: CARRO PARA O CLIENTE',
    'ESTOQUE CARRO: CLIENTE PARA O CARRO'
  ) THEN
    IF NEW.funcionario_id IS NOT NULL AND (NEW.funcionario IS NULL OR NEW.funcionario = '') THEN
      SELECT nome_completo INTO NEW.funcionario FROM public."FUNCIONARIOS" WHERE id = NEW.funcionario_id;
    END IF;
  END IF;

  -- For BANCO_DE_DADOS
  IF TG_TABLE_NAME = 'BANCO_DE_DADOS' THEN
    IF NEW.funcionario_id IS NOT NULL THEN
      NEW."CODIGO FUNCIONARIO" := NEW.funcionario_id;
      IF NEW."FUNCIONÁRIO" IS NULL OR NEW."FUNCIONÁRIO" = '' THEN
        SELECT nome_completo INTO NEW."FUNCIONÁRIO" FROM public."FUNCIONARIOS" WHERE id = NEW.funcionario_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Triggers
DROP TRIGGER IF EXISTS trg_sync_funcionario_carro_estoque ON public."ESTOQUE CARRO: CARRO PARA O ESTOQUE";
CREATE TRIGGER trg_sync_funcionario_carro_estoque
BEFORE INSERT OR UPDATE ON public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
FOR EACH ROW EXECUTE FUNCTION public.sync_funcionario_fields();

DROP TRIGGER IF EXISTS trg_sync_funcionario_estoque_carro ON public."ESTOQUE CARRO: ESTOQUE PARA O CARRO";
CREATE TRIGGER trg_sync_funcionario_estoque_carro
BEFORE INSERT OR UPDATE ON public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
FOR EACH ROW EXECUTE FUNCTION public.sync_funcionario_fields();

DROP TRIGGER IF EXISTS trg_sync_funcionario_carro_cliente ON public."ESTOQUE CARRO: CARRO PARA O CLIENTE";
CREATE TRIGGER trg_sync_funcionario_carro_cliente
BEFORE INSERT OR UPDATE ON public."ESTOQUE CARRO: CARRO PARA O CLIENTE"
FOR EACH ROW EXECUTE FUNCTION public.sync_funcionario_fields();

DROP TRIGGER IF EXISTS trg_sync_funcionario_cliente_carro ON public."ESTOQUE CARRO: CLIENTE PARA O CARRO";
CREATE TRIGGER trg_sync_funcionario_cliente_carro
BEFORE INSERT OR UPDATE ON public."ESTOQUE CARRO: CLIENTE PARA O CARRO"
FOR EACH ROW EXECUTE FUNCTION public.sync_funcionario_fields();

DROP TRIGGER IF EXISTS trg_sync_funcionario_banco_dados ON public."BANCO_DE_DADOS";
CREATE TRIGGER trg_sync_funcionario_banco_dados
BEFORE INSERT OR UPDATE ON public."BANCO_DE_DADOS"
FOR EACH ROW EXECUTE FUNCTION public.sync_funcionario_fields();
