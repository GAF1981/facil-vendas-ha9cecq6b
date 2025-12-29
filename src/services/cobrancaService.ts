import { supabase } from '@/lib/supabase/client'
import {
  ClientDebt,
  OrderDebt,
  Receivable,
  CollectionAction,
  CollectionActionInsert,
} from '@/types/cobranca'
import { parseCurrency } from '@/lib/formatters'
import { isBefore, parseISO, startOfDay } from 'date-fns'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    // 1. Fetch data from BANCO_DE_DADOS
    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "VALOR VENDIDO", "DESCONTO POR GRUPO", "DATA DO ACERTO", "DETALHES_PAGAMENTO", "VALOR DEVIDO", "FORMA", "CODIGO FUNCIONARIO", data_combinada',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (dbError) throw dbError

    // 2. Fetch data from RECEBIMENTOS (Granular rows)
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento, forma_cobranca, data_combinada',
      )

    if (recError) throw recError

    // 2.5 Fetch Collection Actions Counts from new table
    const { data: cobrancaData, error: cobrancaError } = await supabase
      .from('AÇOES DE COBRANÇA' as any)
      .select('"NÚMERO DO PEDIDO"')

    if (cobrancaError) throw cobrancaError

    const cobrancaCounts = new Map<number, number>()
    cobrancaData?.forEach((row: any) => {
      const pid = row['NÚMERO DO PEDIDO']
      if (pid) {
        cobrancaCounts.set(pid, (cobrancaCounts.get(pid) || 0) + 1)
      }
    })

    // 3. Fetch Client Types, Groups and Address Info efficiently
    const clientIds = [
      ...new Set(dbData?.map((r) => r['CÓDIGO DO CLIENTE']) || []),
    ] as number[]

    let clientInfoMap = new Map<
      number,
      {
        type: string
        group: string | null
        route: string | null
        address: string | null
        neighborhood: string | null
        city: string | null
      }
    >()
    if (clientIds.length > 0) {
      const { data: clientData, error: clientError } = await supabase
        .from('CLIENTES')
        .select(
          'CODIGO, "TIPO DE CLIENTE", GRUPO, "GRUPO ROTA", ENDEREÇO, BAIRRO, MUNICÍPIO',
        )
        .in('CODIGO', clientIds)

      if (!clientError && clientData) {
        clientData.forEach((c) => {
          clientInfoMap.set(c.CODIGO, {
            type: c['TIPO DE CLIENTE'] || 'N/D',
            group: (c as any)['GRUPO'] || null,
            route: (c as any)['GRUPO ROTA'] || null,
            address: (c as any)['ENDEREÇO'] || null,
            neighborhood: (c as any)['BAIRRO'] || null,
            city: (c as any)['MUNICÍPIO'] || null,
          })
        })
      }
    }

    // 4. Aggregate Payments and Installments by Order ID
    const paymentsMap = new Map<
      number,
      { total: number; history: any[]; installments: Receivable[] }
    >()
    const today = startOfDay(new Date())

    recData?.forEach((r: any) => {
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
        formaCobranca: r.forma_cobranca,
        dataCombinada: r.data_combinada,
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
          funcionarioId: row['CODIGO FUNCIONARIO'],
          dataCombinada: row.data_combinada,
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
          id: -order.orderId, // Synthetic ID (Negative)
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
          formaCobranca: null,
          dataCombinada: order.dataCombinada || null,
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
        installments: installments,
        oldestOverdueDate: oldestOverdue,
        formaPagamento: order.formaPagamento,
        valorDevido: netValue,
        collectionActionCount: cobrancaCounts.get(order.orderId) || 0,
      }

      if (!clientsMap.has(order.clientId)) {
        const clientInfo = clientInfoMap.get(order.clientId)
        clientsMap.set(order.clientId, {
          clientId: order.clientId,
          clientName: order.clientName || `Cliente ${order.clientId}`,
          clientType: clientInfo?.type || 'N/D',
          group: clientInfo?.group || null,
          routeGroup: clientInfo?.route || null,
          address: clientInfo?.address || null,
          neighborhood: clientInfo?.neighborhood || null,
          city: clientInfo?.city || null,
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

  /**
   * Updates a specific receivable field (Forma de Cobrança or Data Combinada).
   * Supports both real and synthetic (temporary) receivables.
   */
  async updateReceivableField(
    receivableId: number,
    orderId: number,
    field: 'forma_cobranca' | 'data_combinada',
    value: any,
    syntheticData?: {
      valorRegistrado: number
      vencimento: string | null
      formaPagamento: string
    },
  ) {
    if (receivableId < 0) {
      // Synthetic ID: We need to materialize this into RECEBIMENTOS first
      // 1. Fetch Order Context
      const { data: orderData, error: orderError } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"CÓDIGO DO CLIENTE", "CODIGO FUNCIONARIO", "NÚMERO DO PEDIDO"')
        .eq('"NÚMERO DO PEDIDO"', orderId)
        .limit(1)
        .single()

      if (orderError || !orderData) {
        throw new Error(
          'Não foi possível encontrar o pedido para criar o registro de recebimento.',
        )
      }

      // 2. Insert new RECEBIMENTOS row
      const insertPayload = {
        venda_id: orderId,
        cliente_id: orderData['CÓDIGO DO CLIENTE'],
        funcionario_id: orderData['CODIGO FUNCIONARIO'],
        forma_pagamento: syntheticData?.formaPagamento || 'Outros',
        valor_registrado: syntheticData?.valorRegistrado || 0,
        valor_pago: 0,
        vencimento: syntheticData?.vencimento,
        [field]: value,
      }

      // We need to use 'as any' because types might not be generated yet for new cols
      const { error: insertError } = await supabase
        .from('RECEBIMENTOS')
        .insert(insertPayload as any)

      if (insertError) throw insertError
    } else {
      // Real ID: Direct Update
      const { error } = await supabase
        .from('RECEBIMENTOS')
        .update({ [field]: value } as any)
        .eq('id', receivableId)

      if (error) throw error
    }
  },

  async getCollectionActions(orderId: string): Promise<CollectionAction[]> {
    // Cast to any to access new table not in types
    const { data, error } = await supabase
      .from('AÇOES DE COBRANÇA' as any)
      .select('*')
      .eq('NÚMERO DO PEDIDO', Number(orderId)) // Ensure it is number
      .order('DATA AÇÃO COBRANÇA', { ascending: false })

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row['ID AÇÃO'],
      acao: row['AÇÃO DE COBRANÇA'],
      dataAcao: row['DATA AÇÃO COBRANÇA'],
      novaDataCombinada: row['NOVA DATA COMBINADA PAGAMENTO'],
      funcionarioNome: row['NOME FUNCIONÁRIO'],
      funcionarioId: row['CÓDIGO FUNCIONÁRIO'],
      pedidoId: row['NÚMERO DO PEDIDO'],
      clienteId: row['COD. CLIENTE'],
      clienteNome: row['CLIENTE'],
    }))
  },

  async addCollectionAction(action: CollectionActionInsert): Promise<void> {
    // Explicitly casting and mapping to database schema to avoid type mismatch
    const payload = {
      'AÇÃO DE COBRANÇA': action.acao,
      'DATA AÇÃO COBRANÇA': action.dataAcao,
      'NOVA DATA COMBINADA PAGAMENTO': action.novaDataCombinada || null,
      'NOME FUNCIONÁRIO': action.funcionarioNome,
      'CÓDIGO FUNCIONÁRIO': action.funcionarioId, // Number
      'NÚMERO DO PEDIDO': action.pedidoId, // Number
      'COD. CLIENTE': action.clienteId, // Number
      CLIENTE: action.clienteNome,
    }

    const { error } = await supabase
      .from('AÇOES DE COBRANÇA' as any)
      .insert(payload)

    if (error) throw error

    // Update BANCO_DE_DADOS and RECEBIMENTOS if novaDataCombinada is provided
    if (action.novaDataCombinada) {
      // 1. Update BANCO_DE_DADOS (Using quotes for NÚMERO DO PEDIDO due to spaces)
      const { error: bdError } = await supabase
        .from('BANCO_DE_DADOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('"NÚMERO DO PEDIDO"', action.pedidoId)

      if (bdError) {
        console.error('Error updating BANCO_DE_DADOS data_combinada:', bdError)
        // We log but don't throw, as the main action was saved
      }

      // 2. Update RECEBIMENTOS (for all records of this order)
      const { error: recError } = await supabase
        .from('RECEBIMENTOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('venda_id', action.pedidoId)

      if (recError) {
        console.error('Error updating RECEBIMENTOS data_combinada:', recError)
      }
    }
  },
}
