import { supabase } from '@/lib/supabase/client'
import {
  ClientDebt,
  OrderDebt,
  Receivable,
  CollectionAction,
  CollectionActionInsert,
  LatestCollectionActionView,
} from '@/types/cobranca'
import { isBefore, parseISO, startOfDay, isValid } from 'date-fns'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    const today = startOfDay(new Date())

    const { data: debtsData, error: debtsError } = await supabase
      .from('debitos_historico')
      .select(
        'pedido_id, cliente_codigo, cliente_nome, valor_venda, valor_pago, debito, data_acerto, vendedor_nome, rota_id, saldo_a_pagar',
      )
      .gt('debito', 0) // Updated to 0 as per requirements
      .order('pedido_id', { ascending: false })
      .limit(50000)

    if (debtsError) throw debtsError

    const validDebts = (debtsData || []).filter(
      (d) => d && d.pedido_id != null && d.debito != null,
    )

    const orderIds = validDebts.map((d) => d.pedido_id)

    if (orderIds.length === 0) return []

    const clientIds = [
      ...new Set(
        validDebts
          .map((d) => d.cliente_codigo)
          .filter((id): id is number => id != null),
      ),
    ]

    let clientInfoMap = new Map<
      number,
      {
        type: string
        group: string | null
        route: string | null
        address: string | null
        neighborhood: string | null
        city: string | null
        cep: string | null
        situacao: string | null
      }
    >()

    // Fetch Client Details
    if (clientIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < clientIds.length; i += chunkSize) {
        const chunk = clientIds.slice(i, i + chunkSize)
        const { data: clientData, error: clientError } = await supabase
          .from('CLIENTES')
          .select(
            'CODIGO, "TIPO DE CLIENTE", GRUPO, "GRUPO ROTA", ENDEREÇO, BAIRRO, MUNICÍPIO, situacao, "CEP OFICIO"',
          )
          .in('CODIGO', chunk)

        if (clientError) {
          console.error('Error fetching clients:', clientError)
        } else {
          clientData?.forEach((c) => {
            if (!c.CODIGO) return
            clientInfoMap.set(c.CODIGO, {
              type: c['TIPO DE CLIENTE'] || 'N/D',
              group: (c as any)['GRUPO'] || null,
              route: (c as any)['GRUPO ROTA'] || null,
              address: (c as any)['ENDEREÇO'] || null,
              neighborhood: (c as any)['BAIRRO'] || null,
              city: (c as any)['MUNICÍPIO'] || null,
              cep: (c as any)['CEP OFICIO'] || null,
              situacao: (c as any)['situacao'] || 'ATIVO',
            })
          })
        }
      }
    }

    // Fetch Action Counts Per Client
    const clientActionCounts = new Map<number, number>()
    if (clientIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < clientIds.length; i += chunkSize) {
        const chunk = clientIds.slice(i, i + chunkSize)
        const { data: actionsData, error: actionsError } = await supabase
          .from('acoes_cobranca')
          .select('cliente_id')
          .in('cliente_id', chunk)

        if (!actionsError && actionsData) {
          actionsData.forEach((a) => {
            if (a.cliente_id) {
              clientActionCounts.set(
                a.cliente_id,
                (clientActionCounts.get(a.cliente_id) || 0) + 1,
              )
            }
          })
        }
      }
    }

    const actionsMap = new Map<number, LatestCollectionActionView[]>()
    const chunkSize = 1000
    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize)
      const { data: actionsData, error: actionsError } = await supabase
        .from('view_latest_collection_actions')
        .select('*')
        .in('pedido_id', chunk)

      if (actionsError) throw actionsError

      actionsData?.forEach((row: any) => {
        const pId = row.pedido_id
        if (pId != null) {
          if (!actionsMap.has(pId)) {
            actionsMap.set(pId, [])
          }
          actionsMap.get(pId)!.push(row)
        }
      })
    }

    const paymentsMap = new Map<
      number,
      {
        totalPaid: number
        history: { date: string; value: number }[]
        rawInstallments: any[]
      }
    >()

    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize)
      const { data: recData, error: recError } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento, forma_cobranca, data_combinada',
        )
        .in('venda_id', chunk)

      if (recError) throw recError

      recData?.forEach((r: any) => {
        const pid = r.venda_id
        if (pid == null) return

        if (!paymentsMap.has(pid)) {
          paymentsMap.set(pid, {
            totalPaid: 0,
            history: [],
            rawInstallments: [],
          })
        }
        const entry = paymentsMap.get(pid)!

        const valPago = Number(r.valor_pago) || 0
        if (valPago > 0) {
          entry.totalPaid += valPago
          entry.history.push({
            date: r.vencimento || '',
            value: valPago,
          })
        }

        entry.rawInstallments.push(r)
      })
    }

    const clientsMap = new Map<number, ClientDebt>()

    validDebts.forEach((debt) => {
      const pid = debt.pedido_id
      const cid = debt.cliente_codigo ?? 0

      const rawDebt = Number(debt.debito) || 0
      const rawTotal = Number(debt.valor_venda) || 0
      const rawPaid = Number(debt.valor_pago) || 0
      const dateAcerto = debt.data_acerto || new Date().toISOString()
      const saldoPagar = Number(debt.saldo_a_pagar) || 0

      let installments: Receivable[] = []
      const actionRows = actionsMap.get(pid)
      const paymentInfo = paymentsMap.get(pid) || {
        totalPaid: 0,
        history: [],
        rawInstallments: [],
      }

      if (actionRows && actionRows.length > 0) {
        installments = actionRows.map((row) => {
          const vDate = row.installment_vencimento
          const parsedDate = vDate ? parseISO(vDate) : null
          const isOverdue =
            parsedDate && isValid(parsedDate) && isBefore(parsedDate, today)

          return {
            id: row.installment_id || 0,
            vencimento: vDate || null,
            valorRegistrado: Number(row.installment_valor) || 0,
            valorPago: 0,
            formaPagamento: row.installment_forma_pagamento || 'Outros',
            status: isOverdue ? 'VENCIDO' : 'A VENCER',
            formaCobranca: null,
            dataCombinada: row.nova_data_combinada || null,
            source: 'NEGOTIATION',
          }
        })
      } else {
        installments = paymentInfo.rawInstallments.map((r) => {
          const valReg = Number(r.valor_registrado) || 0
          const valPago = Number(r.valor_pago) || 0
          let status: 'VENCIDO' | 'A VENCER' | 'PAGO' = 'A VENCER'

          const vDate = r.vencimento
          const parsedDate = vDate ? parseISO(vDate) : null

          if (valPago >= valReg && valReg > 0) {
            status = 'PAGO'
          } else if (
            parsedDate &&
            isValid(parsedDate) &&
            isBefore(parsedDate, today) &&
            valPago < valReg
          ) {
            status = 'VENCIDO'
          }

          return {
            id: r.id,
            vencimento: vDate || null,
            valorRegistrado: valReg,
            valorPago: valPago,
            formaPagamento: r.forma_pagamento || 'N/D',
            status,
            formaCobranca: r.forma_cobranca || null,
            dataCombinada: r.data_combinada || null,
            source: 'RECEIPT',
          }
        })
      }

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

      const orderObj: OrderDebt = {
        orderId: pid,
        date: dateAcerto,
        totalValue: rawTotal,
        discount: 0,
        netValue: saldoPagar,
        paidValue: rawPaid,
        remainingValue: rawDebt,
        status,
        paymentDetails: [],
        paymentsMade: paymentInfo.history,
        installments,
        oldestOverdueDate: oldestOverdue,
        formaPagamento: 'N/D',
        valorDevido: rawDebt,
        collectionActionCount: actionRows ? actionRows.length : 0,
        employeeName: debt.vendedor_nome || null,
      }

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
          cep: cInfo?.cep || null,
          situacao: cInfo?.situacao || 'ATIVO',
          totalDebt: 0,
          orderCount: 0,
          status: 'SEM DÉBITO',
          lastAcertoDate: dateAcerto,
          oldestOverdueDate: null,
          earliestUnpaidDate: null,
          orders: [],
          totalActionCount: clientActionCounts.get(cid) || 0,
        })
      }

      const client = clientsMap.get(cid)!
      client.totalDebt += rawDebt
      client.orderCount++
      client.orders.push(orderObj)

      if (status === 'VENCIDO') client.status = 'VENCIDO'
      else if (status === 'A VENCER' && client.status !== 'VENCIDO')
        client.status = 'A VENCER'

      if (dateAcerto > client.lastAcertoDate) client.lastAcertoDate = dateAcerto
    })

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
      const { error } = await supabase
        .from('RECEBIMENTOS')
        .update({ [field]: value } as any)
        .eq('id', receivableId)

      if (error) throw error
    }
  },

  async getCollectionActions(orderId: string): Promise<CollectionAction[]> {
    if (!orderId) return []

    const { data, error } = await supabase
      .from('acoes_cobranca')
      .select('*, acoes_cobranca_vencimentos(*)')
      .eq('pedido_id', Number(orderId) || 0)
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

    const { data: insertedAction, error } = await supabase
      .from('acoes_cobranca')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

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
      await supabase
        .from('BANCO_DE_DADOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('"NÚMERO DO PEDIDO"', action.pedidoId)

      await supabase
        .from('RECEBIMENTOS')
        .update({ data_combinada: action.novaDataCombinada } as any)
        .eq('venda_id', action.pedidoId)
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
