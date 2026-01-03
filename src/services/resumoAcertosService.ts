import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'
import { Rota } from '@/types/rota'

export interface SettlementSummary {
  orderId: number
  employee: string
  clientCode: number
  clientName: string
  acertoDate: string
  acertoTime: string
  totalSalesValue: number
  paymentFormsBD: string // FORMA from BANCO_DE_DADOS
  payments: {
    method: string
    value: number
  }[]
  totalPaid: number
  totalDiscount: number
  valorDevido: number
}

export const resumoAcertosService = {
  async getAllRoutes() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as Rota[]
  },

  async getLatestRoute() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async finishAndStartNewRoute(currentRouteId: number) {
    const now = new Date().toISOString()

    // 1. Close current route
    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: now,
      })
      .eq('id', currentRouteId)

    if (endError) throw endError

    // 2. Determine new ID safely
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || currentRouteId) + 1

    // 3. Insert new route
    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: now,
      })
      .select()
      .single()

    if (startError) throw startError

    return newRota as Rota
  },

  async getSettlements(rota: Rota) {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    // Optimistic fetching strategy:
    // Fetch records where 'DATA DO ACERTO' is within the date range of the route
    // (ignoring time component at DB level for broader fetch, then filtering precisely in JS)
    const datePartStart = rota.data_inicio.split('T')[0]
    // If route is open, we just look forward. If closed, we look up to end date.
    const datePartEnd = rota.data_fim ? rota.data_fim.split('T')[0] : null

    let query = supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .gte('"DATA DO ACERTO"', datePartStart)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    // Only apply DB upper bound if route is closed,
    // to allow 'today's' records if route is open
    if (datePartEnd) {
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

      // Construct Date object for the record
      const rowDateTimeStr = `${dateStr}T${timeStr}`
      let rowDateTime: Date
      try {
        rowDateTime = parseISO(rowDateTimeStr)
      } catch (e) {
        return
      }

      // Precise filtering
      // Record time must be >= Route Start AND <= Route End (if closed)
      const isAfterOrEqualStart =
        isAfter(rowDateTime, routeStart) || isEqual(rowDateTime, routeStart)
      const isBeforeOrEqualEnd =
        isBefore(rowDateTime, routeEnd) || isEqual(rowDateTime, routeEnd)

      if (!isAfterOrEqualStart) return
      // If route is closed, enforce end time. If open, we accept up to now (which matches logic)
      if (rota.data_fim && !isBeforeOrEqualEnd) return

      const orderId = row['NÚMERO DO PEDIDO']
      if (!ordersMap.has(orderId)) {
        // Parse discount string (e.g. "10%")
        const discountStr = row['DESCONTO POR GRUPO'] || '0'
        const discountVal = parseCurrency(discountStr.replace('%', ''))
        const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal

        ordersMap.set(orderId, {
          orderId,
          employee: row['FUNCIONÁRIO'] || 'N/D',
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          acertoDate: dateStr,
          acertoTime: timeStr,
          totalSalesValue: 0,
          paymentFormsBD: row['FORMA'] || '',
          payments: [],
          totalPaid: 0,
          totalDiscount: 0,
          valorDevido: 0,
        })
      }

      const order = ordersMap.get(orderId)!
      const itemValue = parseCurrency(row['VALOR VENDA PRODUTO'])
      order.totalSalesValue += itemValue

      // Re-calculate discount based on accumulated total (simplified logic)
      // Assuming discount factor is constant per order items
      const discountStr = row['DESCONTO POR GRUPO'] || '0'
      const discountVal = parseCurrency(discountStr.replace('%', ''))
      const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal

      // Accumulate theoretical discount for this item
      order.totalDiscount += itemValue * discountFactor
    })

    const orderIds = Array.from(ordersMap.keys())

    if (orderIds.length > 0) {
      // Fetch Payments from RECEBIMENTOS
      // Using 'venda_id' to link
      const { data: payData, error: payError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id, forma_pagamento, valor_pago')
        .in('venda_id', orderIds)

      if (payError) throw payError

      payData?.forEach((p: any) => {
        const order = ordersMap.get(p.venda_id)
        if (order) {
          if (p.valor_pago > 0) {
            order.payments.push({
              method: p.forma_pagamento,
              value: p.valor_pago,
            })
            order.totalPaid += p.valor_pago
          }
        }
      })
    }

    // Final calculations
    ordersMap.forEach((order) => {
      // Calculate "Valor a Receber" (Expected - Paid)
      const netValue = order.totalSalesValue - order.totalDiscount
      order.valorDevido = Math.max(0, netValue - order.totalPaid)
    })

    return Array.from(ordersMap.values()).sort((a, b) => b.orderId - a.orderId)
  },
}
