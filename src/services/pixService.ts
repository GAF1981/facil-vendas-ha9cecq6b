import { supabase } from '@/lib/supabase/client'
import { PixRecebimentoRow, PixDetails } from '@/types/pix'

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
        PIX (
          id,
          recebimento_id,
          nome_no_pix,
          banco_pix,
          data_realizada,
          confirmado_por,
          created_at
        ),
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .eq('forma_pagamento', 'Pix')
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) throw error

    return (data || []).map((row: any) => ({
      id: row.id,
      orderId: row.venda_id,
      clientCode: row.cliente_id,
      // Handle relation to CLIENTES to get the name
      // Safely handle if it returns as array or object
      clientName:
        (Array.isArray(row.CLIENTES) ? row.CLIENTES[0] : row.CLIENTES)?.[
          'NOME CLIENTE'
        ] || 'Cliente não encontrado',
      paymentMethod: row.forma_pagamento,
      value: row.valor_pago,
      // Handle the relation which comes as an array from Supabase
      pixDetails:
        Array.isArray(row.PIX) && row.PIX.length > 0
          ? row.PIX[0]
          : row.PIX || null,
    }))
  },

  async registerPixConference(details: Omit<PixDetails, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('PIX')
      .upsert(
        {
          recebimento_id: details.recebimento_id,
          nome_no_pix: details.nome_no_pix,
          banco_pix: details.banco_pix,
          data_realizada: details.data_realizada,
          confirmado_por: details.confirmado_por,
        },
        { onConflict: 'recebimento_id' },
      )
      .select()
      .single()

    if (error) throw error
    return data
  },
}
