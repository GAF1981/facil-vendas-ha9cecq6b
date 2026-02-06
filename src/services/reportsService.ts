import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns'

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
  // Enhanced fields
  produto_nome?: string
  valor_ajuste?: number
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
  debito_total?: number
}

export const reportsService = {
  // ... (keep existing methods like getProjectionsReport)
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
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"COD. PRODUTO", MERCADORIA, "QUANTIDADE VENDIDA", "VALOR VENDIDO", "DATA DO ACERTO"',
      )
      .gte('"DATA DO ACERTO"', startDate)
      .lte('"DATA DO ACERTO"', endDate)
      .not('"COD. PRODUTO"', 'is', null)

    if (error) throw error

    const aggregationMap = new Map<number, TopSellingItem>()

    data?.forEach((row: any) => {
      const codigo = row['COD. PRODUTO']
      if (!codigo) return

      const qtdStr = String(row['QUANTIDADE VENDIDA'] || '0')
      const valStr = String(row['VALOR VENDIDO'] || '0')

      const qtd = parseFloat(qtdStr.replace(',', '.') || '0') || 0
      const val = parseCurrency(valStr)

      if (!aggregationMap.has(codigo)) {
        aggregationMap.set(codigo, {
          produto_codigo: codigo,
          produto_nome: row.MERCADORIA || 'Produto Desconhecido',
          quantidade_total: 0,
          valor_total: 0,
        })
      }

      const item = aggregationMap.get(codigo)!
      item.quantidade_total += qtd
      item.valor_total += val
    })

    return Array.from(aggregationMap.values()).sort(
      (a, b) => b.valor_total - a.valor_total,
    )
  },

  async getInitialBalanceAdjustments(filters?: {
    sellerId?: string | null
    startDate?: Date
    endDate?: Date
  }): Promise<AdjustmentReportRow[]> {
    let query = supabase
      .from('AJUSTE_SALDO_INICIAL')
      .select('*')
      .order('data_acerto', { ascending: false })

    if (filters?.sellerId && filters.sellerId !== 'all') {
      query = query.eq('vendedor_id', parseInt(filters.sellerId))
    }

    if (filters?.startDate) {
      query = query.gte('data_acerto', format(filters.startDate, 'yyyy-MM-dd'))
    }

    if (filters?.endDate) {
      query = query.lte('data_acerto', format(filters.endDate, 'yyyy-MM-dd'))
    }

    // Limit if no filters to prevent massive load, otherwise allow more
    if (!filters?.startDate && !filters?.sellerId) {
      query = query.limit(1000)
    } else {
      query = query.limit(5000)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch Product Details to enrich the report
    const productIds = new Set<number>()
    data.forEach((row) => {
      if (row.produto_id) productIds.add(row.produto_id)
    })

    const productsMap = new Map<number, { name: string; price: number }>()

    if (productIds.size > 0) {
      const ids = Array.from(productIds)
      const chunkSize = 500
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const { data: products } = await supabase
          .from('PRODUTOS')
          .select('ID, PRODUTO, PREÇO')
          .in('ID', chunk)

        products?.forEach((p) => {
          if (p.ID) {
            productsMap.set(p.ID, {
              name: p.PRODUTO || 'Desconhecido',
              price: parseCurrency(p.PREÇO),
            })
          }
        })
      }
    }

    return data.map((row) => {
      const product = productsMap.get(row.produto_id)
      const price = product?.price || 0
      // Calculate Value based on Quantity * Price
      const adjustmentValue = (row.quantidade_alterada || 0) * price

      return {
        ...row,
        produto_nome: product?.name || `Produto ${row.produto_id}`,
        valor_ajuste: adjustmentValue,
      } as AdjustmentReportRow
    })
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
      throw error
    }
  },

  async getDebtsReport(): Promise<DebitoReportRow[]> {
    const { data: reportData, error } = await supabase
      .from('debitos_com_total_view' as any)
      .select('*')
      .order('data_acerto', { ascending: false })
      .limit(1000)

    if (error) throw error
    if (!reportData || reportData.length === 0) return []

    const orderIdsToFetch = new Set<number>()
    const clientCodes = new Set<number>()

    reportData.forEach((row: any) => {
      if (row.cliente_codigo) {
        clientCodes.add(row.cliente_codigo)
      } else {
        orderIdsToFetch.add(row.pedido_id)
      }
    })

    const orderIds = Array.from(orderIdsToFetch)
    const orderClientMap = new Map<number, number>()

    if (orderIds.length > 0) {
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

    const enrichedData = reportData.map((row: any) => {
      let clientCode = row.cliente_codigo

      if (!clientCode && orderClientMap.has(row.pedido_id)) {
        clientCode = orderClientMap.get(row.pedido_id) || null
      }

      let clientName = row.cliente_nome
      if (clientCode && clientNameMap.has(clientCode)) {
        clientName = clientNameMap.get(clientCode) || clientName
      }

      return {
        ...row,
        cliente_codigo: clientCode,
        cliente_nome: clientName,
        saldo_a_pagar:
          row.saldo_a_pagar !== undefined && row.saldo_a_pagar !== null
            ? row.saldo_a_pagar
            : row.valor_venda - (row.desconto || 0),
        debito_total: row.debito_total,
      }
    })

    return enrichedData as DebitoReportRow[]
  },

  async sendConsolidatedEmail(userEmail: string) {
    const { data, error } = await supabase.functions.invoke(
      'send-route-report',
      {
        body: { userEmail },
      },
    )
    if (error) throw error
    return data
  },
}
