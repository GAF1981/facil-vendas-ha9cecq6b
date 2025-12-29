import { supabase } from '@/lib/supabase/client'
import { ClientDebt, OrderDebt } from '@/types/cobranca'
import { parseCurrency } from '@/lib/formatters'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import { PaymentEntry } from '@/types/payment'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    // 1. Fetch data from BANCO_DE_DADOS
    // We select only necessary columns to optimize performance
    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "VALOR VENDIDO", "DESCONTO POR GRUPO", "DATA DO ACERTO", "DETALHES_PAGAMENTO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (dbError) throw dbError

    // 2. Fetch data from RECEBIMENTOS
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, valor_pago, data_pagamento')

    if (recError) throw recError

    // 3. Aggregate Payments by Order ID
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

    // 4. Aggregate Sales items into Orders
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
        })
      }
      const order = ordersMap.get(oid)
      order.rawTotal += parseCurrency(row['VALOR VENDIDO'])
    })

    // 5. Process Orders to calculate Debt and Status per Client
    const clientsMap = new Map<number, ClientDebt>()
    const today = startOfDay(new Date())

    ordersMap.forEach((order) => {
      // Calculate Net Value (Apply Discount)
      const descontoStr = order.discountStr || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
      const discountAmount = order.rawTotal * discountFactor
      const netValue = order.rawTotal - discountAmount

      // Get Paid Amount
      const paymentInfo = paymentsMap.get(order.orderId) || {
        total: 0,
        history: [],
      }
      const paidValue = paymentInfo.total
      const remaining = netValue - paidValue

      // Only consider orders with actual remaining debt
      // Using 0.05 as epsilon to avoid floating point issues
      if (remaining > 0.05) {
        // Determine Status based on payment schedule
        let status: 'VENCIDO' | 'A VENCER' = 'A VENCER'
        let oldestOverdue: string | null = null

        // Flatten expected installments from DETALHES_PAGAMENTO
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

        // Sort expected payments by date
        expectedPayments.sort((a, b) => a.date.getTime() - b.date.getTime())

        // Logic: Fill expected payments buckets with available paid amount
        let availablePayment = paidValue
        let isOverdue = false

        for (const expected of expectedPayments) {
          if (availablePayment >= expected.value - 0.01) {
            // This installment is covered
            availablePayment -= expected.value
          } else {
            // Partially paid or unpaid
            // Check if this installment is overdue
            if (isBefore(expected.date, today)) {
              isOverdue = true
              if (!oldestOverdue) oldestOverdue = expected.date.toISOString()
            }
            // If even one installment is not fully covered and overdue, the order is overdue
            // Consume remaining available payment (if any) and continue checking
            availablePayment = 0
          }
        }

        if (expectedPayments.length > 0 && isOverdue) {
          status = 'VENCIDO'
        }

        // Construct OrderDebt object
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

        // Aggregate to Client
        if (!clientsMap.has(order.clientId)) {
          clientsMap.set(order.clientId, {
            clientId: order.clientId,
            clientName: order.clientName || `Cliente ${order.clientId}`,
            totalDebt: 0,
            orderCount: 0,
            status: 'A VENCER', // Default, will upgrade to VENCIDO if any order is overdue
            lastAcertoDate: order.date,
            oldestOverdueDate: null,
            orders: [],
          })
        }

        const clientDebt = clientsMap.get(order.clientId)!
        clientDebt.totalDebt += remaining
        clientDebt.orderCount += 1
        clientDebt.orders.push(orderObj)

        // Upgrade Client Status if this order is overdue
        if (status === 'VENCIDO') {
          clientDebt.status = 'VENCIDO'
        }

        // Update latest Acerto date
        if (order.date > clientDebt.lastAcertoDate) {
          clientDebt.lastAcertoDate = order.date
        }

        // Update oldest overdue date (min)
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

    // Convert map to array and sort by status (VENCIDO first) then Total Debt
    return Array.from(clientsMap.values()).sort((a, b) => {
      if (a.status === 'VENCIDO' && b.status !== 'VENCIDO') return -1
      if (a.status !== 'VENCIDO' && b.status === 'VENCIDO') return 1
      return b.totalDebt - a.totalDebt
    })
  },
}
