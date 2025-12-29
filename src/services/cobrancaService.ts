import { supabase } from '@/lib/supabase/client'
import { ClientDebt, OrderDebt } from '@/types/cobranca'
import { parseCurrency } from '@/lib/formatters'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import { PaymentEntry } from '@/types/payment'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    // 1. Fetch data from BANCO_DE_DADOS including new columns
    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "VALOR VENDIDO", "DESCONTO POR GRUPO", "DATA DO ACERTO", "DETALHES_PAGAMENTO", "VALOR DEVIDO", "FORMA", "forma_cobranca", "data_combinada"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (dbError) throw dbError

    // 2. Fetch data from RECEBIMENTOS
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, valor_pago, data_pagamento')

    if (recError) throw recError

    // 3. Fetch Client Types efficiently
    const clientIds = [
      ...new Set(dbData?.map((r) => r['CÓDIGO DO CLIENTE']) || []),
    ] as number[]

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
          totalValorDevido: 0,
          formaPagamento: row['FORMA'] || 'N/D', // New
          formaCobranca: row['forma_cobranca'], // New
          dataCombinada: row['data_combinada'], // New
        })
      }
      const order = ordersMap.get(oid)
      order.rawTotal += parseCurrency(row['VALOR VENDIDO'])

      if (row['VALOR DEVIDO'] !== null && row['VALOR DEVIDO'] !== undefined) {
        order.totalValorDevido += row['VALOR DEVIDO']
      }
    })

    // 6. Process Orders to calculate Debt and Status per Client
    const clientsMap = new Map<number, ClientDebt>()
    const today = startOfDay(new Date())

    ordersMap.forEach((order) => {
      // Calculate Net Value
      let netValue = 0
      let discountAmount = 0

      if (order.totalValorDevido > 0.001) {
        netValue = order.totalValorDevido
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

      // Logic updated: Include ALL orders, even paid ones
      let status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO' = 'A VENCER'
      let oldestOverdue: string | null = null

      if (remaining <= 0.05) {
        status = 'SEM DÉBITO'
      } else {
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
        paymentDetails: order.paymentDetailsJSON || [],
        paymentsMade: paymentInfo.history,
        oldestOverdueDate: oldestOverdue,
        formaPagamento: order.formaPagamento,
        valorDevido: netValue, // "Valor Devido" specific to this order
        formaCobranca: order.formaCobranca,
        dataCombinada: order.dataCombinada,
      }

      if (!clientsMap.has(order.clientId)) {
        clientsMap.set(order.clientId, {
          clientId: order.clientId,
          clientName: order.clientName || `Cliente ${order.clientId}`,
          clientType: clientTypesMap.get(order.clientId) || 'N/D',
          totalDebt: 0,
          orderCount: 0,
          status: 'SEM DÉBITO', // Default start
          lastAcertoDate: order.date,
          oldestOverdueDate: null,
          orders: [],
        })
      }

      const clientDebt = clientsMap.get(order.clientId)!
      if (remaining > 0.05) {
        clientDebt.totalDebt += remaining
      }
      clientDebt.orderCount += 1
      clientDebt.orders.push(orderObj)

      // Update Client Status priority: VENCIDO > A VENCER > SEM DÉBITO
      if (status === 'VENCIDO') {
        clientDebt.status = 'VENCIDO'
      } else if (status === 'A VENCER' && clientDebt.status !== 'VENCIDO') {
        clientDebt.status = 'A VENCER'
      } else if (
        status === 'SEM DÉBITO' &&
        clientDebt.status === 'SEM DÉBITO'
      ) {
        // Keep SEM DÉBITO if all orders are so
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
    })

    return Array.from(clientsMap.values()).sort((a, b) => {
      // Sort priority: VENCIDO, then by Debt Amount DESC
      if (a.status === 'VENCIDO' && b.status !== 'VENCIDO') return -1
      if (a.status !== 'VENCIDO' && b.status === 'VENCIDO') return 1
      return b.totalDebt - a.totalDebt
    })
  },

  async updateOrderField(
    orderId: number,
    field: 'forma_cobranca' | 'data_combinada',
    value: any,
  ) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ [field]: value })
      .eq('NÚMERO DO PEDIDO', orderId)

    if (error) throw error
  },
}
