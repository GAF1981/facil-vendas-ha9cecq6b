import { supabase } from '@/lib/supabase/client'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { PaymentEntry } from '@/types/payment'
import { bancoDeDadosService } from './bancoDeDadosService'
import { formatCurrency } from '@/lib/formatters'
import { format } from 'date-fns'

export const recebimentoService = {
  async saveRecebimento(
    client: ClientRow,
    employee: Employee,
    payments: PaymentEntry[],
    date: Date = new Date(),
  ) {
    // 1. Get Next Order ID
    const nextPedido = await bancoDeDadosService.getNextNumeroPedido()
    const nextItemId = (await bancoDeDadosService.getMaxIdVendaItens()) + 1
    const dataAcertoStr = format(date, 'yyyy-MM-dd')
    const horaAcerto = format(date, 'HH:mm:ss')

    // 2. Prepare Payment String for display in legacy systems/columns
    const paymentString = payments
      .map(
        (p) =>
          `${p.method} Reg: R$ ${formatCurrency(p.value)} Pago: R$ ${formatCurrency(p.paidValue)} (${p.installments}x)`,
      )
      .join(' | ')

    // 3. Insert into BANCO_DE_DADOS
    // We insert a row to represent the receipt event in the main timeline.
    // We use MERCADORIA='RECEBIMENTO' to distinguish it from product sales.
    // Value sold is 0 because it's just a payment event.
    const rowToInsert = {
      'ID VENDA ITENS': nextItemId,
      'NÚMERO DO PEDIDO': nextPedido,
      'DATA DO ACERTO': dataAcertoStr,
      'HORA DO ACERTO': horaAcerto,
      'CÓDIGO DO CLIENTE': client.CODIGO,
      CLIENTE: client['NOME CLIENTE'],
      'CODIGO FUNCIONARIO': employee.id,
      FUNCIONÁRIO: employee.nome_completo,
      'DESCONTO POR GRUPO': '0',
      'COD. PRODUTO': null,
      MERCADORIA: 'RECEBIMENTO',
      TIPO: 'PAGAMENTO',
      FORMA: paymentString,
      'SALDO INICIAL': 0,
      CONTAGEM: 0,
      'QUANTIDADE VENDIDA': '0',
      'VALOR VENDIDO': '0,00',
      'VALOR VENDA PRODUTO': '0,00',
      'PREÇO VENDIDO': '0,00',
      'SALDO FINAL': 0,
      'NOVAS CONSIGNAÇÕES': '0,00',
      RECOLHIDO: '0,00',
      'VALOR CONSIGNADO TOTAL (Preço Venda)': '0,00',
      'VALOR CONSIGNADO TOTAL (Custo)': '0,00',
      DETALHES_PAGAMENTO: payments, // JSON storage for history reconstruction
    }

    const { error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowToInsert as any)

    if (dbError) throw dbError

    // 4. Insert into RECEBIMENTOS
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
            venda_id: nextPedido,
            cliente_id: client.CODIGO,
            funcionario_id: employee.id,
            forma_pagamento: payment.method,
            valor_pago: detail.value,
            // Ensure 12:00 to avoid timezone shifts
            data_pagamento: new Date(
              `${detail.dueDate}T12:00:00`,
            ).toISOString(),
          })
        })
      } else {
        // Single payment
        recebimentosToInsert.push({
          venda_id: nextPedido,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_pago: payment.paidValue, // For receipt, we track what was actually paid
          data_pagamento: payment.dueDate
            ? new Date(`${payment.dueDate}T12:00:00`).toISOString()
            : new Date().toISOString(),
        })
      }
    })

    if (recebimentosToInsert.length > 0) {
      const { error: recError } = await supabase
        .from('RECEBIMENTOS')
        .insert(recebimentosToInsert)

      if (recError) throw recError
    }

    return nextPedido
  },
}
