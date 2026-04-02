import { supabase } from '@/lib/supabase/client'

export interface QuitarDividaItem {
  id: number
  cliente_id: number
  cliente_nome: string
  cobranca_seq: number
  data_acerto: string
  vencimento: string
  forma_pagamento: string
  valor_parcela: number
  valor_pago: number
  saldo_devedor: number
  status: string
}

export const quitarDividaService = {
  getPendingDividas: async (filters: any) => {
    let query = supabase.from('dividas_manuais').select(`
        *,
        CLIENTES ( "NOME CLIENTE" )
      `)

    const { data, error } = await query.order('vencimento', { ascending: true })
    if (error) throw error

    let items: QuitarDividaItem[] = (data || []).map((d: any) => {
      const cName = d.CLIENTES
        ? Array.isArray(d.CLIENTES)
          ? d.CLIENTES[0]?.['NOME CLIENTE']
          : d.CLIENTES?.['NOME CLIENTE']
        : 'Desconhecido'
      const valorP = Number(d.valor_parcela || 0)
      const pago = Number(d.valor_pago || 0)
      return {
        id: d.id,
        cliente_id: d.cliente_id || 0,
        cliente_nome: cName || 'Desconhecido',
        cobranca_seq: d.cobranca_seq,
        data_acerto: d.data_acerto,
        vencimento: d.vencimento,
        forma_pagamento: d.forma_pagamento,
        valor_parcela: valorP,
        valor_pago: pago,
        saldo_devedor: valorP - pago,
        status: pago >= valorP ? 'PAGO' : 'PENDENTE',
      }
    })

    if (filters.status === 'PENDENTE') {
      items = items.filter((i) => i.status === 'PENDENTE')
    } else if (filters.status === 'PAGO') {
      items = items.filter((i) => i.status === 'PAGO')
    }

    if (filters.search) {
      const s = filters.search.toLowerCase()
      items = items.filter(
        (i) =>
          i.cliente_nome.toLowerCase().includes(s) ||
          i.cliente_id.toString().includes(s) ||
          `c${i.cobranca_seq}`.toLowerCase().includes(s),
      )
    }

    return items
  },

  processPayment: async (
    id: number,
    amount: number,
    date: string,
    method: string,
  ) => {
    const { data: div, error: err } = await supabase
      .from('dividas_manuais')
      .select('*')
      .eq('id', id)
      .single()
    if (err) throw err

    const novoValorPago = Number(div.valor_pago || 0) + amount

    const { error: updErr } = await supabase
      .from('dividas_manuais')
      .update({
        valor_pago: novoValorPago,
      })
      .eq('id', id)

    if (updErr) throw updErr

    return { success: true }
  },
}
