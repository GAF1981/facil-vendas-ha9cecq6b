DO $body$
BEGIN
  -- Create trigger function to automatically swap the barcode with internal code on insertion/update
  CREATE OR REPLACE FUNCTION public.fix_brinquedo_codigo()
  RETURNS trigger AS $func$
  BEGIN
      IF NEW."COD. PRODUTO" = 9788532241054 THEN
          NEW."COD. PRODUTO" := 9000013;
      END IF;
      IF NEW."codigo_interno" = '9788532241054' THEN
          NEW."codigo_interno" := '9000013';
      END IF;
      RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  -- Drop if exists
  DROP TRIGGER IF EXISTS fix_brinquedo_codigo_trigger ON public."BANCO_DE_DADOS";

  -- Create trigger
  CREATE TRIGGER fix_brinquedo_codigo_trigger
  BEFORE INSERT OR UPDATE ON public."BANCO_DE_DADOS"
  FOR EACH ROW EXECUTE FUNCTION public.fix_brinquedo_codigo();

  -- Update existing records safely
  UPDATE public."BANCO_DE_DADOS" 
  SET "COD. PRODUTO" = 9000013 
  WHERE "COD. PRODUTO" = 9788532241054;
END $body$;
