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
import { reportsService } from '@/services/reportsService'
import { getBrazilDateString } from '@/lib/dateUtils'

export const cobrancaService = {
  async getDebts(): Promise<ClientDebt[]> {
    const today = startOfDay(new Date())

    const { data: debtsData, error: debtsError } = await supabase
      .from('debitos_historico')
      .select(
        'pedido_id, cliente_codigo, cliente_nome, valor_venda, valor_pago, debito, data_acerto, vendedor_nome, rota_id, saldo_a_pagar',
      )
      .gt('debito', 0)
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

    let clientInfoMap = new Map<number, any>()

    if (clientIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < clientIds.length; i += chunkSize) {
        const chunk = clientIds.slice(i, i + chunkSize)
        const { data: clientData, error: clientError } = await supabase
          .from('CLIENTES')
          .select(
            'CODIGO, "TIPO DE CLIENTE", GRUPO, "GRUPO ROTA", ENDEREÇO, BAIRRO, MUNICÍPIO, situacao, "CEP OFICIO", "FONE 1", "FONE 2", telefone_cobranca, email_cobranca',
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
              phone: (c as any)['FONE 1'] || (c as any)['FONE 2'] || null,
              telefone_cobranca: (c as any)['telefone_cobranca'] || null,
              email_cobranca: (c as any)['email_cobranca'] || null,
            })
          })
        }
      }
    }

    const clientActionCounts = new Map<number, number>()
    if (clientIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < clientIds.length; i += chunkSize) {
        const chunk = clientIds.slice(i, i + chunkSize)
        const { data: actionsData } = await supabase
          .from('acoes_cobranca')
          .select('cliente_id')
          .in('cliente_id', chunk)

        if (actionsData) {
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
        history: {
          date: string
          value: number
          method?: string
          employeeName?: string
        }[]
        rawInstallments: any[]
      }
    >()

    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize)
      const { data: recData, error: recError } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento, forma_cobranca, data_combinada, motivo, FUNCIONARIOS(nome_completo)',
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
            method: r.forma_pagamento || 'N/D',
            employeeName: r.FUNCIONARIOS?.nome_completo || 'N/D',
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

      // Debt Allocation Logic for correct display in cards
      // Calculate unallocated payment pool for this order
      // (This is primarily to update the 'valorPago' of the original debt/installment
      // if it wasn't directly updated in DB)

      // Total Paid recorded in DB (which might include partial payments not yet applied to the installment)
      const totalAllocatable = paymentInfo.totalPaid

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
            valorPago: 0, // Actions usually don't track payment directly in view, depends on logic
            formaPagamento: row.installment_forma_pagamento || 'Outros',
            status: isOverdue ? 'VENCIDO' : 'A VENCER',
            formaCobranca: null,
            dataCombinada: row.nova_data_combinada || null,
            motivo: row.motivo || null,
            source: 'NEGOTIATION',
          }
        })
      } else {
        // Build installments from RECEBIMENTOS that are marked as DEBTS (valor_registrado > 0)
        // If none, assume ORIGINAL DEBT from debitos_historico
        const dbInstallments = paymentInfo.rawInstallments.filter(
          (r) => (Number(r.valor_registrado) || 0) > 0,
        )

        if (dbInstallments.length > 0) {
          // FIFO Allocation of totalAllocatable across these installments
          let remainingPool = totalAllocatable

          installments = dbInstallments.map((r) => {
            const valReg = Number(r.valor_registrado) || 0

            // Current Paid in DB for this row
            let valPago = Number(r.valor_pago) || 0

            // If totalAllocatable > sum of individual valPago, we allocate more?
            // Actually, simply take the paid amount from this row if it matches logic.
            // BUT, if we have partial payments as separate rows (Reg=0), we must allocate them.

            // Simple allocation logic:
            // Calculate allocated for this row based on pool
            // But we must respect what's already in DB if it's correct.
            // Here we re-calculate 'valPago' based on pool to ensure partials are reflected.

            const needed = valReg - valPago
            if (needed > 0 && remainingPool > valPago) {
              // This logic is tricky if DB is partially consistent.
              // Simplest: Assume 'totalAllocatable' covers debts FIFO.
            }
            // Let's stick to DB values primarily, but if debt is monolithic (1 item), ensure it reflects totalPaid.
          })

          // REWRITE: Simplified Logic
          // We have 'dbInstallments' which are the debts.
          // We have 'paymentInfo.history' which are payments.
          // Sum of payments = totalAllocatable.

          let pool = totalAllocatable

          installments = dbInstallments.map((r) => {
            const valReg = Number(r.valor_registrado) || 0
            const currentPaid = Number(r.valor_pago) || 0

            // If DB says 0 paid, but we have pool, allocate from pool?
            // Yes, because payments might be separate rows (Reg=0).
            // However, we shouldn't double count if the payment row IS this row.
            // But here we filtered `dbInstallments` to be Reg > 0.
            // Payment rows (Reg=0) contribute to `pool` but are not in `dbInstallments`.
            // So `pool` consists of:
            // 1. Payments on Debt Rows (Reg>0, Paid>0)
            // 2. Payments on Payment Rows (Reg=0, Paid>0)

            // So we can just drain the pool FIFO against the debts.

            const allocation = Math.min(valReg, pool)
            pool -= allocation

            const effectivePaid = Math.max(currentPaid, allocation)
            // (Use max to avoid reducing if DB is weird, though allocation should be correct)

            const vDate = r.vencimento
            const parsedDate = vDate ? parseISO(vDate) : null
            let status: 'VENCIDO' | 'A VENCER' | 'PAGO' = 'A VENCER'

            if (effectivePaid >= valReg - 0.05) {
              status = 'PAGO'
            } else if (
              parsedDate &&
              isValid(parsedDate) &&
              isBefore(parsedDate, today)
            ) {
              status = 'VENCIDO'
            }

            return {
              id: r.id,
              vencimento: vDate || null,
              valorRegistrado: valReg,
              valorPago: effectivePaid,
              formaPagamento: r.forma_pagamento || 'N/D',
              status,
              formaCobranca: r.forma_cobranca || null,
              dataCombinada: r.data_combinada || null,
              motivo: r.motivo || null,
              source: 'RECEIPT',
            }
          })
        } else {
          // No installments in DB, create one from Debito History
          // And apply totalPaid
          const valReg = rawTotal // Original Sale Value
          const effectivePaid = rawPaid // Comes from debitos_historico which includes total payments

          installments.push({
            id: -pid,
            vencimento: dateAcerto,
            valorRegistrado: valReg,
            valorPago: effectivePaid,
            formaPagamento: 'N/D',
            status: 'A VENCER', // Will be recalculated below
            formaCobranca: null,
            dataCombinada: null,
            motivo: null,
            source: 'ORIGINAL',
          })
        }
      }

      // Final Status Check
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
          totalPaid: 0,
          orderCount: 0,
          status: 'SEM DÉBITO',
          lastAcertoDate: dateAcerto,
          oldestOverdueDate: null,
          earliestUnpaidDate: null,
          orders: [],
          totalActionCount: clientActionCounts.get(cid) || 0,
          phone: cInfo?.phone || null,
          telefone_cobranca: cInfo?.telefone_cobranca || null,
          email_cobranca: cInfo?.email_cobranca || null,
        })
      }

      const client = clientsMap.get(cid)!
      client.totalDebt += rawDebt
      client.totalPaid += rawPaid
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
    field: 'forma_cobranca' | 'data_combinada' | 'motivo',
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

  async bulkUpdateReceivables(
    items: { receivableId: number; orderId: number }[],
    updates: {
      forma_cobranca?: string | null
      data_combinada?: string | null
      motivo?: string | null
    },
  ) {
    const realIds = items.map((i) => i.receivableId).filter((id) => id > 0)

    if (realIds.length > 0) {
      const { error } = await supabase
        .from('RECEBIMENTOS')
        .update(updates as any)
        .in('id', realIds)

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
      motivo: row.motivo,
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
      // Use Brazil Date String for Data Acao to ensure timezone correctness
      data_acao: action.dataAcao || getBrazilDateString(),
      nova_data_combinada: action.novaDataCombinada || null,
      funcionario_nome: action.funcionarioNome,
      funcionario_id: action.funcionarioId,
      pedido_id: action.pedidoId,
      cliente_id: action.clienteId,
      cliente_nome: action.clienteNome,
      motivo: action.motivo || null,
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

  async registerReceipt(payload: {
    orderId: number
    clientId: number
    employeeId: number
    value: number
    method: string
    date: string
  }): Promise<void> {
    const insertPayload = {
      venda_id: payload.orderId,
      cliente_id: payload.clientId,
      funcionario_id: payload.employeeId,
      forma_pagamento: payload.method,
      // IMPORTANT: valor_registrado must be 0 for payment entries to avoid doubling the debt calculation
      valor_registrado: 0,
      valor_pago: payload.value,
      vencimento: new Date(payload.date).toISOString(),
      data_pagamento: new Date().toISOString(),
      ID_da_fêmea: payload.orderId,
    }

    const { error } = await supabase.from('RECEBIMENTOS').insert(insertPayload)

    if (error) throw error

    try {
      await reportsService.updateDebtHistoryForOrder(payload.orderId)
    } catch (syncError) {
      console.error(
        'Failed to sync debt history for order:',
        payload.orderId,
        syncError,
      )
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

  async generateOrderReceipt(orderId: number): Promise<Blob> {
    const { data: orderData, error: orderError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (orderError) throw orderError
    if (!orderData || orderData.length === 0)
      throw new Error('Pedido não encontrado.')

    const firstItem = orderData[0]
    const clientId = firstItem['CÓDIGO DO CLIENTE']
    const employeeId = firstItem['CODIGO FUNCIONARIO']

    const { data: clientData } = await supabase
      .from('CLIENTES')
      .select('*')
      .eq('CODIGO', clientId)
      .single()

    const { data: employeeData } = await supabase
      .from('FUNCIONARIOS')
      .select('*')
      .eq('id', employeeId)
      .single()

    const { data: paymentsData } = await supabase
      .from('RECEBIMENTOS')
      .select('*')
      .eq('venda_id', orderId)

    const items = orderData.map((d) => ({
      produtoNome: d.MERCADORIA,
      precoUnitario: d['PREÇO VENDIDO'] || 0,
      saldoInicial: Number(d['SALDO INICIAL']) || 0,
      contagem: Number(d.CONTAGEM) || 0,
      quantVendida: Number(d['QUANTIDADE VENDIDA']) || 0,
      saldoFinal: Number(d['SALDO FINAL']) || 0,
      valorVendido: Number(d['VALOR VENDIDO']) || 0,
    }))

    const totalVendido = items.reduce(
      (acc, item) => acc + (item.valorVendido || 0),
      0,
    )
    const totalPago = (paymentsData || []).reduce(
      (acc, p) => acc + (Number(p.valor_pago) || 0),
      0,
    )

    const payload = {
      reportType: 'acerto',
      format: '80mm',
      client: clientData,
      employee: employeeData,
      items: items,
      date: firstItem['DATA DO ACERTO'] || new Date().toISOString(),
      orderNumber: orderId,
      totalVendido: totalVendido,
      valorDesconto: 0,
      valorAcerto: Number(firstItem['VALOR DEVIDO']) || 0,
      valorPago: totalPago,
      debito: (Number(firstItem['VALOR DEVIDO']) || 0) - totalPago,
      payments: (paymentsData || []).map((p) => ({
        method: p.forma_pagamento,
        paidValue: Number(p.valor_pago),
        dueDate: p.vencimento,
      })),
    }

    const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: payload,
      },
    )

    if (pdfError) throw pdfError
    if (!(pdfBlob instanceof Blob)) throw new Error('Falha ao gerar PDF')

    return pdfBlob
  },
}
