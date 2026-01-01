import { supabase } from '@/lib/supabase/client'
import { reportsService } from './reportsService'
import { parseCurrency } from '@/lib/formatters'

export interface ConfirmationRow {
  orderId: number
  date: string
  employee: string
  monthlyAverage: number | null
  totalSale: number
  amountToPay: number
  paidAmount: number
  registeredAmount: number
  remainingAmount: number
  methods: {
    pix: number
    boleto: number
    dinheiro: number
    cheque: number
  }
}

export const confirmationService = {
  async getConfirmationData(): Promise<ConfirmationRow[]> {
    // 1. Fetch Orders from BANCO_DE_DADOS
    const { data: ordersData, error: ordersError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "CLIENTE", "VALOR VENDIDO", "SALDO FINAL", "VALOR DEVIDO", "FUNCIONÁRIO", "CÓDIGO DO CLIENTE"',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .not('"DATA DO ACERTO"', 'is', null)
      .limit(5000)

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
        const clientId = row['CÓDIGO DO CLIENTE']
        const monthlyAverage = projectionMap.get(clientId) || null

        ordersMap.set(orderId, {
          orderId,
          date: row['DATA DO ACERTO'],
          employee: row['FUNCIONÁRIO'] || 'N/D',
          monthlyAverage,
          totalSale: 0,
          amountToPay: 0,
          paidAmount: 0,
          registeredAmount: 0,
          remainingAmount: 0,
          methods: {
            pix: 0,
            boleto: 0,
            dinheiro: 0,
            cheque: 0,
          },
        })
      }

      const order = ordersMap.get(orderId)!
      order.totalSale += parseCurrency(row['VALOR VENDIDO'])

      if (row['VALOR DEVIDO'] != null) {
        order.amountToPay += row['VALOR DEVIDO']
      }
    })

    // Aggregate Receipts
    receiptsData?.forEach((rec: any) => {
      const orderId = rec.venda_id
      const order = ordersMap.get(orderId)
      if (!order) return

      const registered = rec.valor_registrado || 0
      const paid = rec.valor_pago || 0

      order.paidAmount += paid
      order.registeredAmount += registered

      const method = (rec.forma_pagamento || '').toLowerCase()
      // We store the PAID value to know if checkboxes should be shown (per requirement)
      if (method.includes('pix')) order.methods.pix += paid
      if (method.includes('boleto')) order.methods.boleto += paid
      if (method.includes('dinheiro')) order.methods.dinheiro += paid
      if (method.includes('cheque')) order.methods.cheque += paid
    })

    // Post-Process
    const result = Array.from(ordersMap.values())
      .map((order) => {
        return {
          ...order,
          remainingAmount: order.registeredAmount - order.paidAmount,
        }
      })
      .filter((o) => o.remainingAmount > 0.05)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
