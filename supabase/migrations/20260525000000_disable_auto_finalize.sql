-- Remove the automated route finalization cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-finalize-routes');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cron job: %', SQLERRM;
END $$;

-- Drop the unused auto finalize logic function to clean up
DROP FUNCTION IF EXISTS public.auto_finalize_overdue_routes();
