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
    // Get the route with the Highest ID
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async getSettlements(routeStartDate: string, routeEndDate?: string | null) {
    const routeStart = parseISO(routeStartDate)
    // Basic date filtering at DB level
    const datePartStart = routeStartDate.split('T')[0]

    let query = supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .gte('"DATA DO ACERTO"', datePartStart)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    if (routeEndDate) {
      const datePartEnd = routeEndDate.split('T')[0]
      query = query.lte('"DATA DO ACERTO"', datePartEnd)
    }

    const { data: dbData, error: dbError } = await query

    if (dbError) throw dbError

    const ordersMap = new Map<number, SettlementSummary>()

    // Filter by timestamp in JS for precision
    dbData?.forEach((row: any) => {
      const dateStr = row['DATA DO ACERTO']
      const timeStr = row['HORA DO ACERTO'] || '00:00:00'
      if (!dateStr) return

      const rowDateTimeStr = `${dateStr}T${timeStr}`
      let rowDateTime: Date
      try {
        rowDateTime = parseISO(rowDateTimeStr)
      } catch (e) {
        return
      }

      // Check range strictly
      if (
        !isAfter(rowDateTime, routeStart) &&
        rowDateTime.getTime() !== routeStart.getTime()
      ) {
        // Less than start?
        if (rowDateTime < routeStart) return
      }

      if (routeEndDate) {
        const routeEnd = parseISO(routeEndDate)
        if (isAfter(rowDateTime, routeEnd)) return
      }

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
      order.totalSalesValue += parseCurrency(row['VALOR VENDA PRODUTO'])
    })

    const orderIds = Array.from(ordersMap.keys())

    if (orderIds.length > 0) {
      // Fetch Payments from RECEBIMENTOS
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

    return Array.from(ordersMap.values()).sort((a, b) => b.orderId - a.orderId)
  },
}
