import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import {
  RecebimentoInsert,
  RecebimentoInstallment,
  ConsolidatedRecebimento,
  PaymentHistoryItem,
} from '@/types/recebimento'
import { reportsService } from '@/services/reportsService'
import { startOfDay, endOfDay, isBefore, isAfter, parseISO } from 'date-fns'
import { rotaService } from '@/services/rotaService'

export const recebimentoService = {
  async saveRecebimento(
    client: ClientRow,
    employee: Employee,
    payments: PaymentEntry[],
    linkedOrderId: number,
  ) {
    if (!linkedOrderId) {
      throw new Error(
        'É necessário selecionar um pedido para vincular o pagamento.',
      )
    }

    const activeRoute = await rotaService.getActiveRota()
    const activeRouteId = activeRoute?.id || null

    for (const payment of payments) {
      const inserts: RecebimentoInsert[] = []
      if (
        payment.installments > 1 &&
        payment.details &&
        payment.details.length > 0
      ) {
        payment.details.forEach((detail) => {
          inserts.push({
            venda_id: linkedOrderId,
            cliente_id: client.CODIGO,
            funcionario_id: employee.id,
            forma_pagamento: payment.method,
            valor_registrado: detail.value,
            valor_pago: 0,
            vencimento: new Date(`${detail.dueDate}T12:00:00`).toISOString(),
            ID_da_fêmea: linkedOrderId, // Initial link to order
            rota_id: activeRouteId,
          })
        })
      } else {
        inserts.push({
          venda_id: linkedOrderId,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_registrado: payment.value,
          valor_pago: payment.paidValue,
          vencimento: payment.dueDate
            ? new Date(`${payment.dueDate}T12:00:00`).toISOString()
            : new Date().toISOString(),
          ID_da_fêmea: linkedOrderId,
          data_pagamento: new Date().toISOString(),
          rota_id: activeRouteId,
        })
      }

      if (inserts.length > 0) {
        const { data: insertedData, error: recError } = await supabase
          .from('RECEBIMENTOS')
          .insert(inserts)
          .select()
        if (recError) throw recError

        if (payment.method === 'Pix' && payment.pixDetails && insertedData) {
          const insertedRecord = insertedData[0]
          if (insertedRecord) {
            const { error: pixError } = await supabase.from('PIX').upsert(
              {
                recebimento_id: insertedRecord.id,
                nome_no_pix: payment.pixDetails.nome,
                banco_pix: payment.pixDetails.banco,
                data_pix_realizado: new Date().toISOString(),
                confirmado_por: employee.nome_completo,
                venda_id: linkedOrderId,
              },
              { onConflict: 'recebimento_id' },
            )
            if (pixError) console.error('Error creating PIX record:', pixError)
          }
        }
      }
    }

    try {
      await reportsService.updateDebtHistoryForOrder(linkedOrderId)
    } catch (error) {
      console.error('Failed to update debt history:', error)
    }

    return linkedOrderId
  },

  async getPaymentsForOrder(orderId: number) {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select('*, FUNCIONARIOS(nome_completo)')
      .eq('venda_id', orderId)
      .gt('valor_pago', 0)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map((row: any) => ({
      id: row.id,
      method: row.forma_pagamento,
      value: row.valor_pago,
      registeredValue: row.valor_registrado,
      date: row.vencimento,
      employeeName: row.FUNCIONARIOS?.nome_completo || 'N/D',
      createdAt: row.created_at,
    }))
  },

  async reversePayment(
    paymentId: number,
    orderId: number,
    userId: number,
    userName: string,
  ) {
    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({ valor_pago: 0, data_pagamento: null } as any)
      .eq('id', paymentId)

    if (updateError) throw updateError

    const { error: logError } = await supabase.from('system_logs').insert({
      type: 'PAYMENT_REVERSAL',
      description: `Estorno de pagamento (ID: ${paymentId}) do pedido #${orderId}`,
      user_id: userId,
      meta: { paymentId, orderId, reversedBy: userName },
      created_at: new Date().toISOString(),
    })
    if (logError) console.error('Error logging reversal:', logError)

    await reportsService.updateDebtHistoryForOrder(orderId)
  },

  async getConsolidatedRecebimentos(
    filters: {
      search?: string
      status?: 'PENDENTE' | 'PAGO' | 'TODOS'
      orderId?: string
      startDate?: Date
      endDate?: Date
    } = {},
  ): Promise<ConsolidatedRecebimento[]> {
    // 1. Initial Query to find relevant rows (Installments)
    let query = supabase
      .from('RECEBIMENTOS')
      .select(
        '*, CLIENTES!inner(CODIGO, "NOME CLIENTE"), FUNCIONARIOS(nome_completo)',
      )
      .gt('valor_registrado', 0)

    if (filters.orderId) {
      query = query.eq('venda_id', filters.orderId)
    }

    if (filters.search) {
      const term = filters.search
      const isNumber = !isNaN(Number(term))
      if (isNumber) {
        if (!filters.orderId) {
          query = query.or(`cliente_id.eq.${term},venda_id.eq.${term}`)
        }
      } else {
        query = query.ilike('CLIENTES.NOME CLIENTE', `%${term}%`)
      }
    }

    if (filters.startDate) {
      query = query.gte(
        'vencimento',
        startOfDay(filters.startDate).toISOString(),
      )
    }

    if (filters.endDate) {
      query = query.lte('vencimento', endOfDay(filters.endDate).toISOString())
    }

    const { data: installmentsData, error: instError } = await query
    if (instError) throw instError

    if (!installmentsData || installmentsData.length === 0) return []

    // 2. Extract Order IDs to fetch all related payments
    const orderIds = Array.from(
      new Set(installmentsData.map((r) => r.venda_id)),
    )

    // 3. Fetch Payments (records with valor_pago > 0 AND valor_registrado = 0)
    // We also fetch records with valor_registrado > 0 if they have payments, but those are already in installmentsData.
    // However, to be thorough and simple, let's just fetch ALL payments for these orders.
    const { data: paymentsData, error: payError } = await supabase
      .from('RECEBIMENTOS')
      .select('*, FUNCIONARIOS(nome_completo)')
      .in('venda_id', orderIds)
      .gt('valor_pago', 0)

    if (payError) throw payError

    // 4. Organize Installments
    const installmentMap = new Map<number, ConsolidatedRecebimento>()
    const installmentsByOrder = new Map<number, ConsolidatedRecebimento[]>()

    installmentsData.forEach((row: any) => {
      const inst: ConsolidatedRecebimento = {
        ...row,
        cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'Desconhecido',
        cliente_codigo: row.CLIENTES?.CODIGO || 0,
        funcionario_nome: row.FUNCIONARIOS?.nome_completo || 'N/D',
        history: [],
        saldo: row.valor_registrado || 0,
        // Reset valor_pago to 0 initially, we will recalculate from history/allocation
        // EXCEPT if the row itself has immediate payment
        valor_pago: 0,
      }

      // If the installment row itself has payment (paid on creation), add it
      if ((row.valor_pago || 0) > 0) {
        const paid = row.valor_pago
        inst.valor_pago += paid
        inst.saldo -= paid
        inst.history.push({
          id: row.id,
          data:
            row.data_pagamento || row.created_at || new Date().toISOString(),
          funcionario: row.FUNCIONARIOS?.nome_completo || 'Sistema',
          forma_pagamento: row.forma_pagamento,
          valor: paid,
          original_payment_id: row.id,
        })
      }

      installmentMap.set(row.id, inst)

      if (!installmentsByOrder.has(row.venda_id)) {
        installmentsByOrder.set(row.venda_id, [])
      }
      installmentsByOrder.get(row.venda_id)!.push(inst)
    })

    // Sort installments by due date for FIFO logic
    installmentsByOrder.forEach((list) => {
      list.sort((a, b) => {
        const dateA = a.vencimento ? new Date(a.vencimento).getTime() : 0
        const dateB = b.vencimento ? new Date(b.vencimento).getTime() : 0
        return dateA - dateB
      })
    })

    // 5. Distribute Payments
    // We filter paymentsData to only those that are NOT already processed as installments
    // (i.e. valor_registrado == 0).
    // If a row has both (processed above), we skip it here.
    const purePayments =
      paymentsData?.filter((p) => (p.valor_registrado || 0) === 0) || []

    purePayments.forEach((pay: any) => {
      const payId = pay.id
      const amount = pay.valor_pago
      const linkId = pay.ID_da_fêmea
      const orderId = pay.venda_id

      let allocated = false

      // Strategy 1: Direct Link (ID_da_fêmea points to Installment ID)
      if (linkId && installmentMap.has(linkId)) {
        const target = installmentMap.get(linkId)!
        target.valor_pago += amount
        target.saldo = Math.max(0, target.valor_registrado! - target.valor_pago)
        target.history.push({
          id: payId,
          data:
            pay.data_pagamento || pay.created_at || new Date().toISOString(),
          funcionario: pay.FUNCIONARIOS?.nome_completo || 'Sistema',
          forma_pagamento: pay.forma_pagamento,
          valor: amount,
          original_payment_id: payId,
        })
        allocated = true
      }

      // Strategy 2: General Order Payment (ID_da_fêmea points to Order ID or Legacy)
      if (!allocated && installmentsByOrder.has(orderId)) {
        const candidates = installmentsByOrder.get(orderId)!
        let remainingAmount = amount

        for (const inst of candidates) {
          if (remainingAmount <= 0) break
          const remainingDebt =
            (inst.valor_registrado || 0) - (inst.valor_pago || 0)

          if (remainingDebt > 0.01) {
            // Tolerance for float
            const take = Math.min(remainingDebt, remainingAmount)
            inst.valor_pago += take
            inst.saldo = Math.max(
              0,
              (inst.valor_registrado || 0) - inst.valor_pago,
            )
            inst.history.push({
              id: payId,
              data:
                pay.data_pagamento ||
                pay.created_at ||
                new Date().toISOString(),
              funcionario: pay.FUNCIONARIOS?.nome_completo || 'Sistema',
              forma_pagamento: pay.forma_pagamento,
              valor: take,
              original_payment_id: payId,
            })
            remainingAmount -= take
          }
        }
        // If there's still remaining amount (Overpayment), we could attach it to the last installment
        // or ignore/log. For now, we attach to the last one to show totals correctly even if negative debt.
        if (remainingAmount > 0.01 && candidates.length > 0) {
          const last = candidates[candidates.length - 1]
          last.valor_pago += remainingAmount
          last.saldo = (last.valor_registrado || 0) - last.valor_pago // Can be negative
          last.history.push({
            id: payId,
            data:
              pay.data_pagamento || pay.created_at || new Date().toISOString(),
            funcionario: pay.FUNCIONARIOS?.nome_completo || 'Sistema',
            forma_pagamento: pay.forma_pagamento,
            valor: remainingAmount,
            original_payment_id: payId,
          })
        }
      }
    })

    // 6. Calculate Status and Flatten
    let results = Array.from(installmentMap.values())

    results.forEach((item) => {
      const debt = item.valor_registrado || 0
      const paid = item.valor_pago || 0
      const now = new Date()
      const dueDate = item.vencimento ? new Date(item.vencimento) : now

      if (paid >= debt - 0.01) {
        item.status_calculado = 'PAGO'
      } else {
        if (isBefore(endOfDay(dueDate), now)) {
          item.status_calculado = 'VENCIDA'
        } else {
          item.status_calculado = 'A VENCER'
        }
      }
    })

    // 7. Filter by Status (in memory)
    if (filters.status && filters.status !== 'TODOS') {
      results = results.filter((item) => {
        if (filters.status === 'PAGO') return item.status_calculado === 'PAGO'
        if (filters.status === 'PENDENTE')
          return item.status_calculado !== 'PAGO'
        return true
      })
    }

    // Sort by Due Date
    results.sort((a, b) => {
      const dateA = a.vencimento ? new Date(a.vencimento).getTime() : 0
      const dateB = b.vencimento ? new Date(b.vencimento).getTime() : 0
      return dateA - dateB
    })

    return results
  },

  async processOrderPayment(
    orderId: number,
    clientId: number,
    amountPaid: number,
    paymentDate: string,
    method: string,
    pixDetails?: { nome: string; banco: string },
    userName?: string,
    employeeId?: number,
    installmentId?: number, // New parameter for direct linking
  ): Promise<{ success: boolean; syncWarning?: boolean }> {
    const activeRoute = await rotaService.getActiveRota()
    const activeRouteId = activeRoute?.id || null

    // 1. Insert New Payment Record
    const insertPayload: any = {
      venda_id: orderId,
      cliente_id: clientId,
      funcionario_id: employeeId || null,
      forma_pagamento: method,
      valor_registrado: 0, // 0 because this is strictly a payment
      valor_pago: amountPaid,
      vencimento: new Date().toISOString(), // Use current timestamp
      data_pagamento: new Date(`${paymentDate}T12:00:00`).toISOString(),
      // Link to installment if provided, otherwise link to order (Legacy behavior)
      ID_da_fêmea: installmentId || orderId,
      motivo: 'Pagamento de Pedido',
      rota_id: activeRouteId,
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('RECEBIMENTOS')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Handle Pix
    if (method === 'Pix' && pixDetails && insertedData) {
      const { error: pixError } = await supabase.from('PIX').upsert(
        {
          recebimento_id: insertedData.id,
          nome_no_pix: pixDetails.nome,
          banco_pix: pixDetails.banco,
          data_pix_realizado: new Date().toISOString(),
          confirmado_por: userName || 'Sistema',
          venda_id: orderId,
        },
        { onConflict: 'recebimento_id' },
      )
      if (pixError)
        console.error('Error creating/updating PIX record:', pixError)
    }

    // 3. Log
    await supabase.from('system_logs').insert({
      type: 'PAYMENT_RECEIVED',
      description: `Pagamento recebido de R$ ${amountPaid} no pedido #${orderId} ${installmentId ? `(Parcela #${installmentId})` : ''}`,
      user_id: employeeId || null,
      meta: {
        newReceiptId: insertedData.id,
        amountPaid,
        method,
        orderId,
        installmentId,
        processedBy: userName,
      },
      created_at: new Date().toISOString(),
    })

    // 4. Update Debt History
    try {
      await reportsService.updateDebtHistoryForOrder(orderId)

      // 5. Automatic Clearing Logic for fully paid installments
      if (installmentId && installmentId > 0) {
        // Fetch current status of this installment
        const { data: recData } = await supabase
          .from('RECEBIMENTOS')
          .select('valor_registrado')
          .eq('id', installmentId)
          .single()

        // Sum all payments linked to this receivable (ID_da_fêmea)
        const { data: linkedPayments } = await supabase
          .from('RECEBIMENTOS')
          .select('valor_pago')
          .eq('ID_da_fêmea', installmentId)

        const totalPaid =
          linkedPayments?.reduce(
            (acc, curr) => acc + (curr.valor_pago || 0),
            0,
          ) || 0

        const registered = recData?.valor_registrado || 0

        // If fully paid (allowing small float tolerance)
        if (totalPaid >= registered - 0.05) {
          await supabase
            .from('RECEBIMENTOS')
            .update({ forma_cobranca: null, rota_id: null } as any)
            .eq('id', installmentId)
        }
      }

      return { success: true }
    } catch (syncError) {
      console.error('Sync failed for order:', orderId, syncError)
      return { success: true, syncWarning: true }
    }
  },

  async generateReceiptPdf(installment: ConsolidatedRecebimento) {
    const payload = {
      reportType: 'receipt',
      format: '80mm',
      client: {
        CODIGO: installment.cliente_codigo,
        'NOME CLIENTE': installment.cliente_nome,
      },
      employee: {
        nome_completo: installment.funcionario_nome || 'N/D',
      },
      date: installment.data_pagamento || installment.created_at,
      orderNumber: installment.venda_id,
      payments: [
        {
          method: installment.forma_pagamento,
          paidValue: installment.valor_pago,
        },
      ],
      valorPago: installment.valor_pago,
      items: [],
      history: [],
      debito: Math.max(0, installment.saldo),
    }

    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: payload,
    })

    if (error) throw error
    return data
  },
}
