import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Send Route Report function up and running')

// Helper for formatting currency (BRL)
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Helper for formatting date (DD/MM/YYYY)
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

// Helper for CSV escaping
const escapeCsv = (val: any) => {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          message:
            'Configuração do servidor incompleta (Missing RESEND_API_KEY)',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse Body
    let body = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch (e) {
      console.warn('Failed to parse body:', e)
    }
    const { userEmail } = body as { userEmail?: string }

    let userId: number | null = null
    if (userEmail) {
      const { data: userData } = await supabaseClient
        .from('FUNCIONARIOS')
        .select('id')
        .eq('email', userEmail)
        .single()
      if (userData) userId = userData.id
    }

    // 1. Fetch Email Config
    const { data: configData, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'email_relatorio')
      .single()

    if (configError || !configData?.valor) {
      return new Response(
        JSON.stringify({
          message: 'E-mail do destinatário não configurado.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    const recipientEmail = configData.valor

    // 2. Fetch Data in Parallel
    // Requirement: Only Active Clients
    const fetchActiveClients = supabaseClient
      .from('CLIENTES')
      .select('*')
      .ilike('situacao', '%Ativo%')
      .order('NOME CLIENTE')
      .limit(10000)

    // Debts Summary
    const fetchDebts = supabaseClient
      .from('debitos_com_total_view')
      .select('cliente_codigo, debito_total')
      .limit(10000)

    // Projections
    const fetchProjections = supabaseClient.rpc('get_client_projections')

    // Consigned Values
    const fetchConsigned = supabaseClient
      .from('view_client_latest_consigned_value')
      .select('client_id, total_consigned_value')
      .limit(10000)

    // Last Order Stats (for Order ID, Date)
    const fetchStats = supabaseClient
      .from('client_stats_view')
      .select('client_id, max_pedido, max_data_acerto')
      .limit(10000)

    // Next Due Date (Vencimento) - Oldest unpaid receivable
    const fetchReceivables = supabaseClient
      .from('RECEBIMENTOS')
      .select('cliente_id, vencimento')
      .lt('valor_pago', 'valor_registrado') // Basic check, better handled with numeric comparison logic but limitations apply in simple filters
      .order('vencimento', { ascending: true })
      .limit(50000)

    // Vendors (Assigned in Route Items)
    const fetchVendors = supabaseClient
      .from('ROTA_ITEMS')
      .select('cliente_id, vendedor_id, FUNCIONARIOS(nome_completo)')
      .limit(10000)

    const [
      { data: clients, error: clientsError },
      { data: debts, error: debtsError },
      { data: projections, error: projError },
      { data: consigned, error: consError },
      { data: stats, error: statsError },
      { data: receivables, error: recError },
      { data: vendors, error: vendError },
    ] = await Promise.all([
      fetchActiveClients,
      fetchDebts,
      fetchProjections,
      fetchConsigned,
      fetchStats,
      fetchReceivables,
      fetchVendors,
    ])

    if (clientsError)
      throw new Error(`Erro ao buscar clientes: ${clientsError.message}`)

    // 3. Process Maps for quick lookup
    const debtMap = new Map()
    debts?.forEach((d: any) => debtMap.set(d.cliente_codigo, d.debito_total))

    const projMap = new Map()
    projections?.forEach((p: any) => projMap.set(p.client_id, p.projecao))

    const consMap = new Map()
    consigned?.forEach((c: any) =>
      consMap.set(c.client_id, c.total_consigned_value),
    )

    const statsMap = new Map()
    stats?.forEach((s: any) =>
      statsMap.set(s.client_id, {
        pedido: s.max_pedido,
        data: s.max_data_acerto,
      }),
    )

    const nextDueMap = new Map()
    // Since ordered by vencimento ASC, the first one encountered for a client is the oldest
    receivables?.forEach((r: any) => {
      if (!nextDueMap.has(r.cliente_id) && r.vencimento) {
        nextDueMap.set(r.cliente_id, r.vencimento)
      }
    })

    const vendorMap = new Map()
    vendors?.forEach((v: any) => {
      if (v.FUNCIONARIOS?.nome_completo) {
        vendorMap.set(v.cliente_id, v.FUNCIONARIOS.nome_completo)
      }
    })

    // 4. Build CSV Data
    const csvHeader = [
      'Código',
      'Cliente',
      'Débito',
      'Vencimento',
      'Projeção',
      'Vendedor',
      'Rota/Grupo',
      'Rota',
      'Consignado',
      'Município',
      'Endereço',
      'Tipo de Cliente',
      'Telefone 1',
      'Contato 1',
      'Pedido',
      'Data',
      'Status',
    ].join(',')

    const today = new Date().toISOString().split('T')[0]

    const csvRows = (clients || []).map((client: any) => {
      const cid = client.CODIGO
      const debt = debtMap.get(cid) || 0
      const proj = projMap.get(cid) || 0
      const cons = consMap.get(cid) || 0
      const stat = statsMap.get(cid) || {}
      const nextDue = nextDueMap.get(cid) || ''
      const vendor = vendorMap.get(cid) || ''

      // Status Logic
      let status = 'SEM DÉBITO'
      if (debt > 0.05) {
        if (nextDue && nextDue < today) {
          status = 'VENCIDO'
        } else {
          status = 'A VENCER'
        }
      }

      return [
        escapeCsv(cid),
        escapeCsv(client['NOME CLIENTE']),
        escapeCsv(formatCurrency(debt)),
        escapeCsv(formatDate(nextDue)),
        escapeCsv(formatCurrency(proj)),
        escapeCsv(vendor),
        escapeCsv(client.GRUPO || ''),
        escapeCsv(client['GRUPO ROTA'] || ''),
        escapeCsv(formatCurrency(cons)),
        escapeCsv(client['MUNICÍPIO'] || ''),
        escapeCsv(client['ENDEREÇO'] || ''),
        escapeCsv(client['TIPO DE CLIENTE'] || ''),
        escapeCsv(client['FONE 1'] || ''),
        escapeCsv(client['CONTATO 1'] || ''),
        escapeCsv(stat.pedido || ''),
        escapeCsv(formatDate(stat.data)),
        escapeCsv(status),
      ].join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // 5. Send Email
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Facil Vendas <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `Relatório Consolidado de Clientes Ativos`,
        html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Relatório Consolidado de Clientes Ativos</h2>
              <p>Olá,</p>
              <p>O relatório consolidado contendo apenas clientes ativos foi gerado com sucesso.</p>
              <p><strong>Resumo:</strong></p>
              <ul>
                <li><strong>Total de Clientes Ativos:</strong> ${csvRows.length}</li>
                <li><strong>Destinatário:</strong> ${recipientEmail}</li>
                <li><strong>Data de Geração:</strong> ${new Date().toLocaleString('pt-BR')}</li>
              </ul>
              <p>O arquivo CSV está anexado.</p>
              <br/>
              <p>Atenciosamente,<br/>Equipe Facil Vendas</p>
            </div>
          `,
        attachments: [
          {
            filename: `clientes_ativos_consolidado_${today}.csv`,
            content: btoa(unescape(encodeURIComponent(csvContent))),
          },
        ],
      }),
    })

    if (!res.ok) {
      const errorData = await res.json()
      console.error('Resend Error:', errorData)
      throw new Error(`Erro Resend: ${errorData.message || errorData.name}`)
    }

    // 6. Log Success
    await supabaseClient.from('system_logs').insert({
      user_id: userId,
      type: 'email_report',
      description: `Relatório de Clientes ATIVOS enviado para ${recipientEmail}`,
      meta: {
        recipientEmail,
        clientCount: csvRows.length,
        status: 'success',
        type: 'active_clients_consolidated',
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório enviado com sucesso para ${recipientEmail}`,
        count: csvRows.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Function Error:', error.message)
    return new Response(JSON.stringify({ message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
