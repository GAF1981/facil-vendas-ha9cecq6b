import { supabase } from '@/lib/supabase/client'
import {
  InventarioItem,
  DatasDeInventario,
  MovementInsert,
} from '@/types/inventario'
import { parseCurrency, formatCurrency } from '@/lib/formatters'

export const inventarioService = {
  async getInventory(
    funcionarioId?: number,
    sessionId?: number,
  ): Promise<InventarioItem[]> {
    // Use the new RPC to get aggregated data efficiently
    const { data, error } = await supabase.rpc('get_inventory_data', {
      p_session_id: sessionId ?? null,
      p_funcionario_id: funcionarioId ?? null,
    })

    if (error) {
      console.error('Error fetching inventory data:', error)
      throw error
    }

    if (!data) return []

    // Map RPC result to InventarioItem type
    // Use defensive programming to handle malformed data in individual rows
    return data.map((item: any) => {
      try {
        const saldoFinal = Number(item.saldo_final) || 0
        const contagem = Number(item.contagem) || 0
        const preco = Number(item.preco) || 0

        // User Story: "Dif. (Qtd): Automated calculation of Contagem minus Saldo Final."
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
        // Return a safe fallback object marked with error
        return {
          id: item?.id || Math.random(), // Ensure key
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

    // Ensure items are properly formatted for JSONB
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
    // 1. Insert into new dedicated table
    const { error: logError } = await supabase
      .from('REPOSIÇÃO E DEVOLUÇÃO')
      .insert(movement as any)

    if (logError) throw logError

    // 2. Update BANCO_DE_DADOS to reflect movement in Inventory Table
    // Get latest record for product/employee
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

    // Determine if we update existing record or create new one based on session
    const isCurrentSession =
      dbData && movement.session_id && dbData.session_id === movement.session_id

    if (isCurrentSession) {
      // Calculate new values
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

      // Update
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
      // Create NEW record for this session, linking to previous
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

      // We need product name for insertion
      const { data: prod } = await supabase
        .from('PRODUTOS')
        .select('PRODUTO')
        .eq('ID', movement.produto_id)
        .single()

      const prodName = prod?.PRODUTO || ''

      // Insert
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
