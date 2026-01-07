import { supabase } from '@/lib/supabase/client'
import { EstoqueCarroItem, EstoqueCarroSession } from '@/types/estoque_carro'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'

export const estoqueCarroService = {
  async getActiveSession(funcionarioId: number) {
    const { data, error } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as EstoqueCarroSession | null
  },

  async getLastSession(funcionarioId: number) {
    const { data, error } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .not('data_fim', 'is', null)
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as EstoqueCarroSession | null
  },

  async startSession(funcionarioId: number) {
    // 1. Get last session to copy final balance
    const lastSession = await this.getLastSession(funcionarioId)

    // 2. Create new session
    const { data: newSession, error: sessionError } = await supabase
      .from('ID ESTOQUE CARRO')
      .insert({
        funcionario_id: funcionarioId,
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    // 3. Populate Initial Balance
    // If previous session exists, use its final balance. Otherwise 0.
    const { data: products } = await productsService.getProducts(1, 10000)
    const productsList = products || []

    let previousBalances = new Map<number, number>()
    if (lastSession) {
      const { data: prevData } = await supabase
        .from('ESTOQUE CARRO SALDO FINAL')
        .select('produto_id, saldo_final')
        .eq('id_estoque_carro', lastSession.id)

      prevData?.forEach((p) =>
        previousBalances.set(p.produto_id, p.saldo_final),
      )
    }

    const initBalances = productsList.map((p) => ({
      id_estoque_carro: newSession.id,
      produto_id: p.ID,
      codigo_produto: p.CODIGO,
      produto: p.PRODUTO,
      preco: parseCurrency(p.PREÇO),
      saldo_inicial: previousBalances.get(p.ID) || 0,
      funcionario_id: funcionarioId,
    }))

    if (initBalances.length > 0) {
      const { error: initError } = await supabase
        .from('ESTOQUE CARRO SALDO INICIAL')
        .insert(initBalances)
      if (initError) throw initError
    }

    return newSession
  },

  async getSessionData(
    session: EstoqueCarroSession,
  ): Promise<EstoqueCarroItem[]> {
    const sessionId = session.id
    const funcionarioId = session.funcionario_id
    const startDate = session.data_inicio
    const endDate = session.data_fim || new Date().toISOString()

    // 1. Fetch Products
    const { data: products } = await productsService.getProducts(1, 10000)
    if (!products) return []

    // 2. Fetch Initial Balances
    const { data: initialBalances } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .select('produto_id, saldo_inicial')
      .eq('id_estoque_carro', sessionId)

    const initialMap = new Map<number, number>()
    initialBalances?.forEach((i) =>
      initialMap.set(i.produto_id, i.saldo_inicial),
    )

    // 3. Fetch Movements (Calculated)
    // 3a. Client -> Car (RECOLHIDO)
    // 3b. Car -> Client (NOVAS CONSIGNAÇÕES)
    const { data: dbData } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"COD. PRODUTO", "RECOLHIDO", "NOVAS CONSIGNAÇÕES"')
      .eq('"CODIGO FUNCIONARIO"', funcionarioId)
      .gte('"DATA DO ACERTO"', startDate.split('T')[0])
      .lte('"DATA DO ACERTO"', endDate.split('T')[0])

    const clientToCarMap = new Map<number, number>()
    const carToClientMap = new Map<number, number>()

    dbData?.forEach((row: any) => {
      const prodCode = row['COD. PRODUTO']
      if (!prodCode) return

      const recolhido = parseCurrency(row['RECOLHIDO'])
      const novas = parseCurrency(row['NOVAS CONSIGNAÇÕES'])

      if (recolhido > 0) {
        // Need to map Code -> ID. Products service returns ID and CODE.
        // We'll do mapping later. For now store by Code if DB uses Code?
        // Actually DB uses COD. PRODUTO which is the internal code.
        // We need to map code to ID.
      }
    })

    // Helper map: Code -> ID
    const codeToIdMap = new Map<number, number>()
    products.forEach((p) => {
      if (p.CODIGO) codeToIdMap.set(p.CODIGO, p.ID)
    })

    dbData?.forEach((row: any) => {
      const prodCode = row['COD. PRODUTO']
      const prodId = codeToIdMap.get(prodCode)
      if (!prodId) return

      const recolhido = parseCurrency(row['RECOLHIDO'])
      const novas = parseCurrency(row['NOVAS CONSIGNAÇÕES'])

      clientToCarMap.set(prodId, (clientToCarMap.get(prodId) || 0) + recolhido)
      carToClientMap.set(prodId, (carToClientMap.get(prodId) || 0) + novas)
    })

    // 3c. Stock -> Car (ESTOQUE GERAL ESTOQUE PARA CARRO)
    const { data: stockToCarData } = await supabase
      .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
      .select('produto_id, quantidade')
      .eq('funcionario_id', funcionarioId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const stockToCarMap = new Map<number, number>()
    stockToCarData?.forEach((row) => {
      if (row.produto_id)
        stockToCarMap.set(
          row.produto_id,
          (stockToCarMap.get(row.produto_id) || 0) + (row.quantidade || 0),
        )
    })

    // 3d. Car -> Stock (ESTOQUE GERAL CARRO PARA ESTOQUE)
    const { data: carToStockData } = await supabase
      .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
      .select('produto_id, quantidade')
      .eq('funcionario_id', funcionarioId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const carToStockMap = new Map<number, number>()
    carToStockData?.forEach((row) => {
      if (row.produto_id)
        carToStockMap.set(
          row.produto_id,
          (carToStockMap.get(row.produto_id) || 0) + (row.quantidade || 0),
        )
    })

    // 4. Fetch Counts and Adjustments
    const { data: counts } = await supabase
      .from('ESTOQUE CARRO CONTAGEM')
      .select('produto_id, quantidade')
      .eq('id_estoque_carro', sessionId)

    const countMap = new Map<number, number>()
    counts?.forEach((c) => countMap.set(c.produto_id, c.quantidade))

    const { data: adjustments } = await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .select('produto_id, ajuste_manual')
      .eq('id_estoque_carro', sessionId)

    const adjustmentMap = new Map<number, number>()
    adjustments?.forEach((a) =>
      adjustmentMap.set(a.produto_id, a.ajuste_manual),
    )

    // Build Result
    return products.map((p) => {
      const initial = initialMap.get(p.ID) || 0
      const inClient = clientToCarMap.get(p.ID) || 0
      const inStock = stockToCarMap.get(p.ID) || 0
      const outClient = carToClientMap.get(p.ID) || 0
      const outStock = carToStockMap.get(p.ID) || 0

      const saldoFinal = initial + inClient + inStock - outClient - outStock
      const contagem = countMap.get(p.ID) || 0

      const diffQtd = saldoFinal - contagem // Or Contagem - Saldo Final? Usually Diff = Physical - System.
      // Acceptance Criteria says: "DIFERENÇA DE ESTOQUE (quantidade): (SALDO FINAL - CONTAGEM)"
      // Okay, following criteria exactly.
      const diffQtdCrit = saldoFinal - contagem
      const diffVal = diffQtdCrit * parseCurrency(p.PREÇO)

      const ajuste = adjustmentMap.get(p.ID) || 0
      const novoSaldo = contagem + ajuste

      return {
        produto_id: p.ID,
        codigo: p.CODIGO,
        produto: p.PRODUTO || 'Desconhecido',
        tipo: p.TIPO,
        preco: parseCurrency(p.PREÇO),
        saldo_inicial: initial,
        entradas_cliente: inClient,
        entradas_estoque: inStock,
        saidas_cliente: outClient,
        saidas_estoque: outStock,
        saldo_final: saldoFinal,
        contagem: contagem,
        diferenca_qtd: diffQtdCrit,
        diferenca_val: diffVal,
        ajustes: ajuste,
        novo_saldo: novoSaldo,
      }
    })
  },

  async resetInitialBalance(sessionId: number) {
    const { error } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_estoque_carro', sessionId)

    if (error) throw error
  },

  async saveCount(sessionId: number, productId: number, quantity: number) {
    // Upsert count
    const { error } = await supabase.from('ESTOQUE CARRO CONTAGEM').upsert(
      {
        id_estoque_carro: sessionId,
        produto_id: productId,
        quantidade: quantity,
      },
      { onConflict: 'id_estoque_carro, produto_id' },
    ) // Assuming unique constraint or logic allows upsert

    // If constraint missing, delete then insert
    if (error) {
      await supabase
        .from('ESTOQUE CARRO CONTAGEM')
        .delete()
        .eq('id_estoque_carro', sessionId)
        .eq('produto_id', productId)
      await supabase.from('ESTOQUE CARRO CONTAGEM').insert({
        id_estoque_carro: sessionId,
        produto_id: productId,
        quantidade: quantity,
      })
    }
  },

  async saveAdjustment(sessionId: number, productId: number, ajuste: number) {
    // Simplified logic, similar to count
    await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .delete()
      .eq('id_estoque_carro', sessionId)
      .eq('produto_id', productId)
    await supabase.from('ESTOQUE CARRO AJUSTES').insert({
      id_estoque_carro: sessionId,
      produto_id: productId,
      ajuste_manual: ajuste,
    })
  },

  async finishSession(session: EstoqueCarroSession, items: EstoqueCarroItem[]) {
    // 1. Save Final Balances
    const finalBalances = items.map((item) => ({
      id_estoque_carro: session.id,
      produto_id: item.produto_id,
      saldo_final: item.novo_saldo, // Is "Novo Saldo" the final one for history? Yes.
      funcionario_id: session.funcionario_id,
      codigo_produto: item.codigo,
      produto: item.produto,
      preco: item.preco,
    }))

    await supabase
      .from('ESTOQUE CARRO SALDO FINAL')
      .delete()
      .eq('id_estoque_carro', session.id)
    await supabase.from('ESTOQUE CARRO SALDO FINAL').insert(finalBalances)

    // 2. Save Differences / Adjustments Snapshot
    const adjustments = items.map((item) => ({
      id_estoque_carro: session.id,
      produto_id: item.produto_id,
      diferenca_quantidade: item.diferenca_qtd,
      diferenca_valor: item.diferenca_val,
      ajuste_manual: item.ajustes,
      novo_saldo: item.novo_saldo,
    }))

    await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .delete()
      .eq('id_estoque_carro', session.id)
    await supabase.from('ESTOQUE CARRO AJUSTES').insert(adjustments)

    // 3. Close Session
    await supabase
      .from('ID ESTOQUE CARRO')
      .update({ data_fim: new Date().toISOString() })
      .eq('id', session.id)

    // 4. Start New Session immediately
    await this.startSession(session.funcionario_id)
  },
}
