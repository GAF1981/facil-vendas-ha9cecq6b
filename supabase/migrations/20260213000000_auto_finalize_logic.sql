-- Create the automation logic function
-- This function encapsulates the business logic for checking and finalizing overdue routes
CREATE OR REPLACE FUNCTION public.auto_finalize_overdue_routes()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  processed_count INTEGER := 0;
  rota_ids INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
  -- Iterate over open routes that are older than 6 days
  -- Logic: data_fim IS NULL AND data_inicio < (NOW - 6 days)
  -- This identifies routes that have been open for strictly more than 6 days
  FOR r IN
    SELECT * FROM "ROTA"
    WHERE data_fim IS NULL
    AND data_inicio < (NOW() - INTERVAL '6 days')
  LOOP
    -- 1. Update the route to close it by setting data_fim to current timestamp
    UPDATE "ROTA"
    SET data_fim = NOW()
    WHERE id = r.id;

    -- 2. Execute the stock/item increment logic using the existing RPC
    -- Using PERFORM to discard the result as we just need the side effect
    PERFORM public.increment_rota_items_on_finalize(r.id);
    
    -- Track processed IDs for reporting/logging
    rota_ids := array_append(rota_ids, r.id);
    processed_count := processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'finalized_rota_ids', rota_ids
  );
END;
$$;

-- Attempt to schedule the job using pg_cron
-- We use a DO block to handle cases where pg_cron might not be enabled or available
DO $$
BEGIN
  -- Check if pg_cron extension is available/installed
  -- Note: In Supabase, pg_cron is available in the 'extensions' schema
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing job if any to prevent duplicates
    -- We attempt to unschedule by name first
    PERFORM cron.unschedule('auto-finalize-routes');
    
    -- Schedule for Sunday at 14:00 UTC
    -- Cron format: minute hour day_month month day_week
    -- 0 14 * * 0 (Sunday)
    PERFORM cron.schedule(
      'auto-finalize-routes',
      '0 14 * * 0',
      'SELECT public.auto_finalize_overdue_routes()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail migration if cron is not available (e.g. local dev)
  RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END
$$;
