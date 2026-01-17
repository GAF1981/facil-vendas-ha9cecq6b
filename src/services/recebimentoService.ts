import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import { RecebimentoInsert, RecebimentoInstallment } from '@/types/recebimento'
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

  async getInstallments(
    filters: {
      search?: string
      status?: 'PENDENTE' | 'PAGO' | 'TODOS'
      orderId?: string
      startDate?: Date
      endDate?: Date
    } = {},
  ): Promise<RecebimentoInstallment[]> {
    let query = supabase
      .from('RECEBIMENTOS')
      .select('*, CLIENTES(CODIGO, "NOME CLIENTE")')
      .order('vencimento', { ascending: true })
      .limit(1000)

    if (filters.orderId) {
      query = query.eq('venda_id', filters.orderId)
    }

    if (filters.search) {
      const term = filters.search
      const isNumber = !isNaN(Number(term))
      if (isNumber) {
        if (!filters.orderId) {
          query = query.or(`cliente_id.eq.${term},venda_id.eq.${term}`)
        } else {
          query = query.eq('cliente_id', term)
        }
      } else {
        query = query
          .not('CLIENTES', 'is', null)
          .filter('CLIENTES.NOME CLIENTE', 'ilike', `%${term}%`)
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

    const { data, error } = await query
    if (error) throw error

    let installments = (data || []).map((row: any) => ({
      ...row,
      cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'Desconhecido',
      cliente_codigo: row.CLIENTES?.CODIGO || 0,
    })) as RecebimentoInstallment[]

    if (filters.status && filters.status !== 'TODOS') {
      installments = installments.filter((inst) => {
        const valReg = inst.valor_registrado || 0
        const valPago = inst.valor_pago || 0
        const isPaid = valPago >= valReg && valReg > 0
        return filters.status === 'PAGO' ? isPaid : !isPaid
      })
    }
    return installments
  },

  async processInstallmentPayment(
    installmentId: number,
    amountPaid: number,
    paymentDate: string,
    method: string,
    orderId: number,
    pixDetails?: { nome: string; banco: string },
    userName?: string,
  ): Promise<{ success: boolean; syncWarning?: boolean }> {
    const { data: current, error: fetchError } = await supabase
      .from('RECEBIMENTOS')
      .select('valor_pago')
      .eq('id', installmentId)
      .single()

    if (fetchError) throw fetchError

    const newTotalPaid = (current.valor_pago || 0) + amountPaid

    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({
        valor_pago: newTotalPaid,
        data_pagamento: new Date(`${paymentDate}T12:00:00`).toISOString(),
        forma_pagamento: method,
      } as any)
      .eq('id', installmentId)

    if (updateError) throw updateError

    if (method === 'Pix' && pixDetails) {
      await supabase.from('PIX').insert({
        recebimento_id: installmentId,
        nome_no_pix: pixDetails.nome,
        banco_pix: pixDetails.banco,
        data_pix_realizado: new Date().toISOString(),
        confirmado_por: userName || 'Sistema',
        venda_id: orderId,
      })
    }

    await supabase.from('system_logs').insert({
      type: 'PAYMENT_RECEIVED',
      description: `Pagamento recebido de R$ ${amountPaid} no pedido #${orderId}`,
      user_id: null,
      meta: {
        installmentId,
        amountPaid,
        method,
        orderId,
      },
    })

    try {
      await reportsService.updateDebtHistoryForOrder(orderId)
      return { success: true }
    } catch (syncError) {
      console.error('Sync failed for order:', orderId, syncError)
      return { success: true, syncWarning: true }
    }
  },

  async generateReceiptPdf(installment: RecebimentoInstallment) {
    const balance = Math.max(
      0,
      (installment.valor_registrado || 0) - installment.valor_pago,
    )

    const receiptData = {
      cliente_nome: installment.cliente_nome,
      cliente_codigo: installment.cliente_codigo,
      venda_id: installment.venda_id,
      vencimento: installment.vencimento,
      valor_registrado: installment.valor_registrado,
      valor_pago: installment.valor_pago,
      saldo: balance,
      forma_pagamento: installment.forma_pagamento,
      data_pagamento: installment.data_pagamento,
    }

    const { data, error } = await supabase.functions.invoke('generate-pdf', {
      body: {
        reportType: 'receipt',
        format: '80mm',
        data: receiptData,
      },
    })

    if (error) throw error
    return data
  },
}
