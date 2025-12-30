import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { differenceInDays, parseISO, startOfDay } from 'date-fns'

export interface ProjectionReportRow {
  orderId: number
  clientCode: number
  clientName: string
  orderDate: string
  totalValue: number
  // Calculated Columns
  daysBetweenOrders: number | null
  indexDays: number | null
  monthlyAverage: number | null
  daysSinceLastOrder: number | null
  projection: number | null
}

export const reportsService = {
  async getProjectionsReport(): Promise<ProjectionReportRow[]> {
    // Fetch recent transactions
    // Fetching enough data to perform client-side analysis
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", "HORA DO ACERTO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)
      .not('DATA DO ACERTO', 'is', null)
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(5000)

    if (error) throw error

    const ordersMap = new Map<number, ProjectionReportRow>()

    // 1. Aggregate items into Orders
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

    // 2. Group Orders by Client
    const clientOrdersMap = new Map<number, ProjectionReportRow[]>()
    allOrders.forEach((order) => {
      const list = clientOrdersMap.get(order.clientCode) || []
      list.push(order)
      clientOrdersMap.set(order.clientCode, list)
    })

    const result: ProjectionReportRow[] = []
    const today = startOfDay(new Date())

    // 3. Process Per-Client Logic
    clientOrdersMap.forEach((orders) => {
      // Sort descending by date
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime()
        const dateB = new Date(b.orderDate).getTime()
        return dateB - dateA
      })

      // Calculate Days Since Last Order (Client Context)
      const latestOrderDate =
        orders.length > 0 ? parseISO(orders[0].orderDate) : null
      const daysSinceLastForClient = latestOrderDate
        ? differenceInDays(today, latestOrderDate)
        : 0

      orders.forEach((currentOrder, index) => {
        // Set Days Since Last Order (Dias para Projeção)
        currentOrder.daysSinceLastOrder = daysSinceLastForClient

        // Find Previous Order (which is next in the sorted list)
        if (index < orders.length - 1) {
          const prevOrder = orders[index + 1]
          const currDate = parseISO(currentOrder.orderDate)
          const prevDate = parseISO(prevOrder.orderDate)

          // Dias entre acertos
          const diffDays = differenceInDays(currDate, prevDate)
          currentOrder.daysBetweenOrders = diffDays

          // Indice dias (Diff / 30)
          const indexD = diffDays / 30
          currentOrder.indexDays = indexD

          // Média Mensal (Value / Indice)
          if (indexD > 0) {
            currentOrder.monthlyAverage = currentOrder.totalValue / indexD
          } else {
            currentOrder.monthlyAverage = 0
          }

          // Projeção
          // Formula: (DaysSinceLast / 30) * MonthlyAverage
          const daysSinceLastMonths = daysSinceLastForClient / 30
          if (currentOrder.monthlyAverage) {
            currentOrder.projection =
              daysSinceLastMonths * currentOrder.monthlyAverage
          } else {
            currentOrder.projection = 0
          }
        } else {
          // No previous record available for comparison
          currentOrder.daysBetweenOrders = null
          currentOrder.indexDays = null
          currentOrder.monthlyAverage = null
          currentOrder.projection = null
        }

        result.push(currentOrder)
      })
    })

    // Return flattened result sorted by Date Desc
    return result.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    )
  },
}
