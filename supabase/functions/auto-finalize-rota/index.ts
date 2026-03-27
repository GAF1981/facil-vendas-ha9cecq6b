import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Auto Finalize Rota function up and running')

Deno.serve(async (req) => {
  // Handle CORS for browser invocations
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase Client
    // We use the service role key to ensure we have permission to execute the RPC
    // and bypass any RLS that might restrict visibility of routes
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the Database Function we created in the migration
    // This keeps the logic centralized in the database
    const { data, error } = await supabaseClient.rpc('auto_finalize_overdue_routes')

    if (error) {
      console.error('Error executing auto_finalize_overdue_routes:', error)
      throw error
    }

    // Return the result (number of routes processed)
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
