import { supabase } from '@/lib/supabase/client'
import {
  ClientDebt,
  OrderDebt,
  Receivable,
  CollectionAction,
  CollectionActionInsert,
  LatestCollectionActionView,
} from '@/types/cobranca'
import { parseCurrency } from '@/lib/formatters'
import { isBefore, parseISO, startOfDay } from 'date-fns'

export const cobrancaService = {
  // Existing methods ...
  async getDebts(): Promise<ClientDebt[]> {
    const today = startOfDay(new Date())

    // 1. Fetch Debts from debitos_historico (Primary Source for Debt Logic)
    // This table is synced with Route Control logic
    const { data: debtsData, error: debtsError } = await supabase
      .from('debitos_historico')
      .select(
        'pedido_id, cliente_codigo, cliente_nome, valor_venda, valor_pago, debito, data_acerto, vendedor_nome, rota_id, saldo_a_pagar',
      )
      .gt('debito', 1) // Only fetch relevant debts > 1.00
      .limit(10000)

    if (debtsError) throw debtsError

    const orderIds = debtsData.map((d) => d.pedido_id)

    if (orderIds.length === 0) return []

    // 2. Fetch Client Info (Address, etc)
    const clientIds = [...new Set(debtsData.map((d) => d.cliente_codigo))]
    let clientInfoMap = new Map<
      number,
      {
        type: string
        group: string | null
        route: string | null
        address: string | null
        neighborhood: string | null
        city: string | null
        situacao: string | null
      }
    >()

    if (clientIds.length > 0) {
      const { data: clientData, error: clientError } = await supabase
        .from('CLIENTES')
        .select(
          'CODIGO, "TIPO DE CLIENTE", GRUPO, "GRUPO ROTA", ENDEREÇO, BAIRRO, MUNICÍPIO, situacao',
        )
        .in('CODIGO', clientIds)

      if (clientError) console.error('Error fetching clients:', clientError)
      else {
        clientData?.forEach((c) => {
          clientInfoMap.set(c.CODIGO, {
            type: c['TIPO DE CLIENTE'] || 'N/D',
            group: (c as any)['GRUPO'] || null,
            route: (c as any)['GRUPO ROTA'] || null,
            address: (c as any)['ENDEREÇO'] || null,
            neighborhood: (c as any)['BAIRRO'] || null,
            city: (c as any)['MUNICÍPIO'] || null,
            situacao: (c as any)['situacao'] || 'ATIVO',
          })
        })
      }
    }

    // 3. Fetch Latest Collection Actions (Negotiated Installments)
    const { data: actionsData, error: actionsError } = await supabase
      .from('view_latest_collection_actions')
      .select('*')
      .in('pedido_id', orderIds)

    if (actionsError) throw actionsError

    const actionsMap = new Map<number, LatestCollectionActionView[]>()
    actionsData?.forEach((row: any) => {
      if (!actionsMap.has(row.pedido_id)) {
        actionsMap.set(row.pedido_id, [])
      }
      actionsMap.get(row.pedido_id)!.push(row)
    })

    // 4. Fetch Receipts (RECEBIMENTOS) for payments made and fallback installments
    const { data: recData, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento, forma_cobranca, data_combinada',
      )
      .in('venda_id', orderIds)

    if (recError) throw recError

    const paymentsMap = new Map<
      number,
      {
        totalPaid: number
        history: { date: string; value: number }[]
        rawInstallments: any[]
      }
    >()

    recData?.forEach((r: any) => {
      const pid = r.venda_id
      if (!paymentsMap.has(pid)) {
        paymentsMap.set(pid, {
          totalPaid: 0,
          history: [],
          rawInstallments: [],
        })
      }
      const entry = paymentsMap.get(pid)!

      if (r.valor_pago > 0) {
        entry.totalPaid += r.valor_pago
        entry.history.push({ date: r.vencimento, value: r.valor_pago })
      }

      entry.rawInstallments.push(r)
    })

    // 5. Construct Data Structure
    const clientsMap = new Map<number, ClientDebt>()

    debtsData.forEach((debt) => {
      // Basic Order Info from debitos_historico
      const pid = debt.pedido_id
      const cid = debt.cliente_codigo
      const rawDebt = Number(debt.debito)
      const rawTotal = Number(debt.valor_venda)
      const rawPaid = Number(debt.valor_pago)
      const dateAcerto = debt.data_acerto || new Date().toISOString()

      // Determine Installments
      let installments: Receivable[] = []
      const actionRows = actionsMap.get(pid)
      const paymentInfo = paymentsMap.get(pid) || {
        totalPaid: 0,
        history: [],
        rawInstallments: [],
      }

      // Logic: If Negotiated Actions exist, use them. Else use Receipts.
      if (actionRows && actionRows.length > 0) {
        // Use Negotiated Installments
        installments = actionRows.map((row) => ({
          id: row.installment_id, // From acoes_cobranca_vencimentos
          vencimento: row.installment_vencimento,
          valorRegistrado: row.installment_valor,
          valorPago: 0, // Negotiated are usually unpaid "promises"
          formaPagamento: row.installment_forma_pagamento || 'Outros',
          status:
            row.installment_vencimento &&
            isBefore(parseISO(row.installment_vencimento), today)
              ? 'VENCIDO'
              : 'A VENCER',
          formaCobranca: null,
          dataCombinada: row.nova_data_combinada,
          source: 'NEGOTIATION',
        }))
      } else {
        // Use RECEBIMENTOS
        // We filter for those that have debt or are relevant
        installments = paymentInfo.rawInstallments.map((r) => {
          const valReg = r.valor_registrado || 0
          const valPago = r.valor_pago || 0
          let status: 'VENCIDO' | 'A VENCER' | 'PAGO' = 'A VENCER'

          if (valPago >= valReg && valReg > 0) {
            status = 'PAGO'
          } else if (
            r.vencimento &&
            isBefore(parseISO(r.vencimento), today) &&
            valPago < valReg
          ) {
            status = 'VENCIDO'
          }

          return {
            id: r.id,
            vencimento: r.vencimento,
            valorRegistrado: valReg,
            valorPago: valPago,
            formaPagamento: r.forma_pagamento,
            status,
            formaCobranca: r.forma_cobranca,
            dataCombinada: r.data_combinada,
            source: 'RECEIPT',
          }
        })
      }

      // Fallback if no installments found at all
      if (installments.length === 0) {
        installments.push({
          id: -pid,
          vencimento: dateAcerto,
          valorRegistrado: rawDebt,
          valorPago: rawPaid,
          formaPagamento: 'N/D',
          status: 'A VENCER',
          formaCobranca: null,
          dataCombinada: null,
          source: 'ORIGINAL',
        })
      }

      // Determine Order Status based on installments AND debt logic
      let status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO' = 'SEM DÉBITO'
      let oldestOverdue: string | null = null

      if (rawDebt > 0.05) {
        status = 'A VENCER'
        const hasOverdue = installments.some((i) => i.status === 'VENCIDO')
        if (hasOverdue) {
          status = 'VENCIDO'
          const overdueItem = installments.find((i) => i.status === 'VENCIDO')
          if (overdueItem && overdueItem.vencimento) {
            oldestOverdue = overdueItem.vencimento
          }
        }
      }

      // Construct Order Object
      const orderObj: OrderDebt = {
        orderId: pid,
        date: dateAcerto,
        totalValue: rawTotal,
        discount: 0, // Simplification as we use net debt from View
        netValue: Number(debt.saldo_a_pagar),
        paidValue: rawPaid,
        remainingValue: rawDebt,
        status,
        paymentDetails: [], // Legacy
        paymentsMade: paymentInfo.history,
        installments,
        oldestOverdueDate: oldestOverdue,
        formaPagamento: 'N/D',
        valorDevido: rawDebt,
        collectionActionCount: actionRows ? 1 : 0, // Simplified count
        employeeName: debt.vendedor_nome,
      }

      // Add to Client
      if (!clientsMap.has(cid)) {
        const cInfo = clientInfoMap.get(cid)
        clientsMap.set(cid, {
          clientId: cid,
          clientName: debt.cliente_nome || `Cliente ${cid}`,
          clientType: cInfo?.type || 'N/D',
          group: cInfo?.group || null,
          routeGroup: cInfo?.route || null,
          address: cInfo?.address || null,
          neighborhood: cInfo?.neighborhood || null,
          city: cInfo?.city || null,
          situacao: cInfo?.situacao || 'ATIVO',
          totalDebt: 0,
          orderCount: 0,
          status: 'SEM DÉBITO',
          lastAcertoDate: dateAcerto,
          oldestOverdueDate: null,
          earliestUnpaidDate: null,
          orders: [],
        })
      }

      const client = clientsMap.get(cid)!
      client.totalDebt += rawDebt
      client.orderCount++
      client.orders.push(orderObj)

      // Update Client Aggregate Status
      if (status === 'VENCIDO') client.status = 'VENCIDO'
      else if (status === 'A VENCER' && client.status !== 'VENCIDO')
        client.status = 'A VENCER'

      if (dateAcerto > client.lastAcertoDate) client.lastAcertoDate = dateAcerto
    })

    // Final sorting
    return Array.from(clientsMap.values()).sort(
      (a, b) => b.totalDebt - a.totalDebt,
    )
  },

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
    const { data, error } = await supabase
      .from('acoes_cobranca')
      .select('*, acoes_cobranca_vencimentos(*)')
      .eq('pedido_id', Number(orderId))
      .order('data_acao', { ascending: false })

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      acao: row.acao,
      dataAcao: row.data_acao,
      novaDataCombinada: row.nova_data_combinada,
      funcionarioNome: row.funcionario_nome,
      funcionarioId: row.funcionario_id,
      pedidoId: row.pedido_id,
      clienteId: row.cliente_id,
      clienteNome: row.cliente_nome,
      installments: row.acoes_cobranca_vencimentos?.map((inst: any) => ({
        id: inst.id,
        vencimento: inst.vencimento,
        valor: inst.valor,
        forma_pagamento: inst.forma_pagamento,
      })),
    }))
  },

  async addCollectionAction(action: CollectionActionInsert): Promise<void> {
    const payload = {
      acao: action.acao,
      data_acao: action.dataAcao,
      nova_data_combinada: action.novaDataCombinada || null,
      funcionario_nome: action.funcionarioNome,
      funcionario_id: action.funcionarioId,
      pedido_id: action.pedidoId,
      cliente_id: action.clienteId,
      cliente_nome: action.clienteNome,
    }

    // Insert Main Action
    const { data: insertedAction, error } = await supabase
      .from('acoes_cobranca')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    // Insert Installments if present
    if (action.installments && action.installments.length > 0) {
      const installmentsPayload = action.installments.map((inst) => ({
        acao_cobranca_id: insertedAction.id,
        vencimento: inst.vencimento,
        valor: inst.valor,
        forma_pagamento: inst.forma_pagamento,
      }))

      const { error: instError } = await supabase
        .from('acoes_cobranca_vencimentos')
        .insert(installmentsPayload)

      if (instError) {
        console.error('Error inserting collection installments:', instError)
      }
    }

    if (action.novaDataCombinada) {
      const { error: bdError } = await supabase
        .from('BANCO_DE_DADOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('"NÚMERO DO PEDIDO"', action.pedidoId)

      if (bdError) console.error('Error updating BANCO_DE_DADOS:', bdError)

      const { error: recError } = await supabase
        .from('RECEBIMENTOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('venda_id', action.pedidoId)

      if (recError) console.error('Error updating RECEBIMENTOS:', recError)
    }
  },

  async getClientDebtSummary(clientId: number): Promise<number> {
    const { data, error } = await supabase
      .from('debitos_com_total_view')
      .select('debito_total')
      .eq('cliente_codigo', clientId)
      .limit(1)
      .single()

    if (error) return 0
    return data?.debito_total || 0
  },
}
