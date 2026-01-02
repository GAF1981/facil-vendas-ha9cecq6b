import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter } from 'date-fns'

export interface SettlementSummary {
  orderId: number
  employee: string
  clientCode: number
  clientName: string
  acertoDate: string
  acertoTime: string
  totalSalesValue: number
  payments: {
    method: string
    value: number
  }[]
  totalPaid: number
}

export const resumoAcertosService = {
  async getLatestRoute() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getSettlements(routeStartDate: string) {
    const routeStart = parseISO(routeStartDate)
    // Basic date filtering at DB level to reduce payload (>= date part)
    const datePart = routeStartDate.split('T')[0]

    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .gte('"DATA DO ACERTO"', datePart)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    if (dbError) throw dbError

    // Group by Order ID and Aggregate Sales
    const ordersMap = new Map<number, SettlementSummary>()

    dbData?.forEach((row: any) => {
      // Strict Time filtering
      const dateStr = row['DATA DO ACERTO']
      const timeStr = row['HORA DO ACERTO'] || '00:00:00'
      if (!dateStr) return

      // Construct comparable date
      // Handling potential format differences or just appending time
      const rowDateTimeStr = `${dateStr}T${timeStr}`
      let rowDateTime: Date
      try {
        rowDateTime = parseISO(rowDateTimeStr)
      } catch (e) {
        // Fallback if parsing fails
        return
      }

      // Check if strictly greater than route start
      if (!isAfter(rowDateTime, routeStart)) return

      const orderId = row['NÚMERO DO PEDIDO']
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          employee: row['FUNCIONÁRIO'] || 'N/D',
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          acertoDate: dateStr,
          acertoTime: timeStr,
          totalSalesValue: 0,
          payments: [],
          totalPaid: 0,
        })
      }

      const order = ordersMap.get(orderId)!
      // Using specific column requested: "VALOR VENDA PRODUTO"
      order.totalSalesValue += parseCurrency(row['VALOR VENDA PRODUTO'])
    })

    const orderIds = Array.from(ordersMap.keys())

    if (orderIds.length > 0) {
      // Fetch Payments for these orders
      // Using batching logic if needed, but for "Resumo" usually manageable
      // Supabase 'in' filter limits might apply if thousands of orders, but typically fine for "Active Route"
      const { data: payData, error: payError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id, forma_pagamento, valor_pago')
        .in('venda_id', orderIds)

      if (payError) throw payError

      payData?.forEach((p: any) => {
        const order = ordersMap.get(p.venda_id)
        if (order) {
          order.payments.push({
            method: p.forma_pagamento,
            value: p.valor_pago || 0,
          })
          order.totalPaid += p.valor_pago || 0
        }
      })
    }

    // Return sorted by Order ID descending (newest first)
    return Array.from(ordersMap.values()).sort((a, b) => b.orderId - a.orderId)
  },
}
