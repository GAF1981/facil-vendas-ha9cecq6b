-- Remove the cron job if it exists (requires pg_cron, which Supabase uses via cron.job)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Delete the cron job that schedules this function
    DELETE FROM cron.job WHERE command ILIKE '%auto_finalize_overdue_routes%';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if pg_cron is not accessible
END $$;

-- Drop the function to prevent any automatic finalization
DROP FUNCTION IF EXISTS public.auto_finalize_overdue_routes();
