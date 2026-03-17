import { supabase } from '@/lib/supabase/client'
import {
  ClientDebt,
  OrderDebt,
  Receivable,
  CollectionAction,
  CollectionActionInsert,
  LatestCollectionActionView,
  PaymentHistoryDetail,
  CollectionActionCountView,
} from '@/types/cobranca'
import { isBefore, parseISO, startOfDay, isValid } from 'date-fns'
import { reportsService } from '@/services/reportsService'
import { getBrazilDateString } from '@/lib/dateUtils'
import { parseCurrency } from '@/lib/formatters'

export const cobrancaService = {
  // ... existing code ...
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
            'CODIGO, "TIPO DE CLIENTE", GRUPO, "GRUPO ROTA", ENDEREÇO, BAIRRO, MUNICÍPIO, situacao, "CEP OFICIO", "FONE 1", "FONE 2", telefone_cobranca, email_cobranca, latitude, longitude',
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
              latitude: (c as any)['latitude'] || null,
              longitude: (c as any)['longitude'] || null,
            })
          })
        }
      }
    }

    // Fetch action counts per client
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

    // Fetch granular action counts per installment
    const granularActionCounts = new Map<string, number>()
    if (orderIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize)
        const { data: countsData } = await supabase
          .from('view_collection_action_counts')
          .select('*')
          .in('pedido_id', chunk)

        if (countsData) {
          countsData.forEach((row: any) => {
            // Key format: orderId|vencimento|formaPagamento
            const key = `${row.pedido_id}|${row.target_vencimento || 'null'}|${row.target_forma_pagamento || 'null'}`
            granularActionCounts.set(key, row.action_count)
          })
        }
      }
    }

    // Latest actions map (for negotiation info)
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
        allReceipts: any[]
        dbInstallments: any[]
      }
    >()

    for (let i = 0; i < orderIds.length; i += chunkSize) {
      const chunk = orderIds.slice(i, i + chunkSize)
      const { data: recData, error: recError } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'id, venda_id, valor_pago, vencimento, valor_registrado, forma_pagamento, forma_cobranca, data_combinada, motivo, FUNCIONARIOS(nome_completo), ID_da_fêmea, data_pagamento, created_at',
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
            allReceipts: [],
            dbInstallments: [],
          })
        }
        const entry = paymentsMap.get(pid)!

        const valPago = Number(r.valor_pago) || 0
        if (valPago > 0) {
          entry.totalPaid += valPago
          entry.history.push({
            date: r.data_pagamento || r.vencimento || '',
            value: valPago,
            method: r.forma_pagamento || 'N/D',
            employeeName: r.FUNCIONARIOS?.nome_completo || 'N/D',
          })
        }

        entry.allReceipts.push(r)

        if ((Number(r.valor_registrado) || 0) > 0) {
          entry.dbInstallments.push(r)
        }
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
        allReceipts: [],
        dbInstallments: [],
      }

      const allPayments = paymentInfo.allReceipts.filter(
        (r) => (Number(r.valor_pago) || 0) > 0,
      )

      if (actionRows && actionRows.length > 0) {
        installments = actionRows.map((row) => {
          const instId = row.installment_id || 0
          const vDate = row.installment_vencimento
          const parsedDate = vDate ? parseISO(vDate) : null
          const valReg = Number(row.installment_valor) || 0
          const formaPag = row.installment_forma_pagamento || 'Outros'

          const specificPayments = allPayments.filter(
            (p) => p.ID_da_fêmea === instId,
          )

          const specificPaid = specificPayments.reduce(
            (sum, p) => sum + (Number(p.valor_pago) || 0),
            0,
          )

          const history: PaymentHistoryDetail[] = specificPayments.map((p) => ({
            date: p.data_pagamento || p.vencimento || p.created_at || '',
            value: Number(p.valor_pago),
            method: p.forma_pagamento || 'N/D',
            employee: p.FUNCIONARIOS?.nome_completo || 'Sistema',
          }))

          const isOverdue =
            specificPaid < valReg - 0.05 &&
            parsedDate &&
            isValid(parsedDate) &&
            isBefore(parsedDate, today)

          // Granular Count Key
          const countKey = `${pid}|${vDate || 'null'}|${formaPag || 'null'}`
          const actionCount = granularActionCounts.get(countKey) || 0

          return {
            id: instId,
            vencimento: vDate || null,
            valorRegistrado: valReg,
            valorPago: specificPaid,
            formaPagamento: formaPag,
            status:
              specificPaid >= valReg - 0.05
                ? 'PAGO'
                : isOverdue
                  ? 'VENCIDO'
                  : 'A VENCER',
            formaCobranca: null,
            dataCombinada: row.nova_data_combinada || null,
            motivo: row.motivo || null,
            source: 'NEGOTIATION',
            paymentHistory: history,
            collectionActionCount: actionCount,
          }
        })
      } else if (paymentInfo.dbInstallments.length > 0) {
        installments = paymentInfo.dbInstallments.map((r) => {
          const instId = r.id
          const valReg = Number(r.valor_registrado) || 0
          const formaPag = r.forma_pagamento || 'N/D'

          const selfPayment = Number(r.valor_pago) || 0
          const linkedPayments = allPayments.filter(
            (p) => p.ID_da_fêmea === instId && p.id !== instId,
          )

          const linkedTotal = linkedPayments.reduce(
            (sum, p) => sum + (Number(p.valor_pago) || 0),
            0,
          )
          const totalPaid = selfPayment + linkedTotal

          const history: PaymentHistoryDetail[] = []
          if (selfPayment > 0) {
            history.push({
              date: r.data_pagamento || r.vencimento || r.created_at || '',
              value: selfPayment,
              method: r.forma_pagamento || 'N/D',
              employee: r.FUNCIONARIOS?.nome_completo || 'Sistema',
            })
          }
          linkedPayments.forEach((p) => {
            history.push({
              date: p.data_pagamento || p.vencimento || p.created_at || '',
              value: Number(p.valor_pago),
              method: p.forma_pagamento || 'N/D',
              employee: p.FUNCIONARIOS?.nome_completo || 'Sistema',
            })
          })

          const vDate = r.vencimento
          const parsedDate = vDate ? parseISO(vDate) : null
          const isOverdue =
            totalPaid < valReg - 0.05 &&
            parsedDate &&
            isValid(parsedDate) &&
            isBefore(parsedDate, today)

          // Granular Count Key
          const countKey = `${pid}|${vDate || 'null'}|${formaPag || 'null'}`
          const actionCount = granularActionCounts.get(countKey) || 0

          return {
            id: instId,
            vencimento: vDate || null,
            valorRegistrado: valReg,
            valorPago: totalPaid,
            formaPagamento: formaPag,
            status:
              totalPaid >= valReg - 0.05
                ? 'PAGO'
                : isOverdue
                  ? 'VENCIDO'
                  : 'A VENCER',
            formaCobranca: r.forma_cobranca || null,
            dataCombinada: r.data_combinada || null,
            motivo: r.motivo || null,
            source: 'RECEIPT',
            paymentHistory: history,
            collectionActionCount: actionCount,
          }
        })
      } else {
        const valReg = rawTotal
        const totalPaid = paymentInfo.totalPaid

        const history: PaymentHistoryDetail[] = allPayments.map((p) => ({
          date: p.data_pagamento || p.vencimento || p.created_at || '',
          value: Number(p.valor_pago),
          method: p.forma_pagamento || 'N/D',
          employee: p.FUNCIONARIOS?.nome_completo || 'Sistema',
        }))

        history.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )

        const parsedDate = parseISO(dateAcerto)
        const isOverdue =
          totalPaid < valReg - 0.05 && isBefore(parsedDate, today)

        // For "ORIGINAL" debt, we might not have a precise target, or maybe we do if actions targeted the order date?
        // Using "N/D" for formaPagamento as default
        const countKey = `${pid}|${dateAcerto}|N/D`
        // Also check if actions were logged with null target
        const countKeyNull = `${pid}|null|null`
        const actionCount =
          (granularActionCounts.get(countKey) || 0) +
          (granularActionCounts.get(countKeyNull) || 0)

        installments.push({
          id: -pid,
          vencimento: dateAcerto,
          valorRegistrado: valReg,
          valorPago: totalPaid,
          formaPagamento: 'N/D',
          status:
            totalPaid >= valReg - 0.05
              ? 'PAGO'
              : isOverdue
                ? 'VENCIDO'
                : 'A VENCER',
          formaCobranca: null,
          dataCombinada: null,
          motivo: null,
          source: 'ORIGINAL',
          paymentHistory: history,
          collectionActionCount: actionCount,
        })
      }

      // Logic to distribute unallocated payments across installments
      if (actionRows && actionRows.length > 0) {
        const unallocated = allPayments.filter(
          (p) =>
            !p.ID_da_fêmea ||
            p.ID_da_fêmea === pid ||
            !installments.some((i) => i.id === p.ID_da_fêmea),
        )

        if (unallocated.length > 0) {
          const sortedInstallments = [...installments].sort((a, b) => {
            const da = a.vencimento ? new Date(a.vencimento).getTime() : 0
            const db = b.vencimento ? new Date(b.vencimento).getTime() : 0
            return da - db
          })

          let pool = unallocated.reduce(
            (sum, p) => sum + (Number(p.valor_pago) || 0),
            0,
          )

          for (const inst of sortedInstallments) {
            if (pool <= 0.01) break
            const debt = inst.valorRegistrado - inst.valorPago
            if (debt > 0.01) {
              const take = Math.min(debt, pool)
              inst.valorPago += take
              pool -= take

              if (inst.valorPago >= inst.valorRegistrado - 0.01) {
                inst.status = 'PAGO'
              }

              inst.paymentHistory = inst.paymentHistory || []
              inst.paymentHistory.push({
                date: new Date().toISOString(),
                value: take,
                method: 'Diversos (Alocado)',
                employee: 'Sistema',
              })
            }
          }
        }
      } else if (paymentInfo.dbInstallments.length > 0) {
        const unallocated = allPayments.filter(
          (p) =>
            (!p.ID_da_fêmea ||
              p.ID_da_fêmea === pid ||
              !installments.some((i) => i.id === p.ID_da_fêmea)) &&
            !installments.some((i) => i.id === p.id),
        )

        if (unallocated.length > 0) {
          const sortedInstallments = [...installments].sort((a, b) => {
            const da = a.vencimento ? new Date(a.vencimento).getTime() : 0
            const db = b.vencimento ? new Date(b.vencimento).getTime() : 0
            return da - db
          })

          let pool = unallocated.reduce(
            (sum, p) => sum + (Number(p.valor_pago) || 0),
            0,
          )

          for (const inst of sortedInstallments) {
            if (pool <= 0.01) break
            const debt = inst.valorRegistrado - inst.valorPago
            if (debt > 0.01) {
              const take = Math.min(debt, pool)
              inst.valorPago += take
              pool -= take
              if (inst.valorPago >= inst.valorRegistrado - 0.01) {
                inst.status = 'PAGO'
              }
              inst.paymentHistory = inst.paymentHistory || []
              inst.paymentHistory.push({
                date: new Date().toISOString(),
                value: take,
                method: 'Diversos (Alocado)',
                employee: 'Sistema',
              })
            }
          }
        }
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
          latitude: cInfo?.latitude || null,
          longitude: cInfo?.longitude || null,
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

  async getCollectionActions(
    orderId: string,
    filters?: {
      targetVencimento?: string | null
      targetFormaPagamento?: string | null
    },
  ): Promise<CollectionAction[]> {
    if (!orderId) return []

    let query = supabase
      .from('acoes_cobranca')
      .select('*, acoes_cobranca_vencimentos(*)')
      .eq('pedido_id', Number(orderId) || 0)
      .order('data_acao', { ascending: false })

    if (filters) {
      if (filters.targetVencimento !== undefined) {
        if (filters.targetVencimento === null) {
          query = query.is('target_vencimento', null)
        } else {
          query = query.eq('target_vencimento', filters.targetVencimento)
        }
      }
      if (filters.targetFormaPagamento !== undefined) {
        if (filters.targetFormaPagamento === null) {
          query = query.is('target_forma_pagamento', null)
        } else {
          query = query.eq(
            'target_forma_pagamento',
            filters.targetFormaPagamento,
          )
        }
      }
    }

    const { data, error } = await query

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
      targetVencimento: row.target_vencimento,
      targetFormaPagamento: row.target_forma_pagamento,
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
      data_acao: action.dataAcao || getBrazilDateString(),
      nova_data_combinada: action.novaDataCombinada || null,
      funcionario_nome: action.funcionarioNome,
      funcionario_id: action.funcionarioId,
      pedido_id: action.pedidoId,
      cliente_id: action.clienteId,
      cliente_nome: action.clienteNome,
      motivo: action.motivo || null,
      target_vencimento: action.targetVencimento || null,
      target_forma_pagamento: action.targetFormaPagamento || null,
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
    receivableId?: number
  }): Promise<void> {
    const insertPayload = {
      venda_id: payload.orderId,
      cliente_id: payload.clientId,
      funcionario_id: payload.employeeId,
      forma_pagamento: payload.method,
      valor_registrado: 0,
      valor_pago: payload.value,
      vencimento: new Date(payload.date).toISOString(),
      data_pagamento: new Date().toISOString(),
      ID_da_fêmea: payload.receivableId || payload.orderId,
    }

    const { error } = await supabase.from('RECEBIMENTOS').insert(insertPayload)

    if (error) throw error

    try {
      await reportsService.updateDebtHistoryForOrder(payload.orderId)

      if (payload.receivableId && payload.receivableId > 0) {
        const { data: recData } = await supabase
          .from('RECEBIMENTOS')
          .select('valor_registrado, valor_pago')
          .eq('id', payload.receivableId)
          .single()

        const { data: linkedPayments } = await supabase
          .from('RECEBIMENTOS')
          .select('valor_pago')
          .eq('ID_da_fêmea', payload.receivableId)

        const totalPaid =
          linkedPayments?.reduce(
            (acc, curr) => acc + (curr.valor_pago || 0),
            0,
          ) || 0

        const registered = recData?.valor_registrado || 0
        if (totalPaid >= registered - 0.05) {
          await supabase
            .from('RECEBIMENTOS')
            .update({ forma_cobranca: null, rota_id: null } as any)
            .eq('id', payload.receivableId)
        }
      }
    } catch (syncError) {
      console.error(
        'Failed to sync debt history or cleanup for order:',
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

  async generateOrderReceipt(
    orderId: number,
    type: 'standard' | 'settlement' = 'standard',
  ): Promise<Blob> {
    const { data: orderData, error: orderError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*, codigo_interno, codigo_barras' as any)
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
      produtoCodigo: d['COD. PRODUTO'],
      codigoInterno: d.codigo_interno || '',
      codigoBarras: d.codigo_barras || '',
      tipo: d['TIPO'],
      precoUnitario: d['PREÇO VENDIDO'] ? parseCurrency(d['PREÇO VENDIDO']) : 0,
      saldoInicial: Number(d['SALDO INICIAL']) || 0,
      contagem: Number(d.CONTAGEM) || 0,
      quantVendida: Number(d['QUANTIDADE VENDIDA']) || 0,
      saldoFinal: Number(d['SALDO FINAL']) || 0,
      valorVendido: parseCurrency(d['VALOR VENDIDO']),
      novasConsignacoes: d['NOVAS CONSIGNAÇÕES']
        ? parseCurrency(d['NOVAS CONSIGNAÇÕES'])
        : 0,
      recolhido: d['RECOLHIDO'] ? parseCurrency(d['RECOLHIDO']) : 0,
    }))

    const totalVendido = items.reduce(
      (acc, item) => acc + (item.valorVendido || 0),
      0,
    )

    const valorAcerto = orderData.reduce(
      (acc, d) => acc + (Number(d['VALOR DEVIDO']) || 0),
      0,
    )

    const valorDesconto = Math.max(0, totalVendido - valorAcerto)

    const installments = (paymentsData || [])
      .filter((p) => (p.valor_registrado || 0) > 0)
      .map((p) => ({
        method: p.forma_pagamento,
        dueDate: p.vencimento,
        value: p.valor_registrado,
      }))

    let history: any[] = []
    let monthlyAverage = 0

    if (type === 'settlement' && clientId) {
      try {
        const { data: historyData } = await supabase
          .from('debitos_historico')
          .select('*')
          .eq('cliente_codigo', clientId)
          .neq('pedido_id', orderId)
          .order('data_acerto', { ascending: false })
          .limit(10)

        history = (historyData || []).map((h) => ({
          id: h.pedido_id,
          data: h.data_acerto,
          vendedor: h.vendedor_nome,
          valorVendaTotal: h.valor_venda,
          saldoAPagar: h.saldo_a_pagar,
          valorPago: h.valor_pago,
          debito: h.debito,
          mediaMensal: h.media_mensal,
        }))

        monthlyAverage = history.length > 0 ? history[0].mediaMensal || 0 : 0
      } catch (histError) {
        console.error('Failed to fetch history for PDF', histError)
      }
    }

    const payload = {
      reportType: type === 'standard' ? 'detailed-order' : 'thermal-history',
      format: type === 'standard' ? 'a4' : '80mm',
      client: clientData,
      employee: employeeData,
      items: items,
      date: firstItem['DATA DO ACERTO'] || new Date().toISOString(),
      orderNumber: orderId,
      totalVendido: totalVendido,
      valorDesconto: valorDesconto,
      valorAcerto: valorAcerto,
      installments: installments,
      history,
      monthlyAverage,
      payments: [],
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
