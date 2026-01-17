import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import { RecebimentoInsert } from '@/types/recebimento'
import { reportsService } from '@/services/reportsService'

export const recebimentoService = {
  async saveRecebimento(
    client: ClientRow,
    employee: Employee,
    payments: PaymentEntry[],
    linkedOrderId: number,
  ) {
    // 1. Validation
    if (!linkedOrderId) {
      throw new Error(
        'É necessário selecionar um pedido para vincular o pagamento.',
      )
    }

    // 2. Process payments one by one to ensure we capture IDs for Pix
    for (const payment of payments) {
      const inserts: RecebimentoInsert[] = []

      // Handle installments
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
            valor_pago: 0, // Installments initially 0 paid if future? Or depends on logic. Usually only first is paid if immediate.
            // But if specific paidValue is passed in detail, use it.
            // In RecebimentoPage context, we usually register immediate payments as paid.
            vencimento: new Date(`${detail.dueDate}T12:00:00`).toISOString(),
            ID_da_fêmea: linkedOrderId,
          })
        })
      } else {
        // Single payment
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
        })
      }

      if (inserts.length > 0) {
        const { data: insertedData, error: recError } = await supabase
          .from('RECEBIMENTOS')
          .insert(inserts)
          .select()

        if (recError) throw recError

        // 3. If Pix, insert into PIX table
        if (payment.method === 'Pix' && payment.pixDetails && insertedData) {
          // Pix is always single payment in this context
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

            if (pixError) {
              console.error('Error creating PIX record:', pixError)
            }
          }
        }
      }
    }

    // 4. Update Debt History
    try {
      await reportsService.updateDebtHistoryForOrder(linkedOrderId)
    } catch (error) {
      console.error('Failed to update debt history:', error)
      // We don't throw here to avoid rollback of payment if just the cache update failed
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
    // 1. Update RECEBIMENTOS to set valor_pago = 0
    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({ valor_pago: 0 })
      .eq('id', paymentId)

    if (updateError) throw updateError

    // 2. Log action to system_logs
    const { error: logError } = await supabase.from('system_logs').insert({
      type: 'PAYMENT_REVERSAL',
      description: `Estorno de pagamento (ID: ${paymentId}) do pedido #${orderId}`,
      user_id: userId,
      meta: { paymentId, orderId, reversedBy: userName },
      created_at: new Date().toISOString(),
    })

    if (logError) console.error('Error logging reversal:', logError)

    // 3. Update debt history to reflect the change
    await reportsService.updateDebtHistoryForOrder(orderId)
  },
}
