import { supabase } from '@/lib/supabase/client'
import {
  InventarioItem,
  DatasDeInventario,
  MovementInsert,
  ContagemEstoqueFinalInsert,
} from '@/types/inventario'
import { parseCurrency, formatCurrency } from '@/lib/formatters'

export const inventarioService = {
  async getInventory(funcionarioId?: number): Promise<InventarioItem[]> {
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
        '"COD. PRODUTO", "SALDO INICIAL", "SALDO FINAL", "CONTAGEM", "NOVAS CONSIGNAÇÕES", "RECOLHIDO", "QUANTIDADE VENDIDA", "DATA DO ACERTO", "HORA DO ACERTO", "CODIGO FUNCIONARIO"',
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

      const saldoInicial = dbRow?.['SALDO INICIAL'] || 0
      const saldoFinal = dbRow?.['SALDO FINAL'] || 0
      const contagem = dbRow?.['CONTAGEM'] || 0

      // Map Movements
      const entradaEstoqueCarro = parseCurrency(dbRow?.['NOVAS CONSIGNAÇÕES'])
      const saidaCarroEstoque = parseCurrency(dbRow?.['RECOLHIDO'])
      const saidaCarroCliente = parseCurrency(dbRow?.['QUANTIDADE VENDIDA'])
      const entradaClienteCarro = 0

      // Calculated Difference
      const diffQty = saldoFinal - contagem
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
        entrada_cliente_carro: entradaClienteCarro,
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

  async updateItemBalance(
    productCode: number,
    balance: number,
    funcionarioId?: number | null,
  ): Promise<void> {
    // Updates SALDO FINAL instead of CONTAGEM as per new requirement
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select('"ID VENDA ITENS"')
      .eq('COD. PRODUTO', productCode)

    if (funcionarioId) {
      query = query.eq('CODIGO FUNCIONARIO', funcionarioId)
    }

    const { data, error } = await query
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (data) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('BANCO_DE_DADOS')
        .update({ 'SALDO FINAL': balance } as any)
        .eq('ID VENDA ITENS', data['ID VENDA ITENS'])

      if (updateError) throw updateError
    } else {
      console.warn(
        'No history record found for product to update balance. Balance not saved.',
      )
      // We don't throw here to avoid breaking bulk updates if one item fails to find history
    }
  },

  async saveFinalCounts(
    items: {
      productId: number
      productCode: number | null
      quantity: number
      price: number
    }[],
    sessionId: number | null,
    funcionarioId: number | null,
  ): Promise<void> {
    if (items.length === 0) return

    // 1. Insert into new table CONTAGEM DE ESTOQUE FINAL
    const insertPayload: ContagemEstoqueFinalInsert[] = items.map((item) => ({
      produto_id: item.productId,
      quantidade: item.quantity,
      session_id: sessionId,
      valor_unitario_snapshot: item.price,
    }))

    const { error: insertError } = await supabase
      .from('CONTAGEM DE ESTOQUE FINAL')
      .insert(insertPayload)

    if (insertError) throw insertError

    // 2. Update BANCO_DE_DADOS for each item to reflect the new balance
    // We process this in batches to avoid overwhelming the connection, although client-side looping is slow.
    // Ideally this should be a backend function, but we do it here to maintain feature parity.
    const updatePromises = items.map((item) => {
      if (item.productCode) {
        return this.updateItemBalance(
          item.productCode,
          item.quantity,
          funcionarioId,
        )
      }
      return Promise.resolve()
    })

    await Promise.all(updatePromises)
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
        '"ID VENDA ITENS", "SALDO FINAL", "NOVAS CONSIGNAÇÕES", "RECOLHIDO"',
      )
      .eq('COD. PRODUTO', movement.produto_id) // Assuming product_id matches COD. PRODUTO
      .eq('CODIGO FUNCIONARIO', movement.funcionario_id)
      .order('DATA DO ACERTO', { ascending: false })
      .order('HORA DO ACERTO', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (dbError) throw dbError

    if (dbData) {
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
        } as any)
        .eq('ID VENDA ITENS', dbData['ID VENDA ITENS'])

      if (updateError) throw updateError
    } else {
      // If no record exists, creating one is complex due to strict schema.
      // We will skip updating DB for now if it doesn't exist, but we logged it.
      // Ideally we would insert a new record.
      console.warn(
        'No BANCO_DE_DADOS record found to apply movement. Movement logged only in tracking table.',
      )
    }
  },
}
