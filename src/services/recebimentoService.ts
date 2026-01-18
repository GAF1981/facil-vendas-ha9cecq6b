import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import {
  RecebimentoInsert,
  RecebimentoInstallment,
  ConsolidatedRecebimento,
} from '@/types/recebimento'
import { reportsService } from '@/services/reportsService'
import { startOfDay, endOfDay } from 'date-fns'

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
            ID_da_fêmea: linkedOrderId,
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
            const { error: pixError } = await supabase.from('PIX').insert({
              recebimento_id: insertedRecord.id,
              nome_no_pix: payment.pixDetails.nome,
              banco_pix: payment.pixDetails.banco,
              data_pix_realizado: new Date().toISOString(),
              confirmado_por: employee.nome_completo,
              venda_id: linkedOrderId,
            })
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
    // 1. Find Orders with DEBT Records matching the filters
    // We filter "RECEBIMENTOS" where valor_registrado > 0 to identify the debts of interest
    let query = supabase
      .from('RECEBIMENTOS')
      .select(
        'venda_id, cliente_id, vencimento, CLIENTES!inner(CODIGO, "NOME CLIENTE")',
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

    const { data: ordersData, error: ordersError } = await query
    if (ordersError) throw ordersError

    if (!ordersData || ordersData.length === 0) return []

    // Extract unique Order IDs
    const vendaIds = Array.from(new Set(ordersData.map((r) => r.venda_id)))

    // 2. Fetch ALL records for these orders (Debts AND Payments)
    // We need everything to calculate the balance correctly
    const { data: allData, error: allError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        '*, CLIENTES(CODIGO, "NOME CLIENTE"), FUNCIONARIOS(nome_completo)',
      )
      .in('venda_id', vendaIds)
      .order('vencimento', { ascending: true })

    if (allError) throw allError

    // 3. Group by Order ID and Aggregate
    const groups = new Map<number, ConsolidatedRecebimento>()

    allData?.forEach((row: any) => {
      const vid = row.venda_id
      if (!groups.has(vid)) {
        groups.set(vid, {
          ...row,
          // Initialize consolidated fields
          cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'Desconhecido',
          cliente_codigo: row.CLIENTES?.CODIGO || 0,
          funcionario_nome: row.FUNCIONARIOS?.nome_completo || 'N/D',
          valor_registrado: 0,
          valor_pago: 0,
          history: [],
        })
      }
      const group = groups.get(vid)!

      // Aggregate Debt (Registered Value)
      if ((row.valor_registrado || 0) > 0) {
        group.valor_registrado =
          (group.valor_registrado || 0) + row.valor_registrado

        // Preserve original method from the debt record(s)
        if (!group.forma_pagamento || group.forma_pagamento === 'Pix') {
          group.forma_pagamento = row.forma_pagamento
        }
      }

      // Aggregate Payments
      if ((row.valor_pago || 0) > 0) {
        group.valor_pago += row.valor_pago

        // Add to history
        group.history.push({
          id: row.id,
          data:
            row.data_pagamento || row.created_at || new Date().toISOString(),
          funcionario: row.FUNCIONARIOS?.nome_completo || 'Sistema',
          forma_pagamento: row.forma_pagamento,
          valor: row.valor_pago,
        })
      }
    })

    let results = Array.from(groups.values())

    // 4. Filter by Status (in memory, after aggregation)
    if (filters.status && filters.status !== 'TODOS') {
      results = results.filter((item) => {
        const debt = item.valor_registrado || 0
        const paid = item.valor_pago || 0
        const isPaid = paid >= debt && debt > 0
        return filters.status === 'PAGO' ? isPaid : !isPaid
      })
    }

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
  ): Promise<{ success: boolean; syncWarning?: boolean }> {
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
      ID_da_fêmea: orderId, // Link to order for grouping
      motivo: 'Pagamento de Pedido',
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('RECEBIMENTOS')
      .insert(insertPayload)
      .select()
      .single()

    if (insertError) throw insertError

    // 2. Handle Pix
    if (method === 'Pix' && pixDetails && insertedData) {
      await supabase.from('PIX').insert({
        recebimento_id: insertedData.id,
        nome_no_pix: pixDetails.nome,
        banco_pix: pixDetails.banco,
        data_pix_realizado: new Date().toISOString(),
        confirmado_por: userName || 'Sistema',
        venda_id: orderId,
      })
    }

    // 3. Log
    await supabase.from('system_logs').insert({
      type: 'PAYMENT_RECEIVED',
      description: `Pagamento recebido de R$ ${amountPaid} no pedido #${orderId}`,
      user_id: employeeId || null,
      meta: {
        newReceiptId: insertedData.id,
        amountPaid,
        method,
        orderId,
        processedBy: userName,
      },
      created_at: new Date().toISOString(),
    })

    // 4. Update Debt History
    try {
      await reportsService.updateDebtHistoryForOrder(orderId)
      return { success: true }
    } catch (syncError) {
      console.error('Sync failed for order:', orderId, syncError)
      return { success: true, syncWarning: true }
    }
  },

  async generateReceiptPdf(installment: RecebimentoInstallment) {
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
      debito: Math.max(
        0,
        (installment.valor_registrado || 0) - installment.valor_pago,
      ),
    }

    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: payload,
    })

    if (error) throw error
    return data
  },
}
