import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address } = await req.json()

    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const encodedAddress = encodeURIComponent(address)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FacilVendasApp/1.0',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch from geocoding service')
    }

    const data = await response.json()

    if (data && data.length > 0) {
      const { lat, lon } = data[0]
      return new Response(
        JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    return new Response(JSON.stringify({ lat: null, lon: null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
