import { supabase } from '@/lib/supabase/client'
import { PixReceiptRow, PixConferenceFormData } from '@/types/pix'

export const pixService = {
  async getPixReceipts(): Promise<PixReceiptRow[]> {
    // 1. Fetch from RECEBIMENTOS where forma_pagamento contains 'Pix'
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        *,
        CLIENTES ( "NOME CLIENTE" ),
        PIX (*)
      `,
      )
      .ilike('forma_pagamento', '%Pix%')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    const receipts = (data || []).map((row: any) => {
      const pix = Array.isArray(row.PIX) ? row.PIX[0] : row.PIX
      const clientName = row.CLIENTES?.['NOME CLIENTE'] || 'N/D'

      return {
        id: row.id,
        venda_id: row.venda_id,
        id_da_femea: row.ID_da_fêmea || row.venda_id,
        cliente_id: row.cliente_id,
        forma_pagamento: row.forma_pagamento,
        valor_pago: row.valor_pago,
        valor_registrado: row.valor_registrado,
        vencimento: row.vencimento,
        created_at: row.created_at,
        cliente_nome: clientName,
        pix_id: pix?.id,
        nome_no_pix: pix?.nome_no_pix,
        banco_pix: pix?.banco_pix,
        data_pix_realizado: pix?.data_pix_realizado,
        confirmado_por: pix?.confirmado_por,
      }
    })

    // 2. Enhance with "Data do Acerto" and "Vendedor do Pedido" from BANCO_DE_DADOS
    // Extract unique venda_ids to query BANCO_DE_DADOS
    const orderIds = [...new Set(receipts.map((r) => r.venda_id))]

    if (orderIds.length > 0) {
      // Chunking for large arrays if needed, but 2000 limit is fine for now
      const { data: orderData, error: orderError } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"NÚMERO DO PEDIDO", "DATA DO ACERTO", "FUNCIONÁRIO"')
        .in('NÚMERO DO PEDIDO', orderIds)

      if (!orderError && orderData) {
        const orderMap = new Map<number, { date: string; seller: string }>()
        orderData.forEach((od: any) => {
          orderMap.set(od['NÚMERO DO PEDIDO'], {
            date: od['DATA DO ACERTO'],
            seller: od['FUNCIONÁRIO'],
          })
        })

        // Merge into receipts
        receipts.forEach((r) => {
          const info = orderMap.get(r.venda_id)
          if (info) {
            r.data_acerto = info.date
            r.vendedor_pedido = info.seller
          }
        })
      }
    }

    return receipts
  },

  async saveConference(
    recebimentoId: number,
    vendaId: number,
    data: PixConferenceFormData,
    employeeName: string,
  ) {
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
