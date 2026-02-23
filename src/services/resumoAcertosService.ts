import { supabase } from '@/lib/supabase/client'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'
import { Rota } from '@/types/rota'

export interface SettlementItem {
  produtoNome: string
  quantidade: number
  valorVendido: number
  saldoInicial: number
  saldoFinal: number
  contagem: number
  codigoInterno?: string
  precoUnitario: number
}

export interface SettlementSummary {
  orderId: number
  employee: string
  employeeId?: number | null
  clientCode: number
  clientName: string
  acertoDate: string
  acertoTime: string
  totalSalesValue: number
  paymentFormsBD: string
  payments: {
    method: string
    value: number
  }[]
  totalPaid: number
  totalDiscount: number
  valorDevido: number
  items: SettlementItem[]
}

export const resumoAcertosService = {
  async getAllRoutes() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as Rota[]
  },

  async getLatestRoute() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async getRouteById(id: number) {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Rota
  },

  async finishAndStartNewRoute(currentRouteId: number) {
    const now = new Date().toISOString()

    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: now,
      })
      .eq('id', currentRouteId)

    if (endError) throw endError

    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || currentRouteId) + 1

    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: now,
      })
      .select()
      .single()

    if (startError) throw startError

    return newRota as Rota
  },

  async updateOrderPaymentTerms(
    orderId: number,
    newInstallments: { method: string; value: number; dueDate: string }[],
  ) {
    const { data: orderData, error: orderError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"CÓDIGO DO CLIENTE", "CODIGO FUNCIONARIO"')
      .eq('"NÚMERO DO PEDIDO"', orderId)
      .limit(1)
      .maybeSingle()

    if (orderError) throw orderError
    if (!orderData) throw new Error('Pedido não encontrado no banco de dados.')

    const clientId = orderData['CÓDIGO DO CLIENTE']
    const employeeId = orderData['CODIGO FUNCIONARIO']

    const { error: deleteError } = await supabase
      .from('RECEBIMENTOS')
      .delete()
      .eq('venda_id', orderId)

    if (deleteError) throw deleteError

    const { data: activeRouteData } = await supabase
      .from('ROTA')
      .select('id')
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    const activeRouteId = activeRouteData?.id || null

    const inserts = newInstallments.map((inst) => ({
      venda_id: orderId,
      cliente_id: clientId,
      funcionario_id: employeeId,
      forma_pagamento: inst.method,
      valor_registrado: inst.value,
      valor_pago: 0,
      vencimento: new Date(`${inst.dueDate}T12:00:00`).toISOString(),
      ID_da_fêmea: orderId,
      rota_id: activeRouteId,
    }))

    const { error: insertError } = await supabase
      .from('RECEBIMENTOS')
      .insert(inserts)

    if (insertError) throw insertError

    const paymentString = newInstallments
      .map((p) => `${p.method} Reg: R$ ${formatCurrency(p.value)}`)
      .join(' | ')

    await supabase
      .from('BANCO_DE_DADOS')
      .update({ FORMA: paymentString } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    const { error: rpcError } = await supabase.rpc(
      'update_debito_historico_order',
      { p_pedido_id: orderId },
    )
    if (rpcError) throw rpcError
  },

  async getSettlements(rota: Rota) {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const datePartStart = rota.data_inicio.split('T')[0]
    const datePartEnd = rota.data_fim ? rota.data_fim.split('T')[0] : null

    let query = supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .gte('"DATA DO ACERTO"', datePartStart)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    if (datePartEnd) {
      query = query.lte('"DATA DO ACERTO"', datePartEnd)
    }

    const { data: dbData, error: dbError } = await query

    if (dbError) throw dbError

    const ordersMap = new Map<number, SettlementSummary>()

    dbData?.forEach((row: any) => {
      const dateStr = row['DATA DO ACERTO']
      const timeStr = row['HORA DO ACERTO'] || '00:00:00'
      if (!dateStr) return

      const rowDateTimeStr = `${dateStr}T${timeStr}`
      let rowDateTime: Date
      try {
        rowDateTime = parseISO(rowDateTimeStr)
      } catch (e) {
        return
      }

      const isAfterOrEqualStart =
        isAfter(rowDateTime, routeStart) || isEqual(rowDateTime, routeStart)
      const isBeforeOrEqualEnd =
        isBefore(rowDateTime, routeEnd) || isEqual(rowDateTime, routeEnd)

      if (!isAfterOrEqualStart) return
      if (rota.data_fim && !isBeforeOrEqualEnd) return

      const orderId = row['NÚMERO DO PEDIDO']
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId,
          employee: row['FUNCIONÁRIO'] || 'N/D',
          employeeId: row['CODIGO FUNCIONARIO'],
          clientCode: row['CÓDIGO DO CLIENTE'] || 0,
          clientName: row['CLIENTE'] || 'N/D',
          acertoDate: dateStr,
          acertoTime: timeStr,
          totalSalesValue: 0,
          paymentFormsBD: row['FORMA'] || '',
          payments: [],
          totalPaid: 0,
          totalDiscount: 0,
          valorDevido: 0,
          items: [],
        })
      }

      const order = ordersMap.get(orderId)!
      const itemValue = parseCurrency(row['VALOR VENDA PRODUTO'])
      order.totalSalesValue += itemValue

      const discountStr = row['DESCONTO POR GRUPO'] || '0'
      if (discountStr.includes('%')) {
        const pct = parseCurrency(discountStr.replace('%', ''))
        order.totalDiscount += itemValue * (pct / 100)
      } else {
        order.totalDiscount = parseCurrency(discountStr)
      }

      const qtdStr = String(row['QUANTIDADE VENDIDA'] || '0')
      const qtd = parseFloat(qtdStr.replace(',', '.') || '0') || 0

      order.items.push({
        produtoNome: row['MERCADORIA'] || 'N/D',
        quantidade: qtd,
        valorVendido: itemValue,
        saldoInicial: Number(row['SALDO INICIAL']) || 0,
        saldoFinal: Number(row['SALDO FINAL']) || 0,
        contagem: Number(row['CONTAGEM']) || 0,
        precoUnitario: parseCurrency(row['PREÇO VENDIDO']),
        codigoInterno: row.codigo_interno || '',
      })
    })

    const orderIds = Array.from(ordersMap.keys())

    if (orderIds.length > 0) {
      const { data: payData, error: payError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id, forma_pagamento, valor_pago')
        .in('venda_id', orderIds)

      if (payError) throw payError

      payData?.forEach((p: any) => {
        const order = ordersMap.get(p.venda_id)
        if (order) {
          if (p.valor_pago > 0) {
            order.payments.push({
              method: p.forma_pagamento,
              value: p.valor_pago,
            })
            order.totalPaid += p.valor_pago
          }
        }
      })
    }

    ordersMap.forEach((order) => {
      const netValue = order.totalSalesValue - order.totalDiscount
      order.valorDevido = Math.max(0, netValue - order.totalPaid)
    })

    return Array.from(ordersMap.values()).sort((a, b) => b.orderId - a.orderId)
  },
}
