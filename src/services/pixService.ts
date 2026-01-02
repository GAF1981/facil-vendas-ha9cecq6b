import { supabase } from '@/lib/supabase/client'
import { PixRecebimentoRow } from '@/types/pix'

export const pixService = {
  async getPixRecebimentos(): Promise<PixRecebimentoRow[]> {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        venda_id,
        cliente_id,
        forma_pagamento,
        valor_pago,
        pix_recebimento_confirmado,
        pix_confirmado_por,
        created_at,
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .eq('forma_pagamento', 'Pix')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.venda_id,
      clientCode: row.cliente_id,
      clientName:
        (Array.isArray(row.CLIENTES) ? row.CLIENTES[0] : row.CLIENTES)?.[
          'NOME CLIENTE'
        ] || 'Cliente não encontrado',
      paymentMethod: row.forma_pagamento,
      value: row.valor_pago,
      isConfirmed: row.pix_recebimento_confirmado,
      confirmedBy: row.pix_confirmado_por,
      createdAt: row.created_at,
    }))
  },

  async confirmPixReceipt(id: number, employeeName: string) {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .update({
        pix_recebimento_confirmado: true,
        pix_confirmado_por: employeeName,
      })
      .eq('id', id)
      .select()

    if (error) throw error
    return data
  },
}
