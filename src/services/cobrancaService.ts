import { supabase } from '@/lib/supabase/client'
import { ClientDebt, OrderDebt } from '@/types/cobranca'
import { parseCurrency } from '@/lib/formatters'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import { PaymentEntry } from '@/types/payment'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    // 1. Fetch data from BANCO_DE_DADOS
    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "VALOR VENDIDO", "DESCONTO POR GRUPO", "DATA DO ACERTO", "DETALHES_PAGAMENTO", "VALOR DEVIDO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (dbError) throw dbError

    // 2. Fetch data from RECEBIMENTOS
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, valor_pago, data_pagamento')

    if (recError) throw recError

    // 3. Fetch Client Types efficiently
    // Extract unique client IDs from transactions
    const clientIds = [
      ...new Set(dbData?.map((r) => r['CÓDIGO DO CLIENTE']) || []),
    ] as number[]

    // Fetch details for these clients
    let clientTypesMap = new Map<number, string>()
    if (clientIds.length > 0) {
      const { data: clientData, error: clientError } = await supabase
        .from('CLIENTES')
        .select('CODIGO, "TIPO DE CLIENTE"')
        .in('CODIGO', clientIds)

      if (!clientError && clientData) {
        clientData.forEach((c) => {
          clientTypesMap.set(c.CODIGO, c['TIPO DE CLIENTE'] || 'N/D')
        })
      }
    }

    // 4. Aggregate Payments by Order ID
    const paymentsMap = new Map<number, { total: number; history: any[] }>()
    recData?.forEach((r) => {
      const pid = r.venda_id
      if (!paymentsMap.has(pid)) {
        paymentsMap.set(pid, { total: 0, history: [] })
      }
      const entry = paymentsMap.get(pid)!
      entry.total += r.valor_pago
      entry.history.push({ date: r.data_pagamento, value: r.valor_pago })
    })

    // 5. Aggregate Sales items into Orders
    const ordersMap = new Map<number, any>()

    dbData?.forEach((row) => {
      const oid = row['NÚMERO DO PEDIDO']
      if (!oid) return

      if (!ordersMap.has(oid)) {
        ordersMap.set(oid, {
          orderId: oid,
          clientId: row['CÓDIGO DO CLIENTE'],
          clientName: row['CLIENTE'],
          date: row['DATA DO ACERTO'],
          rawTotal: 0,
          discountStr: row['DESCONTO POR GRUPO'],
          paymentDetailsJSON: row['DETALHES_PAGAMENTO'],
          // Accumulate VALOR DEVIDO if present
          totalValorDevido: 0,
        })
      }
      const order = ordersMap.get(oid)
      order.rawTotal += parseCurrency(row['VALOR VENDIDO'])

      // Accumulate new column if exists
      if (row['VALOR DEVIDO'] !== null && row['VALOR DEVIDO'] !== undefined) {
        order.totalValorDevido += row['VALOR DEVIDO']
      } else {
        // Fallback if null (shouldn't happen with migration, but safety)
        // We will calculate later if this remains 0 and no rows had it
      }
    })

    // 6. Process Orders to calculate Debt and Status per Client
    const clientsMap = new Map<number, ClientDebt>()
    const today = startOfDay(new Date())

    ordersMap.forEach((order) => {
      // Calculate Net Value
      // If totalValorDevido is > 0, use it (from column).
      // Else, fallback to calculation (Total - Discount).
      let netValue = 0
      let discountAmount = 0

      if (order.totalValorDevido > 0.001) {
        netValue = order.totalValorDevido
        // Back-calculate discount for display
        discountAmount = order.rawTotal - netValue
      } else {
        const descontoStr = order.discountStr || '0'
        const descontoVal = parseCurrency(descontoStr.replace('%', ''))
        const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
        discountAmount = order.rawTotal * discountFactor
        netValue = order.rawTotal - discountAmount
      }

      // Get Paid Amount
      const paymentInfo = paymentsMap.get(order.orderId) || {
        total: 0,
        history: [],
      }
      const paidValue = paymentInfo.total
      const remaining = netValue - paidValue

      // Only consider orders with actual remaining debt
      if (remaining > 0.05) {
        // Determine Status based on payment schedule
        let status: 'VENCIDO' | 'A VENCER' = 'A VENCER'
        let oldestOverdue: string | null = null

        const expectedPayments: { date: Date; value: number }[] = []
        const details = order.paymentDetailsJSON as PaymentEntry[] | null

        if (details && Array.isArray(details)) {
          details.forEach((p) => {
            if (p.installments > 1 && p.details) {
              p.details.forEach((d) => {
                if (d.dueDate) {
                  expectedPayments.push({
                    date: parseISO(d.dueDate),
                    value: d.value,
                  })
                }
              })
            } else {
              if (p.dueDate) {
                expectedPayments.push({
                  date: parseISO(p.dueDate),
                  value: p.value,
                })
              }
            }
          })
        }

        expectedPayments.sort((a, b) => a.date.getTime() - b.date.getTime())

        let availablePayment = paidValue
        let isOverdue = false

        for (const expected of expectedPayments) {
          if (availablePayment >= expected.value - 0.01) {
            availablePayment -= expected.value
          } else {
            if (isBefore(expected.date, today)) {
              isOverdue = true
              if (!oldestOverdue) oldestOverdue = expected.date.toISOString()
            }
            availablePayment = 0
          }
        }

        if (expectedPayments.length > 0 && isOverdue) {
          status = 'VENCIDO'
        }

        const orderObj: OrderDebt = {
          orderId: order.orderId,
          date: order.date,
          totalValue: order.rawTotal,
          discount: discountAmount,
          netValue: netValue,
          paidValue: paidValue,
          remainingValue: remaining,
          status: status,
          paymentDetails: details || [],
          paymentsMade: paymentInfo.history,
          oldestOverdueDate: oldestOverdue,
        }

        if (!clientsMap.has(order.clientId)) {
          clientsMap.set(order.clientId, {
            clientId: order.clientId,
            clientName: order.clientName || `Cliente ${order.clientId}`,
            clientType: clientTypesMap.get(order.clientId) || 'N/D',
            totalDebt: 0,
            orderCount: 0,
            status: 'A VENCER',
            lastAcertoDate: order.date,
            oldestOverdueDate: null,
            orders: [],
          })
        }

        const clientDebt = clientsMap.get(order.clientId)!
        clientDebt.totalDebt += remaining
        clientDebt.orderCount += 1
        clientDebt.orders.push(orderObj)

        if (status === 'VENCIDO') {
          clientDebt.status = 'VENCIDO'
        }

        if (order.date > clientDebt.lastAcertoDate) {
          clientDebt.lastAcertoDate = order.date
        }

        if (oldestOverdue) {
          if (
            !clientDebt.oldestOverdueDate ||
            oldestOverdue < clientDebt.oldestOverdueDate
          ) {
            clientDebt.oldestOverdueDate = oldestOverdue
          }
        }
      }
    })

    return Array.from(clientsMap.values()).sort((a, b) => {
      if (a.status === 'VENCIDO' && b.status !== 'VENCIDO') return -1
      if (a.status !== 'VENCIDO' && b.status === 'VENCIDO') return 1
      return b.totalDebt - a.totalDebt
    })
  },
}
