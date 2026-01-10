import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'

export interface ProjectionReportRow {
  orderId: number
  clientCode: number
  clientName: string
  orderDate: string
  totalValue: number
  daysBetweenOrders: number | null
  indexDays: number | null
  monthlyAverage: number | null
  daysSinceLastOrder: number | null
  projection: number | null
}

export interface TopSellingItem {
  produto_nome: string
  produto_codigo: number
  quantidade_total: number
  valor_total: number
}

export interface AdjustmentReportRow {
  id: number
  numero_pedido: number | null
  cliente_id: number
  cliente_nome: string
  vendedor_id: number | null
  vendedor_nome: string | null
  data_acerto: string
  saldo_anterior: number
  saldo_novo: number
  quantidade_alterada: number
  produto_id: number
}

export interface DebitoReportRow {
  rota_id: number | null
  pedido_id: number
  data_acerto: string
  hora_acerto: string | null
  vendedor_nome: string
  cliente_codigo: number | null
  cliente_nome: string | null
  rota: string | null
  media_mensal: number
  valor_venda: number
  saldo_a_pagar: number
  valor_pago: number
  debito: number
  desconto: number
  debito_total?: number // Added for Total Debt column
}

export const reportsService = {
  async getProjectionsReport(): Promise<ProjectionReportRow[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", "HORA DO ACERTO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)
      .not('DATA DO ACERTO', 'is', null)
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(10000)

    if (error) throw error

    const ordersMap = new Map<number, ProjectionReportRow>()

    data?.forEach((row) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return
      if (!row['DATA DO ACERTO']) return

      const val = parseCurrency(row['VALOR VENDIDO'])

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId: orderId,
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          orderDate: row['DATA DO ACERTO'] || '',
          totalValue: 0,
          daysBetweenOrders: null,
          indexDays: null,
          monthlyAverage: null,
          daysSinceLastOrder: null,
          projection: null,
        })
      }

      const order = ordersMap.get(orderId)!
      order.totalValue += val
    })

    const allOrders = Array.from(ordersMap.values())
    const clientOrdersMap = new Map<number, ProjectionReportRow[]>()
    allOrders.forEach((order) => {
      const list = clientOrdersMap.get(order.clientCode) || []
      list.push(order)
      clientOrdersMap.set(order.clientCode, list)
    })

    const result: ProjectionReportRow[] = []
    const today = startOfDay(new Date())

    clientOrdersMap.forEach((orders) => {
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime()
        const dateB = new Date(b.orderDate).getTime()
        return dateB - dateA
      })

      const latestOrderDate =
        orders.length > 0 ? parseISO(orders[0].orderDate) : null
      const daysSinceLastForClient = latestOrderDate
        ? differenceInDays(today, latestOrderDate)
        : 0

      orders.forEach((currentOrder, index) => {
        currentOrder.daysSinceLastOrder = daysSinceLastForClient

        if (index < orders.length - 1) {
          const prevOrder = orders[index + 1]
          const currDate = parseISO(currentOrder.orderDate)
          const prevDate = parseISO(prevOrder.orderDate)

          const diffDays = differenceInDays(currDate, prevDate)
          currentOrder.daysBetweenOrders = diffDays

          const indexD = diffDays / 30
          currentOrder.indexDays = indexD

          if (indexD > 0) {
            currentOrder.monthlyAverage = currentOrder.totalValue / indexD
          } else {
            // Updated Logic: If monthly average would be 0 (indexD <= 0) and we have a sales value,
            // calculate the average as Value / 2.
            if (currentOrder.totalValue > 0) {
              currentOrder.monthlyAverage = currentOrder.totalValue / 2
            } else {
              currentOrder.monthlyAverage = 0
            }
          }

          const daysSinceLastMonths = daysSinceLastForClient / 30
          if (currentOrder.monthlyAverage) {
            currentOrder.projection =
              daysSinceLastMonths * currentOrder.monthlyAverage
          } else {
            currentOrder.projection = 0
          }

          // New Logic: Ensure projection minimum is 100 if calculated as 0
          if (currentOrder.projection === 0) {
            currentOrder.projection = 100
          }
        } else {
          currentOrder.daysBetweenOrders = null
          currentOrder.indexDays = null
          currentOrder.monthlyAverage = null
          currentOrder.projection = null
        }

        result.push(currentOrder)
      })
    })

    return result.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    )
  },

  async getTopSellingItems(
    startDate: string,
    endDate: string,
  ): Promise<TopSellingItem[]> {
    const { data, error } = await supabase.rpc('get_top_selling_items', {
      start_date: startDate,
      end_date: endDate,
    })

    if (error) throw error
    return data as TopSellingItem[]
  },

  async getInitialBalanceAdjustments(): Promise<AdjustmentReportRow[]> {
    const { data, error } = await supabase
      .from('AJUSTE_SALDO_INICIAL')
      .select('*')
      .order('data_acerto', { ascending: false })
      .limit(1000)

    if (error) throw error
    return data as AdjustmentReportRow[]
  },

  async refreshDebtsReport() {
    const { error } = await supabase.rpc('refresh_debitos_historico')
    if (error) throw error
  },

  async updateDebtHistoryForOrder(orderId: number) {
    const { error } = await supabase.rpc('update_debito_historico_order', {
      p_pedido_id: orderId,
    })
    if (error) {
      console.error(
        `Failed to auto-update debt history for order ${orderId}`,
        error,
      )
    }
  },

  async getDebtsReport(): Promise<DebitoReportRow[]> {
    // 1. Fetch base report data from the VIEW to get totals
    // Using 'as any' because the view is not in the generated types yet
    const { data: reportData, error } = await supabase
      .from('debitos_com_total_view' as any)
      .select('*')
      .order('data_acerto', { ascending: false })
      .limit(1000)

    if (error) throw error
    if (!reportData || reportData.length === 0) return []

    // 2. Identify missing data and collect IDs for enrichment
    const orderIdsToFetch = new Set<number>()
    const clientCodes = new Set<number>()

    reportData.forEach((row: any) => {
      if (row.cliente_codigo) {
        clientCodes.add(row.cliente_codigo)
      } else {
        // If client code is missing, we need to fetch it from sales order
        orderIdsToFetch.add(row.pedido_id)
      }
    })

    // 3. Fetch missing Client Codes from BANCO_DE_DADOS
    const orderIds = Array.from(orderIdsToFetch)
    const orderClientMap = new Map<number, number>()

    if (orderIds.length > 0) {
      // Chunking to avoid query length limits
      const chunkSize = 1000
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize)
        const { data: salesData } = await supabase
          .from('BANCO_DE_DADOS')
          .select('"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE"')
          .in('NÚMERO DO PEDIDO', chunk)

        salesData?.forEach((sale) => {
          if (sale['NÚMERO DO PEDIDO'] && sale['CÓDIGO DO CLIENTE']) {
            orderClientMap.set(
              sale['NÚMERO DO PEDIDO'],
              sale['CÓDIGO DO CLIENTE'],
            )
            clientCodes.add(sale['CÓDIGO DO CLIENTE'])
          }
        })
      }
    }

    // 4. Fetch Client Names from CLIENTES table for ALL involved clients (to ensure fresh data)
    const allClientCodes = Array.from(clientCodes)
    const clientNameMap = new Map<number, string>()

    if (allClientCodes.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < allClientCodes.length; i += chunkSize) {
        const chunk = allClientCodes.slice(i, i + chunkSize)
        const { data: clientData } = await supabase
          .from('CLIENTES')
          .select('CODIGO, "NOME CLIENTE"')
          .in('CODIGO', chunk)

        clientData?.forEach((client) => {
          if (client.CODIGO && client['NOME CLIENTE']) {
            clientNameMap.set(client.CODIGO, client['NOME CLIENTE'])
          }
        })
      }
    }

    // 5. Merge enriched data back into rows
    const enrichedData = reportData.map((row: any) => {
      let clientCode = row.cliente_codigo

      // Try to fill missing code from Sales Order map
      if (!clientCode && orderClientMap.has(row.pedido_id)) {
        clientCode = orderClientMap.get(row.pedido_id) || null
      }

      // Get fresh name from Client map using the code
      let clientName = row.cliente_nome
      if (clientCode && clientNameMap.has(clientCode)) {
        clientName = clientNameMap.get(clientCode) || clientName
      }

      return {
        ...row,
        cliente_codigo: clientCode,
        cliente_nome: clientName,
        // Ensure saldo_a_pagar is present, if not fallback to calculation
        saldo_a_pagar:
          row.saldo_a_pagar !== undefined && row.saldo_a_pagar !== null
            ? row.saldo_a_pagar
            : row.valor_venda - (row.desconto || 0),
        // Pass through the total debt from view
        debito_total: row.debito_total,
      }
    })

    return enrichedData as DebitoReportRow[]
  },
}
