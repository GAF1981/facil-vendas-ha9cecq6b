import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Send Route Report function up and running')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 0. Fetch configured email recipient
    const { data: configData, error: configError } = await supabaseClient
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'email_destinatario_relatorio')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching config:', configError)
      // Fallback or continue? We'll assume admin if missing, but logging is important.
    }

    const recipientEmail = configData?.valor || 'admin@example.com'

    // Fetch data for the report
    // We join ROTA_ITEMS with CLIENTES, FUNCIONARIOS and ROTA to get readable names
    // 1. Get latest route ID
    const { data: routeData } = await supabaseClient
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    const routeId = routeData?.id

    if (!routeId) {
      throw new Error('No route found')
    }

    // 2. Fetch items for this route
    const { data: items, error: itemsError } = await supabaseClient
      .from('ROTA_ITEMS')
      .select(
        `
        rota_id,
        tarefas,
        agregado,
        boleto,
        vendedor_id,
        ROTA ( data_inicio ),
        CLIENTES ( "NOME CLIENTE" ),
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .eq('rota_id', routeId)

    if (itemsError) throw itemsError

    // 3. Generate CSV
    const csvHeader = [
      'ID Rota',
      'Data Início',
      'Cliente',
      'Vendedor',
      'Tarefas',
      'Agregado',
      'Boleto',
    ].join(',')

    const csvRows = items.map((item: any) => {
      const dataInicio = item.ROTA?.data_inicio
        ? new Date(item.ROTA.data_inicio).toLocaleDateString('pt-BR')
        : ''
      const cliente = (item.CLIENTES?.['NOME CLIENTE'] || '').replace(
        /"/g,
        '""',
      )
      const vendedor = (item.FUNCIONARIOS?.nome_completo || '').replace(
        /"/g,
        '""',
      )
      const tarefas = (item.tarefas || '').replace(/"/g, '""')
      const agregado = item.agregado ? 'SIM' : 'NÃO'
      const boleto = item.boleto ? 'SIM' : 'NÃO'

      return [
        item.rota_id,
        dataInicio,
        `"${cliente}"`,
        `"${vendedor}"`,
        `"${tarefas}"`,
        agregado,
        boleto,
      ].join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // 4. Send Email using Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Facil Vendas <noreply@resend.dev>',
          to: [recipientEmail],
          subject: `Relatório Controle de Rota #${routeId}`,
          html: `<p>Segue em anexo o relatório de controle de rota para a rota #${routeId}.</p><p>Relatório enviado para: <strong>${recipientEmail}</strong></p>`,
          attachments: [
            {
              filename: `controle_rota_${routeId}.csv`,
              content: btoa(unescape(encodeURIComponent(csvContent))), // Base64 encode
            },
          ],
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Resend Error:', errorData)
      } else {
        console.log(`Email successfully sent to ${recipientEmail}`)
      }
    } else {
      console.log(
        'RESEND_API_KEY not found. Skipping email send. CSV generated size:',
        csvContent.length,
      )
      console.log('Would have sent to:', recipientEmail)
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: items.length,
        sentTo: recipientEmail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
