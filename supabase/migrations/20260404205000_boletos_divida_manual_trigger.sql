DO $$
BEGIN
  ALTER TABLE public.boletos ADD COLUMN IF NOT EXISTS is_divida_manual boolean DEFAULT false;
END $$;

CREATE OR REPLACE FUNCTION public.auto_conferir_boletos_divida()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- If inserting/updating a boleto
    IF TG_TABLE_NAME = 'boletos' THEN
        IF NEW.conferido = false THEN
            IF EXISTS (
                SELECT 1 FROM public.dividas_manuais d 
                WHERE d.cliente_id = NEW.cliente_codigo 
                  AND d.vencimento = NEW.vencimento 
                  AND d.forma_pagamento ILIKE '%boleto%'
            ) THEN
                NEW.conferido := true;
                NEW.is_divida_manual := true;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- If inserting/updating a divida_manual
    IF TG_TABLE_NAME = 'dividas_manuais' THEN
        IF NEW.forma_pagamento ILIKE '%boleto%' THEN
            UPDATE public.boletos
            SET conferido = true, is_divida_manual = true
            WHERE cliente_codigo = NEW.cliente_id
              AND vencimento = NEW.vencimento
              AND conferido = false;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_conferir_boletos ON public.boletos;
CREATE TRIGGER trg_auto_conferir_boletos
BEFORE INSERT OR UPDATE ON public.boletos
FOR EACH ROW EXECUTE FUNCTION public.auto_conferir_boletos_divida();

DROP TRIGGER IF EXISTS trg_auto_conferir_boletos_divida ON public.dividas_manuais;
CREATE TRIGGER trg_auto_conferir_boletos_divida
AFTER INSERT OR UPDATE ON public.dividas_manuais
FOR EACH ROW EXECUTE FUNCTION public.auto_conferir_boletos_divida();
