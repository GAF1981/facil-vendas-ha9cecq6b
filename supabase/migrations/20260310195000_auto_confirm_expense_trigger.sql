-- Function to automatically mark expenses as "Confirmado" if they don't come from the cash register
CREATE OR REPLACE FUNCTION public.auto_confirm_despesa()
RETURNS trigger AS $$
BEGIN
  IF NEW.saiu_do_caixa = false THEN
    NEW.status := 'Confirmado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run before insert or update on DESPESAS
DROP TRIGGER IF EXISTS on_despesa_auto_confirm ON public."DESPESAS";
CREATE TRIGGER on_despesa_auto_confirm
  BEFORE INSERT OR UPDATE OF saiu_do_caixa, status ON public."DESPESAS"
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_despesa();

-- Update existing records to reflect this new rule
UPDATE public."DESPESAS"
SET status = 'Confirmado'
WHERE saiu_do_caixa = false AND (status IS NULL OR status = 'A confirmar');
