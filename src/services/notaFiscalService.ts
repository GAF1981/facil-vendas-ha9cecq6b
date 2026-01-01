import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

export const notaFiscalService = {
  async getAllSettlements(): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, CLIENTE',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(1000)

    if (error) throw error

    return this.processSettlementData(data, '')
  },

  async getSettlementsByClient(
    clientId: number,
    clientNotaFiscalInfo: string,
  ): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, CLIENTE',
      )
      .eq('"CÓDIGO DO CLIENTE"', clientId)
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })

    if (error) throw error

    return this.processSettlementData(data, clientNotaFiscalInfo)
  },

  processSettlementData(
    data: any[] | null,
    defaultNfInfo: string,
  ): NotaFiscalSettlement[] {
    if (!data) return []

    // Aggregate by Order ID
    const ordersMap = new Map<number, NotaFiscalSettlement>()

    data.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          orderId: orderId,
          clientName: row['CLIENTE'] || 'N/D',
          dataAcerto: row['DATA DO ACERTO'] || '',
          valorTotalVendido: 0,
          notaFiscalCadastro: row.nota_fiscal_cadastro || defaultNfInfo || '',
          notaFiscalVenda: row.nota_fiscal_venda || '',
          notaFiscalEmitida: row.nota_fiscal_emitida || 'Pendente',
        })
      }

      const order = ordersMap.get(orderId)!
      // Accumulate value
      order.valorTotalVendido += parseCurrency(row['VALOR VENDIDO'])
    })

    return Array.from(ordersMap.values())
  },

  async updateIssuanceStatus(orderId: number, status: string) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: status } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },
}
