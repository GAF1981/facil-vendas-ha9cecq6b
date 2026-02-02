import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3.10.1'
import { corsHeaders } from '../_shared/cors.ts'

console.log(
  'Send Route Report function up and running (Zip Consolidated 10k Limit)',
)

// Helper for formatting currency (BRL)
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Helper for formatting date (YYYY-MM-DD -> DD/MM/YYYY) safely
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  try {
    // Handle ISO string with time
    let cleanDate = dateStr
    if (dateStr.includes('T')) {
      cleanDate = dateStr.split('T')[0]
    }

    // Parse YYYY-MM-DD
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }

    // Fallback using Date object if format is different
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  } catch {
    return dateStr
  }
}

// Helper for CSV escaping
const escapeCsv = (val: any) => {
  if (val === null || val === undefined) return ''
  let str = String(val)
  // Handle objects or arrays if they appear in generic dumps
  if (typeof val === 'object') {
    try {
      str = JSON.stringify(val)
    } catch {
      str = ''
    }
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper to convert array of objects to CSV string
const jsonToCsv = (items: any[]) => {
  if (!items || items.length === 0) return ''

  // Get all unique keys to handle sparse data
  const allKeys = new Set<string>()
  items.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((k) => allKeys.add(k))
    }
  })

  const header = Array.from(allKeys)
  const headerRow = header.map(escapeCsv).join(',')

  const rows = items.map((item) => {
    return header.map((key) => escapeCsv(item[key])).join(',')
  })

  return [headerRow, ...rows].join('\n')
}

// Helper for batched fetching to bypass 1000 row limit
const fetchBatched = async (
  supabase: any,
  table: string,
  select: string,
  modifiers: (q: any) => any,
  limit: number = 10000,
  batchSize: number = 1000,
) => {
  let allRows: any[] = []

  // Calculate max batches needed
  const batches = Math.ceil(limit / batchSize)

  for (let i = 0; i < batches; i++) {
    const from = i * batchSize
    const to = from + batchSize - 1

    let query = supabase.from(table).select(select)

    // Apply modifiers (filters, orders)
    query = modifiers(query)

    // Apply range for pagination
    query = query.range(from, to)

    const { data, error } = await query

    if (error) return { data: null, error }
    if (!data || data.length === 0) break

    allRows = allRows.concat(data)

    if (data.length < batchSize) break
    if (allRows.length >= limit) break
  }

  return { data: allRows.slice(0, limit), error: null }
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

    // --- Timezone & Date Setup (Brazil UTC-3) ---
    const brazilFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    // Current date in Brazil (YYYY-MM-DD)
    const now = new Date()
    const todayBrazil = brazilFormatter.format(now)

    // 180 Days ago in Brazil
    const date180 = new Date(now)
    date180.setDate(date180.getDate() - 180)
    const cutoffDateBrazil = brazilFormatter.format(date180)

    // --- Parallel Data Fetching (Limit 10000 with Pagination) ---

    // REPORT 1: Active Clients (Route Control)
    const fetchActiveClients = fetchBatched(
      supabaseClient,
      'CLIENTES',
      '*',
      (q) => q.ilike('situacao', '%Ativo%').order('NOME CLIENTE'),
    )

    const fetchDebts = fetchBatched(
      supabaseClient,
      'debitos_com_total_view',
      'cliente_codigo, debito_total',
      (q) => q.order('cliente_codigo'),
    )

    const fetchProjections = supabaseClient.rpc('get_client_projections')

    const fetchConsigned = fetchBatched(
      supabaseClient,
      'view_client_latest_consigned_value',
      'client_id, total_consigned_value',
      (q) => q.order('client_id'),
    )

    const fetchStats = fetchBatched(
      supabaseClient,
      'client_stats_view',
      'client_id, max_pedido, max_data_acerto',
      (q) => q.order('client_id'),
    )

    const fetchReceivables = fetchBatched(
      supabaseClient,
      'RECEBIMENTOS',
      'cliente_id, vencimento, valor_pago, valor_registrado',
      (q) => q.order('vencimento', { ascending: true }),
    )

    const fetchVendors = fetchBatched(
      supabaseClient,
      'ROTA_ITEMS',
      'cliente_id, vendedor_id, FUNCIONARIOS(nome_completo)',
      (q) => q.order('id'),
    )

    // REPORT 2: All Clients (Full Dump)
    const fetchAllClients = fetchBatched(supabaseClient, 'CLIENTES', '*', (q) =>
      q.order('CODIGO'),
    )

    // REPORT 3: Database History (Last 180 Days)
    const fetchDBHistory = fetchBatched(
      supabaseClient,
      'BANCO_DE_DADOS',
      '*',
      (q) =>
        q
          .gte('DATA DO ACERTO', cutoffDateBrazil)
          .order('DATA DO ACERTO', { ascending: false }),
    )

    const [
      { data: activeClients, error: activeError },
      { data: debts, error: debtsError },
      { data: projections, error: projError },
      { data: consigned, error: consError },
      { data: stats, error: statsError },
      { data: receivables, error: recError },
      { data: vendors, error: vendError },
      { data: allClients, error: allClientsError },
      { data: dbHistory, error: dbHistoryError },
    ] = await Promise.all([
      fetchActiveClients,
      fetchDebts,
      fetchProjections,
      fetchConsigned,
      fetchStats,
      fetchReceivables,
      fetchVendors,
      fetchAllClients,
      fetchDBHistory,
    ])

    if (activeError)
      throw new Error(`Erro ao buscar clientes ativos: ${activeError.message}`)
    if (allClientsError)
      throw new Error(
        `Erro ao buscar clientes geral: ${allClientsError.message}`,
      )
    if (dbHistoryError)
      throw new Error(
        `Erro ao buscar histórico do banco: ${dbHistoryError.message}`,
      )

    // --- Processing Report 1: Route Control ---
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
    receivables?.forEach((r: any) => {
      // Safe check for unpaid items: paid < registered
      const paid = Number(r.valor_pago) || 0
      const registered = Number(r.valor_registrado) || 0
      if (paid < registered) {
        if (!nextDueMap.has(r.cliente_id) && r.vencimento) {
          nextDueMap.set(r.cliente_id, r.vencimento)
        }
      }
    })

    const vendorMap = new Map()
    vendors?.forEach((v: any) => {
      if (v.FUNCIONARIOS?.nome_completo) {
        vendorMap.set(v.cliente_id, v.FUNCIONARIOS.nome_completo)
      }
    })

    const csvHeader1 = [
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

    const routeReportRows = (activeClients || []).map((client: any) => {
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
        if (nextDue && nextDue < todayBrazil) {
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

    const csvContent1 = [csvHeader1, ...routeReportRows].join('\n')

    // --- Processing Report 2: All Clients ---
    const csvContent2 = jsonToCsv(allClients || [])

    // --- Processing Report 3: DB History (180 days) ---
    const csvContent3 = jsonToCsv(dbHistory || [])

    // --- ZIP Compression ---
    const zip = new JSZip()
    zip.file(`relatorio_rotas_${todayBrazil}.csv`, csvContent1)
    zip.file(`clientes_completo_${todayBrazil}.csv`, csvContent2)
    zip.file(`banco_dados_180dias_${todayBrazil}.csv`, csvContent3)

    const zipContentBase64 = await zip.generateAsync({ type: 'base64' })
    const zipFilename = `relatorios_vendas_${todayBrazil}.zip`

    // --- Send Email with 1 ZIP Attachment ---
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Facil Vendas <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `Relatórios Consolidados (ZIP) - ${todayBrazil}`,
        html: `
            <div style="font-family: sans-serif; color: #333;">
              <h2>Relatórios Consolidados</h2>
              <p>Olá,</p>
              <p>Seguem em anexo os relatórios solicitados em formato ZIP:</p>
              <ul>
                <li><strong>Relatório de Rotas (Ativos):</strong> ${routeReportRows.length} registros</li>
                <li><strong>Relatório Geral de Clientes:</strong> ${allClients?.length || 0} registros</li>
                <li><strong>Histórico Banco de Dados (Últimos 180 dias):</strong> ${dbHistory?.length || 0} registros</li>
              </ul>
              <p><strong>Filtro de Data (DB):</strong> A partir de ${formatDate(cutoffDateBrazil)} (Timezone: America/Sao_Paulo)</p>
              <p><strong>Limite de registros:</strong> 10.000 por arquivo</p>
              <br/>
              <p>Atenciosamente,<br/>Equipe Facil Vendas</p>
            </div>
          `,
        attachments: [
          {
            filename: zipFilename,
            content: zipContentBase64,
          },
        ],
      }),
    })

    if (!res.ok) {
      const contentType = res.headers.get('content-type') || ''
      let errorData
      try {
        if (contentType.includes('application/json')) {
          errorData = await res.json()
        } else {
          errorData = { message: await res.text() }
        }
      } catch (e) {
        errorData = {
          message:
            'Erro desconhecido ao ler resposta do Resend (Falha no parse JSON)',
        }
      }

      console.error('Resend Error:', errorData)
      throw new Error(
        `Erro Resend: ${errorData.message || errorData.name || JSON.stringify(errorData)}`,
      )
    }

    // 6. Log Success
    await supabaseClient.from('system_logs').insert({
      user_id: userId,
      type: 'email_report',
      description: `Relatórios (ZIP) enviados para ${recipientEmail}`,
      meta: {
        recipientEmail,
        routeCount: routeReportRows.length,
        clientsCount: allClients?.length,
        dbHistoryCount: dbHistory?.length,
        status: 'success',
        type: 'multi_report_zip',
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatórios enviados com sucesso para ${recipientEmail}`,
        count: routeReportRows.length,
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
