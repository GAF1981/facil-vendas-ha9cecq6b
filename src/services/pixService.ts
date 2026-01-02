import { supabase } from '@/lib/supabase/client'
import {
  PixRecebimentoRow,
  PixAcertoRow,
  PixConferenceFormData,
} from '@/types/pix'

export const pixService = {
  // Requirement 4: Data for "Conferência de Recebimentos via Pix" Gallery
  async getPixConferenceData(): Promise<PixRecebimentoRow[]> {
    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        venda_id,
        cliente_id,
        forma_pagamento,
        valor_pago,
        created_at,
        CLIENTES ( "NOME CLIENTE" ),
        PIX ( id, nome_no_pix, banco_pix, data_realizada, confirmado_por )
      `,
      )
      .ilike('forma_pagamento', '%Pix%')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error

    return (data || []).map((row: any) => {
      const pixData = Array.isArray(row.PIX)
        ? row.PIX[0]
        : row.PIX || {
            id: null,
            nome_no_pix: null,
            banco_pix: null,
            data_realizada: null,
            confirmado_por: null,
          }

      return {
        id: row.id,
        orderId: row.venda_id,
        clientCode: row.cliente_id,
        clientName:
          (Array.isArray(row.CLIENTES) ? row.CLIENTES[0] : row.CLIENTES)?.[
            'NOME CLIENTE'
          ] || 'Cliente não encontrado',
        paymentMethod: row.forma_pagamento,
        value: row.valor_pago,
        isConfirmed: !!pixData.id, // Considered confirmed if PIX record exists
        confirmedBy: pixData.confirmado_por,
        createdAt: row.created_at,
        pixId: pixData.id,
        pixName: pixData.nome_no_pix,
        pixBank: pixData.banco_pix,
        pixDate: pixData.data_realizada,
      }
    })
  },

  // Requirement 4: Register Pix Conference
  async registerConference(data: PixConferenceFormData, employeeName: string) {
    // 1. Insert into PIX table
    const { error: pixError } = await supabase.from('PIX').insert({
      recebimento_id: data.recebimento_id,
      nome_no_pix: data.nome_no_pix,
      banco_pix: data.banco_pix,
      data_realizada: new Date(`${data.data_realizada}T12:00:00`).toISOString(), // Midday to avoid tz issues
      confirmado_por: employeeName,
    })

    if (pixError) throw pixError

    // 2. Update RECEBIMENTOS to reflect confirmation (Audit redundancy)
    const { error: recError } = await supabase
      .from('RECEBIMENTOS')
      .update({
        pix_recebimento_confirmado: true,
        pix_confirmado_por: employeeName,
      })
      .eq('id', data.recebimento_id)

    if (recError) console.error('Error updating RECEBIMENTOS audit:', recError)
  },

  // Requirement 3: Data for "Recebimento Pix" Collection (Acertos View)
  async getPixAcertos(): Promise<PixAcertoRow[]> {
    // 1. Fetch Orders from BANCO_DE_DADOS
    const { data: orders, error: ordersError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "FUNCIONÁRIO", "FORMA", "pix_acerto_confirmado", "pix_confirmado_por", "DATA DO ACERTO"',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(1000)

    if (ordersError) throw ordersError

    // 2. Fetch Pix Receipts for these orders
    const orderIds = orders.map((o) => o['NÚMERO DO PEDIDO'])

    // Check if orderIds is empty to avoid error
    if (orderIds.length === 0) return []

    const { data: receipts, error: receiptsError } = await supabase
      .from('RECEBIMENTOS')
      .select(
        'id, venda_id, valor_pago, forma_pagamento, pix_recebimento_confirmado, pix_confirmado_por',
      )
      .in('venda_id', orderIds)
      .ilike('forma_pagamento', '%Pix%')

    if (receiptsError) throw receiptsError

    const receiptsMap = new Map<
      number,
      {
        total: number
        confirmed: boolean
        confirmedBy: string | null
        ids: number[]
      }
    >()

    receipts?.forEach((rec: any) => {
      const oid = rec.venda_id
      if (!receiptsMap.has(oid)) {
        receiptsMap.set(oid, {
          total: 0,
          confirmed: true, // Start true, AND logic (if ANY is false, then false)
          confirmedBy: null,
          ids: [],
        })
      }
      const entry = receiptsMap.get(oid)!
      entry.total += rec.valor_pago || 0

      // If any receipt in the order is NOT confirmed, the order aggregation is NOT confirmed
      if (!rec.pix_recebimento_confirmado) entry.confirmed = false
      if (rec.pix_confirmado_por) entry.confirmedBy = rec.pix_confirmado_por // Take last one
      entry.ids.push(rec.id)
    })

    // 3. Merge Data
    const result: PixAcertoRow[] = []
    const processedOrders = new Set<number>()

    orders.forEach((order: any) => {
      const oid = order['NÚMERO DO PEDIDO']
      if (processedOrders.has(oid)) return
      processedOrders.add(oid)

      const recInfo = receiptsMap.get(oid)

      // Only include if there is Pix info in Acerto OR Receipts
      const forma = order['FORMA'] || ''
      const hasPixInAcerto = forma.toLowerCase().includes('pix')
      const hasPixInReceipts = !!recInfo

      if (hasPixInAcerto || hasPixInReceipts) {
        result.push({
          orderId: oid,
          clientCode: order['CÓDIGO DO CLIENTE'] || 0,
          clientName: order['CLIENTE'] || 'Desconhecido',
          salesEmployee: order['FUNCIONÁRIO'] || '-',
          acertoForma: forma,
          acertoPixConfirmed: order['pix_acerto_confirmado'] || false,
          acertoPixConfirmedBy: order['pix_confirmado_por'],
          recebimentoValue: recInfo?.total || 0,
          recebimentoPixConfirmed: recInfo?.confirmed || false,
          recebimentoPixConfirmedBy: recInfo?.confirmedBy || null,
          recebimentoIds: recInfo?.ids || [],
        })
      }
    })

    return result
  },

  // Toggle Acerto Confirmation
  async toggleAcertoConfirmation(
    orderId: number,
    confirmed: boolean,
    employeeName: string,
  ) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({
        pix_acerto_confirmado: confirmed,
        pix_confirmado_por: confirmed ? employeeName : null,
      } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },

  // Toggle Recebimento Confirmation
  async toggleRecebimentoConfirmation(
    recebimentoIds: number[],
    confirmed: boolean,
    employeeName: string,
  ) {
    if (recebimentoIds.length === 0) return

    const { error } = await supabase
      .from('RECEBIMENTOS')
      .update({
        pix_recebimento_confirmado: confirmed,
        pix_confirmado_por: confirmed ? employeeName : null,
      })
      .in('id', recebimentoIds)

    if (error) throw error
  },
}
