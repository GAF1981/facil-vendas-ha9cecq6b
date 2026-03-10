-- Update trigger function to reflect new rules for 'saiu_do_caixa'
CREATE OR REPLACE FUNCTION public.auto_confirm_despesa()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.saiu_do_caixa = true OR NEW.saiu_do_caixa IS NULL THEN
    NEW.status := 'Confirmado';
  ELSE
    IF NEW.status IS NULL OR (NEW.status = 'Confirmado' AND NEW.banco_pagamento IS NULL) THEN
      NEW.status := 'A confirmar';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update existing records to match the new logic
UPDATE public."DESPESAS"
SET status = 'Confirmado'
WHERE (saiu_do_caixa = true OR saiu_do_caixa IS NULL)
  AND status IS DISTINCT FROM 'Confirmado';

UPDATE public."DESPESAS"
SET status = 'A confirmar'
WHERE saiu_do_caixa = false 
  AND banco_pagamento IS NULL 
  AND status IS DISTINCT FROM 'A confirmar';
