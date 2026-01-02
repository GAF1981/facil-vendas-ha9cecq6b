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
    // 1. Fetch all Products
    const { data: products, error: prodError } = await supabase
      .from('PRODUTOS')
      .select('*')
      .order('PRODUTO', { ascending: true })

    if (prodError) throw prodError
    if (!products) return []

    // 2. Fetch latest DB state for each product (Aggregation Logic)
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"COD. PRODUTO", "SALDO INICIAL", "SALDO FINAL", "CONTAGEM", "NOVAS CONSIGNAÇÕES", "RECOLHIDO", "QUANTIDADE VENDIDA", "DATA DO ACERTO", "HORA DO ACERTO", "CODIGO FUNCIONARIO", "session_id"',
      )

    // If fetching for a specific employee, filter DB records
    if (funcionarioId) {
      query = query.eq('CODIGO FUNCIONARIO', funcionarioId)
    }

    const { data: dbData, error: dbError } = await query
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(10000)

    if (dbError) throw dbError

    // Map DB data by Product Code
    const dbMap = new Map<number, any>()
    dbData?.forEach((row: any) => {
      const codProd = row['COD. PRODUTO']
      if (codProd && !dbMap.has(codProd)) {
        // Since it's sorted by Date DESC, the first occurrence is the latest
        dbMap.set(codProd, row)
      }
    })

    // 3. Map Products to Inventory Items
    const inventory: InventarioItem[] = products.map((prod) => {
      const dbRow = prod.CODIGO ? dbMap.get(prod.CODIGO) : null
      const price = parseCurrency(prod.PREÇO)

      let saldoInicial = 0
      let saldoFinal = 0
      let contagem = 0
      let entradaEstoqueCarro = 0
      let saidaCarroEstoque = 0
      let saidaCarroCliente = 0

      if (dbRow) {
        // Logic for Inventory Continuity:
        // If the latest record belongs to the current session, use it as is.
        // If it belongs to a previous session (or undefined session), carry over the final balance as initial balance for current view.
        const isCurrentSession = sessionId && dbRow.session_id === sessionId

        if (isCurrentSession) {
          saldoInicial = dbRow['SALDO INICIAL'] || 0
          saldoFinal = dbRow['SALDO FINAL'] || 0
          contagem = dbRow['CONTAGEM'] || 0
          entradaEstoqueCarro = parseCurrency(dbRow['NOVAS CONSIGNAÇÕES'])
          saidaCarroEstoque = parseCurrency(dbRow['RECOLHIDO'])
          saidaCarroCliente = parseCurrency(dbRow['QUANTIDADE VENDIDA'])
        } else {
          // Carry Over Logic
          // If we haven't touched this product in the current session yet,
          // the "Initial Balance" for this session is the "Final Balance" of the last record.
          saldoInicial = dbRow['SALDO FINAL'] || 0
          saldoFinal = dbRow['SALDO FINAL'] || 0
          contagem = 0 // Not counted in this session yet
          // Reset movements for the view of the new session
          entradaEstoqueCarro = 0
          saidaCarroEstoque = 0
          saidaCarroCliente = 0
        }
      }

      // Calculated Difference
      const diffQty = contagem > 0 ? saldoFinal - contagem : 0
      const diffVal = diffQty * price

      return {
        id: prod.ID,
        codigo_barras: prod['CÓDIGO BARRAS']
          ? prod['CÓDIGO BARRAS'].toString()
          : null,
        codigo_produto: prod.CODIGO,
        mercadoria: prod.PRODUTO || 'N/D',
        tipo: prod.TIPO,
        preco: price,
        saldo_inicial: saldoInicial,
        entrada_estoque_carro: entradaEstoqueCarro,
        entrada_cliente_carro: 0,
        saida_carro_estoque: saidaCarroEstoque,
        saida_carro_cliente: saidaCarroCliente,
        saldo_final: saldoFinal,
        estoque_contagem_carro: contagem,
        diferenca_quantidade: diffQty,
        diferenca_valor: diffVal,
      }
    })

    return inventory
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
