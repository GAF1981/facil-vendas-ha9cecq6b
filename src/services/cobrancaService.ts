import { supabase } from '@/lib/supabase/client'
import { ClientDebt, OrderDebt, Receivable } from '@/types/cobranca'
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

    // 2. Fetch data from RECEBIMENTOS (Granular rows)
    // Renamed data_pagamento to vencimento
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento',
      )

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

    // 4. Aggregate Payments and Installments by Order ID
    const paymentsMap = new Map<
      number,
      { total: number; history: any[]; installments: Receivable[] }
    >()
    const today = startOfDay(new Date())

    recData?.forEach((r) => {
      const pid = r.venda_id
      if (!paymentsMap.has(pid)) {
        paymentsMap.set(pid, { total: 0, history: [], installments: [] })
      }
      const entry = paymentsMap.get(pid)!

      // History of payments (only if paid > 0)
      if (r.valor_pago > 0) {
        entry.total += r.valor_pago
        entry.history.push({ date: r.vencimento, value: r.valor_pago })
      }

      // Granular Installment/Row Logic
      const valorRegistrado = r.valor_registrado ?? 0
      const valorPago = r.valor_pago ?? 0
      let status: 'VENCIDO' | 'A VENCER' | 'PAGO' = 'A VENCER'

      if (valorPago >= valorRegistrado && valorRegistrado > 0) {
        status = 'PAGO'
      } else if (
        r.vencimento &&
        isBefore(parseISO(r.vencimento), today) &&
        valorPago < valorRegistrado
      ) {
        status = 'VENCIDO'
      }

      entry.installments.push({
        id: r.id,
        vencimento: r.vencimento,
        valorRegistrado: valorRegistrado,
        valorPago: valorPago,
        formaPagamento: r.forma_pagamento,
        status,
      })
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
          formaPagamento: row['FORMA'] || 'N/D',
          formaCobranca: row['forma_cobranca'],
          dataCombinada: row['data_combinada'],
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

      // Get Paid Amount and Installments
      const paymentInfo = paymentsMap.get(order.orderId) || {
        total: 0,
        history: [],
        installments: [],
      }
      const paidValue = paymentInfo.total
      const remaining = netValue - paidValue
      let installments = paymentInfo.installments

      // Fallback: If no installments found in RECEBIMENTOS, create a synthetic one from Order
      if (installments.length === 0) {
        installments.push({
          id: -order.orderId, // Temp ID
          vencimento: order.date, // Default to order date
          valorRegistrado: netValue,
          valorPago: paidValue,
          formaPagamento: order.formaPagamento,
          status:
            remaining > 0.05
              ? isBefore(parseISO(order.date), today)
                ? 'VENCIDO'
                : 'A VENCER'
              : 'PAGO',
        })
      } else {
        // Sort installments by vencimento
        installments.sort((a, b) => {
          if (!a.vencimento) return 1
          if (!b.vencimento) return -1
          return (
            new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
          )
        })
      }

      // Determine Order Status based on installments
      let status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO' = 'SEM DÉBITO'
      let oldestOverdue: string | null = null

      if (remaining > 0.05) {
        status = 'A VENCER' // Default if debt exists
        // Check if any installment is overdue
        const hasOverdue = installments.some((i) => i.status === 'VENCIDO')
        if (hasOverdue) {
          status = 'VENCIDO'
          const overdueItem = installments.find((i) => i.status === 'VENCIDO')
          if (overdueItem && overdueItem.vencimento) {
            oldestOverdue = overdueItem.vencimento
          }
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
        installments: installments, // Added
        oldestOverdueDate: oldestOverdue,
        formaPagamento: order.formaPagamento,
        valorDevido: netValue,
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
