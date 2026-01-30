-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily report job
-- Runs every day at 07:00 AM UTC (adjust for timezone if needed, usually servers are UTC)
-- Assuming Supabase project URL pattern. 
-- IMPORTANT: The Authorization header needs a valid Service Role Key. 
-- Since we cannot inject secrets here easily in SQL without knowing them, 
-- this serves as the template. The user needs to replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY.
-- In a real Supabase setup, you can access internal networking or use vault, but standard way is direct HTTP.

SELECT cron.schedule(
  'daily-route-report',
  '0 7 * * *',
  $$
  select
    net.http_post(
        url:='https://wuzlqirpjkpnqbqixjmo.supabase.co/functions/v1/send-route-report',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
