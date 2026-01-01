import { supabase } from '@/lib/supabase/client'
import { reportsService } from './reportsService'
import { parseCurrency } from '@/lib/formatters'

export interface ConfirmationRow {
  orderId: number
  date: string
  employee: string
  monthlyAverage: number | null
  totalSale: number
  amountToPay: number // Saldo Final logic adjusted for financial context
  paidAmount: number
  registeredAmount: number
  remainingAmount: number // Valor a Confirmar
  methods: {
    pix: boolean
    boleto: boolean
    dinheiro: boolean
    cheque: boolean
  }
}

export const confirmationService = {
  async getConfirmationData(): Promise<ConfirmationRow[]> {
    // 1. Fetch Orders from BANCO_DE_DADOS
    // Fetch a large dataset to ensure we cover open payments
    const { data: ordersData, error: ordersError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "CLIENTE", "VALOR VENDIDO", "SALDO FINAL", "VALOR DEVIDO", "FUNCIONÁRIO", "CÓDIGO DO CLIENTE"',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .limit(5000) // Increased limit

    if (ordersError) throw ordersError

    // 2. Fetch Receipts
    const { data: receiptsData, error: receiptsError } = await supabase
      .from('RECEBIMENTOS')
      .select('venda_id, valor_pago, valor_registrado, forma_pagamento')
      .limit(10000)

    if (receiptsError) throw receiptsError

    // 3. Fetch Projections for Media Mensal logic
    const projections = await reportsService.getProjectionsReport()
    const projectionMap = new Map<number, number>()
    projections.forEach((p) => {
      // Create a map of Client ID -> Monthly Average (latest valid)
      if (p.monthlyAverage !== null && !projectionMap.has(p.clientCode)) {
        projectionMap.set(p.clientCode, p.monthlyAverage)
      }
    })

    // Process Data
    const ordersMap = new Map<number, ConfirmationRow>()

    // Aggregate Orders
    ordersData?.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        // Calculate monthly average for this client
        const clientId = row['CÓDIGO DO CLIENTE']
        const monthlyAverage = projectionMap.get(clientId) || null

        ordersMap.set(orderId, {
          orderId,
          date: row['DATA DO ACERTO'],
          employee: row['FUNCIONÁRIO'] || 'N/D',
          monthlyAverage,
          totalSale: 0,
          amountToPay: 0, // Will assume Valor Devido or Calc
          paidAmount: 0,
          registeredAmount: 0,
          remainingAmount: 0,
          methods: {
            pix: false,
            boleto: false,
            dinheiro: false,
            cheque: false,
          },
        })
      }

      const order = ordersMap.get(orderId)!
      order.totalSale += parseCurrency(row['VALOR VENDIDO'])

      // Saldo a Pagar Logic: Use VALOR DEVIDO if available (from newer migrations), otherwise fallback
      // Since it's row-based, sum it up.
      if (row['VALOR DEVIDO'] != null) {
        order.amountToPay += row['VALOR DEVIDO']
      }
    })

    // Aggregate Receipts
    receiptsData?.forEach((rec: any) => {
      const orderId = rec.venda_id
      const order = ordersMap.get(orderId)
      if (!order) return

      order.paidAmount += rec.valor_pago || 0
      order.registeredAmount += rec.valor_registrado || 0

      // Flag methods present
      const method = (rec.forma_pagamento || '').toLowerCase()
      if (method.includes('pix')) order.methods.pix = true
      if (method.includes('boleto')) order.methods.boleto = true
      if (method.includes('dinheiro')) order.methods.dinheiro = true
      if (method.includes('cheque')) order.methods.cheque = true
    })

    // Post-Process
    const result = Array.from(ordersMap.values())
      .map((order) => {
        // Fallback for Amount to Pay if Valor Devido wasn't populated (old records)
        // Assume Amount to Pay is roughly what was registered if Total Sale is 0?
        // Or if Total Sale > 0 and Amount to Pay is 0, estimate it?
        // Let's stick to the summed value. If 0, it might be fully paid or old data without VALOR DEVIDO column.
        // For accurate "Valor a Confirmar", we rely on Registered - Paid.

        return {
          ...order,
          remainingAmount: order.registeredAmount - order.paidAmount,
        }
      })
      // Filter out orders that are fully confirmed (tolerance 0.01)
      // Actually, user wants to "track and verify", so maybe show all?
      // Usually "Confirmation" implies checking pending items.
      // Let's filter to show items where Registered > Paid.
      .filter((o) => o.remainingAmount > 0.05)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(), // Newest first
      )

    return result
  },

  async confirmPayment(
    orderId: number,
    methods: {
      pix?: boolean
      boleto?: boolean
      dinheiro?: boolean
      cheque?: boolean
    },
  ) {
    // This function will confirm payments for the specified order and methods.
    // It finds receipts for that order with the matching method where valor_pago < valor_registrado
    // and updates valor_pago = valor_registrado.

    // 1. Fetch relevant receipts
    const { data: receipts, error: fetchError } = await supabase
      .from('RECEBIMENTOS')
      .select('id, forma_pagamento, valor_registrado, valor_pago')
      .eq('venda_id', orderId)

    if (fetchError) throw fetchError

    const updates = []

    for (const rec of receipts || []) {
      const method = (rec.forma_pagamento || '').toLowerCase()
      let shouldUpdate = false

      if (methods.pix && method.includes('pix')) shouldUpdate = true
      if (methods.boleto && method.includes('boleto')) shouldUpdate = true
      if (methods.dinheiro && method.includes('dinheiro')) shouldUpdate = true
      if (methods.cheque && method.includes('cheque')) shouldUpdate = true

      if (shouldUpdate && rec.valor_registrado > rec.valor_pago) {
        updates.push(
          supabase
            .from('RECEBIMENTOS')
            .update({ valor_pago: rec.valor_registrado })
            .eq('id', rec.id),
        )
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates)
    }
  },
}
