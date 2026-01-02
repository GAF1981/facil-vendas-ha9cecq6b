import { supabase } from '@/lib/supabase/client'
import { PixReceiptRow, PixConferenceFormData } from '@/types/pix'

export const pixService = {
  async getPixReceipts(): Promise<PixReceiptRow[]> {
    // Fetch data directly from PIX table as required
    // Join with RECEBIMENTOS for payment details
    // Join with CLIENTES (via RECEBIMENTOS) for client name
    const { data, error } = await supabase
      .from('PIX')
      .select(
        `
        *,
        RECEBIMENTOS (
          id,
          venda_id,
          cliente_id,
          forma_pagamento,
          valor_pago,
          valor_registrado,
          vencimento,
          created_at,
          ID_da_fêmea,
          CLIENTES (
            "NOME CLIENTE"
          )
        )
      `,
      )
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    return (data || []).map((row: any) => {
      const receipt = row.RECEBIMENTOS
      const clientName = receipt?.CLIENTES?.['NOME CLIENTE'] || 'N/D'

      return {
        id: receipt?.id || 0, // recebimento_id is the link, but for UI key we often use this
        venda_id: receipt?.venda_id || 0,
        // Map ID_da_fêmea to internal prop
        id_da_femea: receipt?.ID_da_fêmea || receipt?.venda_id, // Fallback to venda_id if null
        cliente_id: receipt?.cliente_id || 0,
        forma_pagamento: receipt?.forma_pagamento || 'N/D',
        valor_pago: receipt?.valor_pago || 0,
        valor_registrado: receipt?.valor_registrado,
        vencimento: receipt?.vencimento,
        created_at: receipt?.created_at,
        cliente_nome: clientName,
        // Pix specific data from PIX table
        pix_id: row.id,
        nome_no_pix: row.nome_no_pix,
        banco_pix: row.banco_pix,
        data_pix_realizado: row.data_pix_realizado,
        confirmado_por: row.confirmado_por,
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
        nome_no_pix: data.nome_no_pix,
        banco_pix: data.banco_pix,
        data_pix_realizado: new Date(data.data_pix_realizado).toISOString(),
        confirmado_por: employeeName,
        venda_id: vendaId,
      },
      { onConflict: 'recebimento_id' },
    )

    if (error) throw error
  },
}
