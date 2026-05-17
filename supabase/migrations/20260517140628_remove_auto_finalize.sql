DO $DO_BLOCK$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-finalize-routes');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not unschedule cron job: %', SQLERRM;
END
$DO_BLOCK$;
