ALTER TABLE public."ROTA_ITEMS" ADD COLUMN IF NOT EXISTS vendedor_id_backup integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ROTA_ITEMS_vendedor_id_backup_fkey'
  ) THEN
    ALTER TABLE public."ROTA_ITEMS"
    ADD CONSTRAINT "ROTA_ITEMS_vendedor_id_backup_fkey"
    FOREIGN KEY (vendedor_id_backup) REFERENCES public."FUNCIONARIOS"(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_route_clients_backup(p_rota_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public."ROTA_ITEMS"
  SET vendedor_id_backup = vendedor_id
  WHERE rota_id = p_rota_id;
END;
$;

CREATE OR REPLACE FUNCTION public.restore_route_clients_backup(p_rota_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public."ROTA_ITEMS"
  SET vendedor_id = vendedor_id_backup
  WHERE rota_id = p_rota_id;
END;
$;
