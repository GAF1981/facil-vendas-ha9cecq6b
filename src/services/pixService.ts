import { supabase } from '@/lib/supabase/client'
import { PixReceiptRow, PixConferenceFormData } from '@/types/pix'

export const pixService = {
  async getPixReceipts(): Promise<PixReceiptRow[]> {
    // Fetch receipts where forma_pagamento includes 'Pix'
    // Joining with CLIENTES for name
    // Joining with PIX table to get conference details
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        *,
        CLIENTES (
          "NOME CLIENTE"
        ),
        PIX (
          id,
          nome_no_pix,
          banco_pix,
          data_pix_realizado,
          confirmado_por
        )
      `,
      )
      .ilike('forma_pagamento', '%Pix%')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return (data || []).map((row: any) => {
      const pixData = row.PIX && row.PIX.length > 0 ? row.PIX[0] : null
      return {
        id: row.id,
        venda_id: row.venda_id,
        cliente_id: row.cliente_id,
        forma_pagamento: row.forma_pagamento,
        valor_pago: row.valor_pago,
        valor_registrado: row.valor_registrado,
        vencimento: row.vencimento,
        created_at: row.created_at,
        cliente_nome: row.CLIENTES?.['NOME CLIENTE'] || 'N/D',
        pix_id: pixData?.id,
        nome_no_pix: pixData?.nome_no_pix,
        banco_pix: pixData?.banco_pix,
        data_pix_realizado: pixData?.data_pix_realizado,
        confirmado_por: pixData?.confirmado_por,
      }
    })
  },

  async saveConference(
    recebimentoId: number,
    vendaId: number,
    data: PixConferenceFormData,
    employeeName: string,
  ) {
    // Upsert logic based on recebimento_id (unique constraint)
    const { error } = await supabase.from('PIX').upsert(
      {
        recebimento_id: recebimentoId,
        venda_id: vendaId,
        nome_no_pix: data.nome_no_pix,
        banco_pix: data.banco_pix,
        data_pix_realizado: new Date(data.data_pix_realizado).toISOString(),
        confirmado_por: employeeName,
      },
      { onConflict: 'recebimento_id' },
    )

    if (error) throw error
  },
}
