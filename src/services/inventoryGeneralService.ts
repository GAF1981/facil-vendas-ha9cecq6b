import { supabase } from '@/lib/supabase/client'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
  InventoryMovementType,
} from '@/types/inventory_general'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'

export const inventoryGeneralService = {
  async getActiveSession(): Promise<InventoryGeneralSession | null> {
    const { data, error } = await supabase
      .from('ID Inventário')
      .select('*')
      .eq('status', 'ABERTO')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as InventoryGeneralSession | null
  },

  async startNewSession() {
    // 1. Close current open sessions
    await supabase
      .from('ID Inventário')
      .update({ status: 'FECHADO', data_fim: new Date().toISOString() })
      .eq('status', 'ABERTO')

    // 2. Create new session
    const { data: newSession, error } = await supabase
      .from('ID Inventário')
      .insert({ status: 'ABERTO', data_inicio: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error

    // 3. Initialize Balances from Previous Session
    // Fetch latest closed session
    const { data: lastSession } = await supabase
      .from('ID Inventário')
      .select('id')
      .eq('status', 'FECHADO')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastSession) {
      // Get previous final balances (actually 'Novo Saldo Final' which is effectively next initial)
      // Since we don't have a clean 'Final Balance' table that persists state,
      // we might need to rely on 'ESTOQUE GERAL AJUSTES' -> novo_saldo_final from previous session.
      const { data: prevBalances } = await supabase
        .from('ESTOQUE GERAL AJUSTES')
        .select('produto_id, novo_saldo_final')
        .eq('id_inventario', lastSession.id)

      if (prevBalances && prevBalances.length > 0) {
        // Fetch product details for richer initial balance record
        const { data: products } = await supabase
          .from('PRODUTOS')
          .select('ID, PREÇO, CODIGO, PRODUTO, CÓDIGO BARRAS')
          .in(
            'ID',
            prevBalances.map((p) => p.produto_id),
          )

        const productMap = new Map(products?.map((p) => [p.ID, p]))

        const initials = prevBalances
          .map((pb) => {
            const prod = productMap.get(pb.produto_id)
            if (!prod) return null
            return {
              id_inventario: newSession.id,
              produto_id: pb.produto_id,
              saldo_inicial: pb.novo_saldo_final,
              produto: prod.PRODUTO,
              preco: parseCurrency(prod.PREÇO),
              codigo_produto: prod.CODIGO,
              barcode: prod['CÓDIGO BARRAS'],
            }
          })
          .filter(Boolean)

        if (initials.length > 0) {
          await supabase.from('ESTOQUE GERAL SALDO INICIAL').insert(initials)
        }
      }
    }

    return newSession as InventoryGeneralSession
  },

  async resetInitialBalances(sessionId: number) {
    // Hard reset to 0 for current session
    // Or delete and re-insert 0s?
    // User story: "Sets SALDO INICIAL to 0 for all products in the current session"
    // We can update existing rows or insert 0s for all products.
    // Efficient way: Update existing to 0.
    await supabase
      .from('ESTOQUE GERAL SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_inventario', sessionId)
  },

  async getInventoryData(sessionId: number): Promise<InventoryGeneralItem[]> {
    // 1. Fetch Products
    const { data: products } = await productsService.getProducts(1, 10000) // All products
    if (!products) return []

    // 2. Fetch Movements
    const [
      initial,
      compras,
      carToStock,
      losses,
      stockToCar,
      counts,
      adjustments,
    ] = await Promise.all([
      supabase
        .from('ESTOQUE GERAL SALDO INICIAL')
        .select('produto_id, saldo_inicial')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL COMPRAS')
        .select('produto_id, compras_quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL SAÍDAS PERDAS')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL CONTAGEM')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL AJUSTES')
        .select('produto_id, ajuste_quantidade, novo_saldo_final')
        .eq('id_inventario', sessionId),
    ])

    // 3. Aggregate
    const agg = new Map<number, InventoryGeneralItem>()

    // Initialize with products
    products.forEach((p) => {
      agg.set(p.ID, {
        produto_id: p.ID,
        codigo: p.CODIGO,
        produto: p.PRODUTO || 'Desconhecido',
        tipo: p.TIPO,
        preco: parseCurrency(p.PREÇO),
        saldo_inicial: 0,
        compras: 0,
        carro_para_estoque: 0,
        saidas_perdas: 0,
        estoque_para_carro: 0,
        saldo_final: 0,
        contagem: 0,
        diferenca_qty: 0,
        diferenca_val: 0,
        ajustes: 0,
        novo_saldo_final: 0,
      })
    })

    // Helper to sum
    const sum = (
      data: any[],
      key: string,
      targetField: keyof InventoryGeneralItem,
    ) => {
      data?.forEach((row) => {
        const item = agg.get(row.produto_id)
        if (item) {
          ;(item[targetField] as number) += Number(row[key] || 0)
        }
      })
    }

    sum(initial.data || [], 'saldo_inicial', 'saldo_inicial')
    sum(compras.data || [], 'compras_quantidade', 'compras')
    sum(carToStock.data || [], 'quantidade', 'carro_para_estoque')
    sum(losses.data || [], 'quantidade', 'saidas_perdas')
    sum(stockToCar.data || [], 'quantidade', 'estoque_para_carro')
    // Contagem replaces, doesn't sum? Usually inventory count is absolute.
    // If multiple counts exist, maybe sum or take latest?
    // Let's assume sum for incremental counting, or map logic.
    // User story says "Quantity input... Saves data".
    // Let's sum counts.
    sum(counts.data || [], 'quantidade', 'contagem')
    sum(adjustments.data || [], 'ajuste_quantidade', 'ajustes')

    // Calculate derived fields
    return Array.from(agg.values()).map((item) => {
      item.saldo_final =
        item.saldo_inicial +
        item.compras +
        item.carro_para_estoque -
        item.saidas_perdas -
        item.estoque_para_carro

      item.diferenca_qty = item.saldo_final - item.contagem // Requirement: Saldo Final - Contagem
      item.diferenca_val = item.diferenca_qty * item.preco

      // Check if adjustments exist (finalized)
      const adj = adjustments.data?.find(
        (a) => a.produto_id === item.produto_id,
      )
      if (adj) {
        item.novo_saldo_final = adj.novo_saldo_final
      } else {
        item.novo_saldo_final = item.contagem + item.ajustes
      }

      return item
    })
  },

  async registerMovement(
    sessionId: number,
    type: InventoryMovementType,
    items: { productId: number; quantity: number; extra?: any }[],
  ) {
    if (items.length === 0) return

    if (type === 'COMPRA') {
      await supabase.from('ESTOQUE GERAL COMPRAS').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          compras_quantidade: i.quantity,
          fornecedor_id: i.extra?.fornecedorId,
          valor_unitario: i.extra?.valorUnitario,
        })),
      )
    } else if (type === 'CARRO_PARA_ESTOQUE') {
      await supabase.from('ESTOQUE GERAL CARRO PARA ESTOQUE').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
        })),
      )
    } else if (type === 'PERDA') {
      await supabase.from('ESTOQUE GERAL SAÍDAS PERDAS').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
          motivo: i.extra?.motivo,
        })),
      )
    } else if (type === 'ESTOQUE_PARA_CARRO') {
      await supabase.from('ESTOQUE GERAL ESTOQUE PARA CARRO').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
        })),
      )
    } else if (type === 'CONTAGEM') {
      await supabase.from('ESTOQUE GERAL CONTAGEM').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
        })),
      )
    }
  },

  async finalizeAdjustments(sessionId: number, items: InventoryGeneralItem[]) {
    // Save to ESTOQUE GERAL AJUSTES
    const adjustments = items.map((item) => ({
      id_inventario: sessionId,
      produto_id: item.produto_id,
      ajuste_quantidade: item.ajustes,
      diferenca_quantidade: item.diferenca_qty,
      diferenca_valor: item.diferenca_val,
      novo_saldo_final: item.novo_saldo_final,
    }))

    const { error } = await supabase
      .from('ESTOQUE GERAL AJUSTES')
      .insert(adjustments)

    if (error) throw error

    // Immediately trigger start new inventory logic
    await this.startNewSession()
  },
}
