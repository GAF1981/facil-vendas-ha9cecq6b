import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

console.log('Auto Cleanup Duplicates function up and running')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. Find the active route
    const { data: routeData, error: routeError } = await supabaseClient
      .from('ROTA')
      .select('id')
      .is('data_fim', null)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (routeError) throw routeError

    if (!routeData) {
      return new Response(
        JSON.stringify({
          message: 'Nenhuma rota ativa encontrada. Nada a limpar.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const activeRouteId = routeData.id

    // 2. Call the cleanup RPC function
    const { data: cleanupData, error: cleanupError } = await supabaseClient.rpc(
      'cleanup_route_duplicates',
      {
        p_rota_id: activeRouteId,
      },
    )

    if (cleanupError) throw cleanupError

    return new Response(
      JSON.stringify({
        success: true,
        routeId: activeRouteId,
        result: cleanupData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error auto-cleaning duplicates:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
