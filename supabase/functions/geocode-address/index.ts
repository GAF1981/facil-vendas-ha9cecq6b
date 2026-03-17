import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body
    try {
      body = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing JSON body' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const { address } = body

    if (!address || typeof address !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Address string is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const encodedAddress = encodeURIComponent(address)

    // Support an optional Google Maps API Key if configured in Supabase Edge Function environment
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')

    let lat: number | null = null
    let lon: number | null = null

    if (googleApiKey) {
      // 1. Google Maps Geocoding API Strategy
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleApiKey}`
      const response = await fetch(url)

      if (!response.ok) {
        let errorText = response.statusText
        try {
          const text = await response.text()
          if (text) errorText = text.substring(0, 100)
        } catch (e) {
          // ignore
        }

        return new Response(
          JSON.stringify({
            lat: null,
            lon: null,
            error: `Google Maps API error: ${response.status} ${errorText}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      const data = await response.json()

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        lat = data.results[0].geometry.location.lat
        lon = data.results[0].geometry.location.lng
      } else if (data.status === 'ZERO_RESULTS') {
        return new Response(
          JSON.stringify({
            lat: null,
            lon: null,
            error: 'Address not found by Google Maps',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      } else {
        return new Response(
          JSON.stringify({
            lat: null,
            lon: null,
            error: `Geocoding failed with status: ${data.status}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    } else {
      // 2. Nominatim OpenStreetMap Free Geocoding API Strategy (Fallback)
      const fetchNominatim = async (query: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'FacilVendasApp/1.0 (admin@facilvendas.com)',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
        })
        if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)
        const data = await res.json()
        if (data && Array.isArray(data) && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
        }
        return null
      }

      try {
        let coords = await fetchNominatim(address)

        // If not found, try a simplified address (fallback)
        if (!coords) {
          const parts = address.split(',')
          if (parts.length >= 3) {
            const simplifiedAddress = `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`
            coords = await fetchNominatim(simplifiedAddress)
          }
        }

        if (coords) {
          lat = coords.lat
          lon = coords.lon
        } else {
          return new Response(
            JSON.stringify({
              lat: null,
              lon: null,
              error: 'Address not found by Nominatim',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      } catch (e: any) {
        return new Response(
          JSON.stringify({ lat: null, lon: null, error: e.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    if (lat !== null && lon !== null) {
      return new Response(JSON.stringify({ lat, lon }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Fallback if something weird happens
    return new Response(
      JSON.stringify({
        lat: null,
        lon: null,
        error: 'Failed to extract coordinates',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        lat: null,
        lon: null,
        error: error.message || 'Internal Server Error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})
