import { supabase } from '@/lib/supabase/client'
import {
  InventarioItem,
  DatasDeInventario,
  MovementInsert,
  InventarioSummaryData,
} from '@/types/inventario'
import { parseCurrency, formatCurrency } from '@/lib/formatters'

export const inventarioService = {
  // Legacy method kept for compatibility but implemented with pagination underneath if needed
  // or explicitly deprecated. We'll update it to use the new V2 RPCs for resilience.
  async getInventory(
    funcionarioId?: number,
    sessionId?: number,
  ): Promise<InventarioItem[]> {
    // Fallback to fetch first 1000 items if called directly
    const { data } = await this.getInventoryPaginated(
      funcionarioId,
      sessionId,
      1,
      1000,
    )
    return data
  },

  async getInventoryPaginated(
    funcionarioId?: number | null,
    sessionId?: number | null,
    page: number = 1,
    pageSize: number = 50,
    search?: string,
  ): Promise<{ data: InventarioItem[]; totalCount: number }> {
    const { data, error } = await supabase.rpc(
      'get_inventory_items_paginated',
      {
        p_session_id: sessionId ?? null,
        p_funcionario_id: funcionarioId ?? null,
        p_page: page,
        p_page_size: pageSize,
        p_search: search || null,
      },
    )

    if (error) {
      console.error('Error fetching inventory data paginated:', error)
      throw error
    }

    if (!data) return { data: [], totalCount: 0 }

    const mappedData = data.map((item: any) => {
      try {
        const saldoFinal = Number(item.saldo_final) || 0
        const contagem = Number(item.estoque_contagem_carro) || 0
        const preco = Number(item.preco) || 0

        const diferencaQuantidade = contagem - saldoFinal
        const diferencaValor = diferencaQuantidade * preco

        return {
          id: item.id,
          codigo_barras: item.codigo_barras,
          codigo_produto: item.codigo_produto,
          mercadoria: item.mercadoria || 'Nome Indisponível',
          tipo: item.tipo,
          preco: preco,
          saldo_inicial: Number(item.saldo_inicial) || 0,
          entrada_estoque_carro: Number(item.entrada_estoque_carro) || 0,
          entrada_cliente_carro: Number(item.entrada_cliente_carro) || 0,
          saida_carro_estoque: Number(item.saida_carro_estoque) || 0,
          saida_carro_cliente: Number(item.saida_carro_cliente) || 0,
          saldo_final: saldoFinal,
          estoque_contagem_carro: contagem,
          diferenca_quantidade: diferencaQuantidade,
          diferenca_valor: diferencaValor,
          hasError: false,
        }
      } catch (rowError) {
        console.error(`Error processing row for item ${item?.id}:`, rowError)
        return {
          id: item?.id || Math.random(),
          codigo_barras: null,
          codigo_produto: item?.codigo_produto || null,
          mercadoria: item?.mercadoria || 'Erro de Dados',
          tipo: null,
          preco: 0,
          saldo_inicial: 0,
          entrada_estoque_carro: 0,
          entrada_cliente_carro: 0,
          saida_carro_estoque: 0,
          saida_carro_cliente: 0,
          saldo_final: 0,
          estoque_contagem_carro: 0,
          diferenca_quantidade: 0,
          diferenca_valor: 0,
          hasError: true,
        }
      }
    })

    const totalCount = data[0]?.total_count || 0

    return {
      data: mappedData,
      totalCount: Number(totalCount),
    }
  },

  async getInventorySummary(
    funcionarioId?: number | null,
    sessionId?: number | null,
    search?: string,
  ): Promise<InventarioSummaryData> {
    const { data, error } = await supabase.rpc('get_inventory_summary_v2', {
      p_session_id: sessionId ?? null,
      p_funcionario_id: funcionarioId ?? null,
      p_search: search || null,
    })

    if (error) {
      console.error('Error fetching inventory summary:', error)
      // Return zeroed summary on error
      return {
        initial: { qty: 0, value: 0 },
        final: { qty: 0, value: 0 },
        positiveDiff: { qty: 0, value: 0 },
        negativeDiff: { qty: 0, value: 0 },
      }
    }

    const row = data?.[0] || {}

    return {
      initial: {
        qty: Number(row.total_saldo_inicial_qtd) || 0,
        value: Number(row.total_saldo_inicial_valor) || 0,
      },
      final: {
        qty: Number(row.total_saldo_final_qtd) || 0,
        value: Number(row.total_saldo_final_valor) || 0,
      },
      positiveDiff: {
        qty: Number(row.total_diferenca_positiva_qtd) || 0,
        value: Number(row.total_diferenca_positiva_valor) || 0,
      },
      negativeDiff: {
        qty: Number(row.total_diferenca_negativa_qtd) || 0,
        value: Number(row.total_diferenca_negativa_valor) || 0,
      },
    }
  },

  async getActiveSession(): Promise<DatasDeInventario | null> {
    const { data, error } = await supabase
      .from('DATAS DE INVENTÁRIO')
      .select('*')
      .is('Data de Fechamento de Inventário', null)
      .order('Data de Início de Inventário', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as DatasDeInventario | null
  },

  async getSessionCounts(sessionId: number): Promise<Record<number, number>> {
    const { data, error } = await supabase
      .from('CONTAGEM DE ESTOQUE FINAL')
      .select('produto_id, quantidade')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error fetching session counts:', error)
      return {}
    }

    const counts: Record<number, number> = {}
    data?.forEach((row) => {
      counts[row.produto_id] = row.quantidade
    })

    return counts
  },

  async startSession(
    tipo: 'GERAL' | 'FUNCIONARIO',
    funcionarioId?: number,
  ): Promise<DatasDeInventario> {
    const { data, error } = await supabase
      .from('DATAS DE INVENTÁRIO')
      .insert({
        TIPO: tipo,
        'CODIGO FUNCIONARIO': funcionarioId,
        'Data de Início de Inventário': new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as DatasDeInventario
  },

  async closeSession(id: number): Promise<DatasDeInventario> {
    const { data, error } = await supabase
      .from('DATAS DE INVENTÁRIO')
      .update({
        'Data de Fechamento de Inventário': new Date().toISOString(),
      } as any)
      .eq('ID INVENTÁRIO', id)
      .select()
      .single()

    if (error) throw error
    return data as DatasDeInventario
  },

  async saveFinalCounts(
    items: {
      productId: number
      productCode: number | null
      productName: string
      quantity: number
      price: number
    }[],
    sessionId: number | null,
    funcionarioId: number | null,
  ): Promise<void> {
    if (!sessionId) throw new Error('Session ID is required for saving counts.')

    const safeItems = items.map((i) => ({
      productId: i.productId,
      productCode: i.productCode,
      productName: i.productName,
      quantity: i.quantity,
      price: i.price,
    }))

    const { error } = await supabase.rpc('process_inventory_batch', {
      p_session_id: sessionId,
      p_items: safeItems,
      p_funcionario_id: funcionarioId,
    })

    if (error) {
      console.error('RPC process_inventory_batch error:', error)
      throw error
    }
  },

  async createMovement(movement: MovementInsert): Promise<void> {
    const { error: logError } = await supabase
      .from('REPOSIÇÃO E DEVOLUÇÃO')
      .insert(movement as any)

    if (logError) throw logError

    const { data: dbData, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"ID VENDA ITENS", "SALDO FINAL", "SALDO INICIAL", "NOVAS CONSIGNAÇÕES", "RECOLHIDO", "session_id"',
      )
      .eq('COD. PRODUTO', movement.produto_id)
      .eq('CODIGO FUNCIONARIO', movement.funcionario_id)
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dbError) throw dbError

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toLocaleTimeString()

    const isCurrentSession =
      dbData && movement.session_id && dbData.session_id === movement.session_id

    if (isCurrentSession) {
      const currentSaldo = dbData['SALDO FINAL'] || 0
      const currentNovas = parseCurrency(dbData['NOVAS CONSIGNAÇÕES'])
      const currentRecolhido = parseCurrency(dbData['RECOLHIDO'])

      let newSaldo = currentSaldo
      let newNovas = currentNovas
      let newRecolhido = currentRecolhido

      if (movement.TIPO === 'REPOSICAO') {
        newNovas += movement.quantidade
        newSaldo += movement.quantidade
      } else if (movement.TIPO === 'DEVOLUCAO') {
        newRecolhido += movement.quantidade
        newSaldo -= movement.quantidade
      }

      const { error: updateError } = await supabase
        .from('BANCO_DE_DADOS')
        .update({
          'SALDO FINAL': newSaldo,
          'NOVAS CONSIGNAÇÕES': formatCurrency(newNovas),
          RECOLHIDO: formatCurrency(newRecolhido),
          'DATA DO ACERTO': dateStr,
          'HORA DO ACERTO': timeStr,
        } as any)
        .eq('ID VENDA ITENS', dbData['ID VENDA ITENS'])

      if (updateError) throw updateError
    } else {
      let prevSaldoFinal = 0
      if (dbData) {
        prevSaldoFinal = dbData['SALDO FINAL'] || 0
      }

      let newSaldo = prevSaldoFinal
      let newNovas = 0
      let newRecolhido = 0

      if (movement.TIPO === 'REPOSICAO') {
        newNovas = movement.quantidade
        newSaldo += movement.quantidade
      } else if (movement.TIPO === 'DEVOLUCAO') {
        newRecolhido = movement.quantidade
        newSaldo -= movement.quantidade
      }

      const { data: prod } = await supabase
        .from('PRODUTOS')
        .select('PRODUTO')
        .eq('ID', movement.produto_id)
        .single()

      const prodName = prod?.PRODUTO || ''

      const { error: insertError } = await supabase
        .from('BANCO_DE_DADOS')
        .insert({
          'COD. PRODUTO': movement.produto_id,
          'CODIGO FUNCIONARIO': movement.funcionario_id,
          'SALDO FINAL': newSaldo,
          'SALDO INICIAL': prevSaldoFinal,
          'NOVAS CONSIGNAÇÕES': formatCurrency(newNovas),
          RECOLHIDO: formatCurrency(newRecolhido),
          CONTAGEM: 0,
          'DATA DO ACERTO': dateStr,
          'HORA DO ACERTO': timeStr,
          MERCADORIA: prodName,
          TIPO: 'MOVIMENTACAO',
          session_id: movement.session_id,
        } as any)

      if (insertError) throw insertError
    }
  },
}
