import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

export const notaFiscalService = {
  async getSettlements(
    rotaId?: number | null,
  ): Promise<NotaFiscalSettlement[]> {
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", CLIENTE, "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, nota_fiscal_emitida',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(2000)

    if (rotaId) {
      // Assuming 'rota_id' or linking via RECEBIMENTOS/ROTA_ITEMS is needed.
      // Since BANCO_DE_DADOS doesn't have rota_id explicitly usually, we might need to filter by clients in that route.
      // However, debitos_historico has rota_id.
      // Let's try to filter by clients that belong to the route.
      const { data: routeClients } = await supabase
        .from('ROTA_ITEMS')
        .select('cliente_id')
        .eq('rota_id', rotaId)

      if (routeClients && routeClients.length > 0) {
        const clientIds = routeClients.map((rc) => rc.cliente_id)
        query = query.in('"CÓDIGO DO CLIENTE"', clientIds)
      } else {
        // If route has no clients, return empty
        return []
      }
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch existing emitted notes to link
    const { data: emittedData } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')

    const emittedMap = new Map<number, string>()
    emittedData?.forEach((e) => {
      emittedMap.set(e.pedido_id, e.numero_nota_fiscal)
    })

    return (data || []).map((row) => ({
      orderId: row['NÚMERO DO PEDIDO'] || 0,
      clientCode: row['CÓDIGO DO CLIENTE'] || 0,
      clientName: row['CLIENTE'] || 'N/D',
      dataAcerto: row['DATA DO ACERTO'] || '',
      valorTotalVendido: parseCurrency(row['VALOR VENDIDO']),
      notaFiscalCadastro: row.nota_fiscal_cadastro || 'NÃO',
      notaFiscalVenda: row.nota_fiscal_venda || 'NÃO',
      solicitacaoNf: row.solicitacao_nf || 'NÃO',
      notaFiscalEmitida: row.nota_fiscal_emitida || 'Pendente',
      numeroNotaFiscal:
        emittedMap.get(row['NÚMERO DO PEDIDO'] || 0) || undefined,
    }))
  },

  async emitInvoice(
    payload: {
      pedidoId: number
      clienteId: number
      numeroNotaFiscal: string
      funcionarioId: number
    },
    updateStatus: boolean = true,
  ) {
    const { error } = await supabase.from('notas_fiscais_emitidas').insert({
      pedido_id: payload.pedidoId,
      cliente_id: payload.clienteId,
      numero_nota_fiscal: payload.numeroNotaFiscal,
      funcionario_id: payload.funcionarioId,
      data_emissao: new Date().toISOString(),
    })

    if (error) throw error

    if (updateStatus) {
      await supabase
        .from('BANCO_DE_DADOS')
        .update({ nota_fiscal_emitida: 'Emitida' } as any)
        .eq('"NÚMERO DO PEDIDO"', payload.pedidoId)
    }
  },

  async updateStatus(orderId: number, status: string) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: status } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
  },
}
