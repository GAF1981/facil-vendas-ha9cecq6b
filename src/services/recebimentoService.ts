import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'

export const recebimentoService = {
  async saveRecebimento(
    client: ClientRow,
    employee: Employee,
    payments: PaymentEntry[],
    linkedOrderId: number,
  ) {
    // 1. Validation: We now require a linked order ID because we are only inserting into RECEBIMENTOS
    // and must link the payment to an existing sale (venda_id).
    if (!linkedOrderId) {
      throw new Error(
        'É necessário selecionar um pedido para vincular o pagamento.',
      )
    }

    // 2. Prepare inserts for RECEBIMENTOS table
    // These records are the SOURCE OF TRUTH for calculations.
    const recebimentosToInsert: any[] = []

    payments.forEach((payment) => {
      // Handle installments
      if (
        payment.installments > 1 &&
        payment.details &&
        payment.details.length > 0
      ) {
        payment.details.forEach((detail) => {
          recebimentosToInsert.push({
            venda_id: linkedOrderId,
            cliente_id: client.CODIGO,
            funcionario_id: employee.id,
            forma_pagamento: payment.method,
            valor_registrado: detail.value, // Captured Separately
            valor_pago: 0, // Installments assumed as debts unless specified otherwise logic needed
            // Ensure 12:00 to avoid timezone shifts
            data_pagamento: new Date(
              `${detail.dueDate}T12:00:00`,
            ).toISOString(),
          })
        })
      } else {
        // Single payment
        recebimentosToInsert.push({
          venda_id: linkedOrderId,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_registrado: payment.value, // Captured Separately
          valor_pago: payment.paidValue,
          data_pagamento: payment.dueDate
            ? new Date(`${payment.dueDate}T12:00:00`).toISOString()
            : new Date().toISOString(),
        })
      }
    })

    // 3. Insert into RECEBIMENTOS
    // We do NOT insert into BANCO_DE_DADOS anymore.
    if (recebimentosToInsert.length > 0) {
      const { error: recError } = await supabase
        .from('RECEBIMENTOS')
        .insert(recebimentosToInsert)

      if (recError) throw recError
    }

    return linkedOrderId
  },
}
