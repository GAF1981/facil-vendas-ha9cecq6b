import { supabase } from '@/lib/supabase/client'
import { PixReceiptRow, PixConferenceFormData } from '@/types/pix'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'

export const pixService = {
  async getPixReceipts(): Promise<PixReceiptRow[]> {
    // 1. Fetch from RECEBIMENTOS
    // Filtering out records with 0 or null value as requested
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
      .gt('valor_pago', 0) // Filter strictly greater than 0
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    // 2. Fetch All Rotas to determine Route Number efficiently
    const { data: rotas } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(50) // Assuming last 50 routes cover recent history

    const receipts = (data || []).map((row: any) => {
      const pix = Array.isArray(row.PIX) ? row.PIX[0] : row.PIX
      const clientName = row.CLIENTES?.['NOME CLIENTE'] || 'N/D'

      // Determine Rota ID based on created_at
      let rotaId: number | undefined
      if (row.created_at && rotas) {
        const created = parseISO(row.created_at)
        const rota = rotas.find((r) => {
          const start = parseISO(r.data_inicio)
          const end = r.data_fim ? parseISO(r.data_fim) : new Date()
          return (
            (isAfter(created, start) || isEqual(created, start)) &&
            (isBefore(created, end) || isEqual(created, end))
          )
        })
        if (rota) rotaId = rota.id
      }

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
        rota_id: rotaId, // New field
      }
    })

    // 3. Enhance with "Data do Acerto"
    const orderIds = [...new Set(receipts.map((r) => r.venda_id))]

    if (orderIds.length > 0) {
      const { data: orderData, error: orderError } = await supabase
        .from('BANCO_DE_DADOS')
        .select(
          '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "FUNCIONÁRIO", "data_combinada"',
        )
        .in('NÚMERO DO PEDIDO', orderIds)

      if (!orderError && orderData) {
        const orderMap = new Map<
          number,
          { date: string; seller: string; combinedDate: string | null }
        >()
        orderData.forEach((od: any) => {
          orderMap.set(od['NÚMERO DO PEDIDO'], {
            date: od['DATA DO ACERTO'],
            seller: od['FUNCIONÁRIO'],
            combinedDate: od['data_combinada'],
          })
        })

        receipts.forEach((r) => {
          const info = orderMap.get(r.venda_id)
          if (info) {
            r.data_acerto = info.combinedDate || info.date
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

  // Helper to check automated approval
  async areAllPixConfirmedForEmployee(rotaId: number, employeeId: number) {
    // 1. Get current route details to define time range
    const { data: rota } = await supabase
      .from('ROTA')
      .select('*')
      .eq('id', rotaId)
      .single()

    if (!rota) return false

    // 2. Fetch ALL Pix receipts for this employee in this route time
    // We filter by 'Pix' in forma_pagamento directly
    const { data: receipts, error } = await supabase
      .from('RECEBIMENTOS')
      .select('id, PIX(confirmado_por)')
      .eq('funcionario_id', employeeId)
      .ilike('forma_pagamento', '%Pix%')
      .gt('valor_pago', 0) // Consistent filtering
      .gte('created_at', rota.data_inicio)
      // If route closed, check upper bound
      .lte(
        'created_at',
        rota.data_fim || new Date(Date.now() + 86400000).toISOString(),
      )

    if (error) throw error
    if (!receipts || receipts.length === 0) return true // No pix = All confirmed (technically valid for checkbox)

    // 3. Check if all have a 'confirmado_por' value (Left join returns array or object)
    const allConfirmed = receipts.every((r: any) => {
      const pix = Array.isArray(r.PIX) ? r.PIX[0] : r.PIX
      return !!pix?.confirmado_por
    })

    return allConfirmed
  },
}
