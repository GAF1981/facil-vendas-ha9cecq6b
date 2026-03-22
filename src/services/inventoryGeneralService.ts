import { supabase } from '@/lib/supabase/client'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
  InventoryMovementType,
  InventoryReportMetrics,
} from '@/types/inventory_general'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'
import { estoqueCarroService } from '@/services/estoqueCarroService'

export const inventoryGeneralService = {
  async getSessions(): Promise<InventoryGeneralSession[]> {
    const { data, error } = await supabase
      .from('ID Inventário')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as InventoryGeneralSession[]
  },

  async startNewSession(): Promise<InventoryGeneralSession> {
    const { data, error } = await supabase.rpc('start_new_inventory_session')

    if (error) {
      console.error('Error starting new session:', error)
      throw error
    }

    return data as unknown as InventoryGeneralSession
  },

  async resetInitialBalances(sessionId: number) {
    await supabase
      .from('ESTOQUE GERAL SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_inventario', sessionId)
  },

  async getInventoryData(sessionId: number): Promise<InventoryGeneralItem[]> {
    const { data: products } = await productsService.getProducts(1, 10000)
    if (!products) return []

    const { data: employees } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')
    const employeeMap = new Map(
      employees?.map((e) => [e.id, e.nome_completo]) || [],
    )

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
        .select('produto_id, quantidade, created_at, funcionario_id')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL SAÍDAS PERDAS')
        .select('produto_id, quantidade')
        .eq('id_inventario', sessionId),
      supabase
        .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
        .select('produto_id, quantidade, created_at, funcionario_id')
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

    const countedProductIds = new Set(counts.data?.map((c) => c.produto_id))

    const agg = new Map<number, InventoryGeneralItem>()

    products.forEach((p) => {
      agg.set(p.ID, {
        produto_id: p.ID,
        codigo: p.CODIGO,
        barcode: p['CÓDIGO BARRAS'],
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
        has_count_record: countedProductIds.has(p.ID),
        is_mandatory: false,
        details_carro_para_estoque: [],
        details_estoque_para_carro: [],
      })
    })

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

    carToStock.data?.forEach((row) => {
      const item = agg.get(row.produto_id)
      if (item) {
        item.carro_para_estoque += Number(row.quantidade || 0)
        item.details_carro_para_estoque.push({
          date: row.created_at,
          quantity: Number(row.quantidade),
          employeeName:
            employeeMap.get(row.funcionario_id) ||
            (row.funcionario_id ? 'Desconhecido' : 'Não Informado'),
        })
      }
    })

    sum(losses.data || [], 'quantidade', 'saidas_perdas')

    stockToCar.data?.forEach((row) => {
      const item = agg.get(row.produto_id)
      if (item) {
        item.estoque_para_carro += Number(row.quantidade || 0)
        item.details_estoque_para_carro.push({
          date: row.created_at,
          quantity: Number(row.quantidade),
          employeeName:
            employeeMap.get(row.funcionario_id) ||
            (row.funcionario_id ? 'Desconhecido' : 'Não Informado'),
        })
      }
    })

    sum(counts.data || [], 'quantidade', 'contagem')
    sum(adjustments.data || [], 'ajuste_quantidade', 'ajustes')

    return Array.from(agg.values()).map((item) => {
      item.saldo_final =
        item.saldo_inicial +
        item.compras +
        item.carro_para_estoque -
        item.saidas_perdas -
        item.estoque_para_carro

      item.is_mandatory =
        item.saldo_final > 0 ||
        item.compras > 0 ||
        item.carro_para_estoque > 0 ||
        item.saidas_perdas > 0 ||
        item.estoque_para_carro > 0

      item.diferenca_qty = item.contagem - item.saldo_final
      item.diferenca_val = item.diferenca_qty * item.preco

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

  async getMovementDetails(sessionId: number, productId: number) {
    const [compras, carToStock, stockToCar, perdas, contagens] =
      await Promise.all([
        supabase
          .from('ESTOQUE GERAL COMPRAS')
          .select('*')
          .eq('id_inventario', sessionId)
          .eq('produto_id', productId),
        supabase
          .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
          .select('*')
          .eq('id_inventario', sessionId)
          .eq('produto_id', productId),
        supabase
          .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
          .select('*')
          .eq('id_inventario', sessionId)
          .eq('produto_id', productId),
        supabase
          .from('ESTOQUE GERAL SAÍDAS PERDAS')
          .select('*')
          .eq('id_inventario', sessionId)
          .eq('produto_id', productId),
        supabase
          .from('ESTOQUE GERAL CONTAGEM')
          .select('*')
          .eq('id_inventario', sessionId)
          .eq('produto_id', productId),
      ])

    const format = (data: any[], type: string, qtyField: string) =>
      (data || []).map((d) => ({
        id: d.id,
        movement_type: type,
        data_horario: d.created_at,
        quantidade: d[qtyField] || 0,
        pedido: sessionId,
      }))

    return [
      ...format(compras.data, 'compra', 'compras_quantidade'),
      ...format(carToStock.data, 'devolucao_carro', 'quantidade'),
      ...format(stockToCar.data, 'reposicao_carro', 'quantidade'),
      ...format(perdas.data, 'perda', 'quantidade'),
      ...format(contagens.data, 'contagem', 'quantidade'),
    ].sort(
      (a, b) =>
        new Date(b.data_horario).getTime() - new Date(a.data_horario).getTime(),
    )
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
    } else if (type === 'PERDA') {
      await supabase.from('ESTOQUE GERAL SAÍDAS PERDAS').insert(
        items.map((i) => ({
          id_inventario: sessionId,
          produto_id: i.productId,
          quantidade: i.quantity,
          motivo: i.extra?.motivo,
        })),
      )
    } else if (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') {
      const employeeId = items[0]?.extra?.funcionarioId
      if (!employeeId) throw new Error('Funcionário não informado.')

      const activeSession =
        await estoqueCarroService.getActiveSession(employeeId)
      if (!activeSession) {
        throw new Error(
          'Não é possível registrar movimentação: O funcionário não possui um ID ESTOQUE CARRO ativo.',
        )
      }

      if (type === 'CARRO_PARA_ESTOQUE') {
        await supabase.from('ESTOQUE GERAL CARRO PARA ESTOQUE').insert(
          items.map((i) => ({
            id_inventario: sessionId,
            produto_id: i.productId,
            quantidade: i.quantity,
            funcionario_id: i.extra?.funcionarioId,
          })),
        )
      } else {
        await supabase.from('ESTOQUE GERAL ESTOQUE PARA CARRO').insert(
          items.map((i) => ({
            id_inventario: sessionId,
            produto_id: i.productId,
            quantidade: i.quantity,
            funcionario_id: i.extra?.funcionarioId,
          })),
        )
      }

      const { data: datasInvData, error: datasInvError } = await supabase
        .from('DATAS DE INVENTÁRIO')
        .select('"ID INVENTÁRIO"')
        .is('"Data de Fechamento de Inventário"', null)
        .order('"Data de Início de Inventário"', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (datasInvError) {
        console.error('Error fetching DATAS DE INVENTÁRIO:', datasInvError)
        throw new Error('Erro ao verificar sessão de inventário ativa.')
      }

      if (!datasInvData) {
        throw new Error(
          'Não foi possível identificar uma sessão de inventário ativa. Verifique se o inventário foi iniciado.',
        )
      }

      const datasInvId = datasInvData['ID INVENTÁRIO']

      const repoItems = items.map((i) => ({
        session_id: datasInvId,
        id_estoque_carro: activeSession.id,
        funcionario_id: i.extra?.funcionarioId,
        produto_id: i.productId,
        quantidade: i.quantity,
        TIPO: type === 'ESTOQUE_PARA_CARRO' ? 'REPOSICAO' : 'DEVOLUCAO',
      }))

      const { error: repoError } = await supabase
        .from('REPOSIÇÃO E DEVOLUÇÃO')
        .insert(repoItems as any)

      if (repoError) {
        console.error('Error syncing to REPOSIÇÃO E DEVOLUÇÃO:', repoError)
        throw repoError
      }
    } else if (type === 'CONTAGEM') {
      for (const item of items) {
        const { error } = await supabase.from('ESTOQUE GERAL CONTAGEM').insert({
          id_inventario: sessionId,
          produto_id: item.productId,
          quantidade: item.quantity,
        })
        if (error) throw error

        const { data: cefRecord } = await supabase
          .from('CONTAGEM DE ESTOQUE FINAL' as any)
          .select('id, quantidade')
          .eq('session_id', sessionId)
          .eq('produto_id', item.productId)
          .maybeSingle()

        if (cefRecord) {
          await supabase
            .from('CONTAGEM DE ESTOQUE FINAL' as any)
            .update({
              quantidade:
                Number(cefRecord.quantidade || 0) + Number(item.quantity),
            })
            .eq('id', cefRecord.id)
        } else {
          await supabase.from('CONTAGEM DE ESTOQUE FINAL' as any).insert({
            session_id: sessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
          })
        }
      }
    }
  },

  async updateMovementQty(
    id: number,
    movementType: string,
    newQuantity: number,
    sessionId: number,
    productId: number,
  ) {
    if (movementType === 'contagem') {
      return this.updateCount(id, newQuantity, sessionId, productId)
    }

    let table = ''
    let qtyField = 'quantidade'
    if (movementType === 'compra') {
      table = 'ESTOQUE GERAL COMPRAS'
      qtyField = 'compras_quantidade'
    } else if (movementType === 'devolucao_carro') {
      table = 'ESTOQUE GERAL CARRO PARA ESTOQUE'
    } else if (movementType === 'reposicao_carro') {
      table = 'ESTOQUE GERAL ESTOQUE PARA CARRO'
    } else if (movementType === 'perda') {
      table = 'ESTOQUE GERAL SAÍDAS PERDAS'
    }

    if (table) {
      const { error } = await supabase
        .from(table as any)
        .update({ [qtyField]: newQuantity })
        .eq('id', id)
      if (error) throw error
    }
  },

  async deleteMovementRecord(
    id: number,
    movementType: string,
    sessionId: number,
    productId: number,
  ) {
    if (movementType === 'contagem') {
      return this.deleteCount(id, sessionId, productId)
    }

    let table = ''
    if (movementType === 'compra') {
      table = 'ESTOQUE GERAL COMPRAS'
    } else if (movementType === 'devolucao_carro') {
      table = 'ESTOQUE GERAL CARRO PARA ESTOQUE'
    } else if (movementType === 'reposicao_carro') {
      table = 'ESTOQUE GERAL ESTOQUE PARA CARRO'
    } else if (movementType === 'perda') {
      table = 'ESTOQUE GERAL SAÍDAS PERDAS'
    }

    if (table) {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id)
      if (error) throw error
    }
  },

  async updateCount(
    countId: number,
    newQuantity: number,
    sessionId: number,
    productId: number,
  ) {
    const { data: existing } = await supabase
      .from('ESTOQUE GERAL CONTAGEM')
      .select('quantidade')
      .eq('id', countId)
      .single()
    if (!existing) return

    const oldQty = existing.quantidade || 0
    const diff = newQuantity - oldQty

    const { error } = await supabase
      .from('ESTOQUE GERAL CONTAGEM')
      .update({ quantidade: newQuantity })
      .eq('id', countId)
    if (error) throw error

    if (diff !== 0) {
      const { data: cefRecord } = await supabase
        .from('CONTAGEM DE ESTOQUE FINAL' as any)
        .select('id, quantidade')
        .eq('session_id', sessionId)
        .eq('produto_id', productId)
        .maybeSingle()

      if (cefRecord) {
        await supabase
          .from('CONTAGEM DE ESTOQUE FINAL' as any)
          .update({
            quantidade: Number(cefRecord.quantidade || 0) + diff,
          })
          .eq('id', cefRecord.id)
      }
    }
  },

  async deleteCount(countId: number, sessionId: number, productId: number) {
    const { data: existing } = await supabase
      .from('ESTOQUE GERAL CONTAGEM')
      .select('quantidade')
      .eq('id', countId)
      .single()
    if (!existing) return

    const oldQty = existing.quantidade || 0

    const { error } = await supabase
      .from('ESTOQUE GERAL CONTAGEM')
      .delete()
      .eq('id', countId)
    if (error) throw error

    if (oldQty !== 0) {
      const { data: cefRecord } = await supabase
        .from('CONTAGEM DE ESTOQUE FINAL' as any)
        .select('id, quantidade')
        .eq('session_id', sessionId)
        .eq('produto_id', productId)
        .maybeSingle()

      if (cefRecord) {
        await supabase
          .from('CONTAGEM DE ESTOQUE FINAL' as any)
          .update({
            quantidade: Number(cefRecord.quantidade || 0) - oldQty,
          })
          .eq('id', cefRecord.id)
      }
    }
  },

  async updateItemQuantity(
    sessionId: number,
    productId: number,
    type:
      | 'COMPRA'
      | 'CARRO_PARA_ESTOQUE'
      | 'PERDA'
      | 'ESTOQUE_PARA_CARRO'
      | 'CONTAGEM',
    newQuantity: number,
  ) {
    let table = ''
    let qtyField = ''

    switch (type) {
      case 'COMPRA':
        table = 'ESTOQUE GERAL COMPRAS'
        qtyField = 'compras_quantidade'
        break
      case 'CARRO_PARA_ESTOQUE':
        table = 'ESTOQUE GERAL CARRO PARA ESTOQUE'
        qtyField = 'quantidade'
        break
      case 'PERDA':
        table = 'ESTOQUE GERAL SAÍDAS PERDAS'
        qtyField = 'quantidade'
        break
      case 'ESTOQUE_PARA_CARRO':
        table = 'ESTOQUE GERAL ESTOQUE PARA CARRO'
        qtyField = 'quantidade'
        break
      case 'CONTAGEM':
        table = 'ESTOQUE GERAL CONTAGEM'
        qtyField = 'quantidade'
        break
    }

    const { data: existing } = await supabase
      .from(table)
      .select('*')
      .eq('id_inventario', sessionId)
      .eq('produto_id', productId)
      .limit(1)
      .maybeSingle()

    await supabase
      .from(table)
      .delete()
      .eq('id_inventario', sessionId)
      .eq('produto_id', productId)

    if (newQuantity > 0 || type === 'CONTAGEM') {
      const insertData: any = {
        id_inventario: sessionId,
        produto_id: productId,
        [qtyField]: newQuantity,
      }

      if (existing) {
        if ('fornecedor_id' in existing)
          insertData.fornecedor_id = existing.fornecedor_id
        if ('funcionario_id' in existing)
          insertData.funcionario_id = existing.funcionario_id
        if ('motivo' in existing) insertData.motivo = existing.motivo
        if ('valor_unitario' in existing)
          insertData.valor_unitario = existing.valor_unitario
      }

      await supabase.from(table).insert(insertData)
    }
  },

  async finalizeAdjustments(sessionId: number, items: InventoryGeneralItem[]) {
    const adjustments = items.map((item) => ({
      id_inventario: sessionId,
      produto_id: item.produto_id,
      ajuste_quantidade: 0,
      diferenca_quantidade: item.diferenca_qty,
      diferenca_valor: item.diferenca_val,
      novo_saldo_final: item.novo_saldo_final,
    }))

    await supabase
      .from('ESTOQUE GERAL AJUSTES')
      .delete()
      .eq('id_inventario', sessionId)

    const batchSize = 1000
    for (let i = 0; i < adjustments.length; i += batchSize) {
      const { error } = await supabase
        .from('ESTOQUE GERAL AJUSTES')
        .insert(adjustments.slice(i, i + batchSize))
      if (error) throw error
    }

    await this.startNewSession()
  },

  async getReportMetrics(sessionId: number): Promise<InventoryReportMetrics> {
    const { data: adjustments } = await supabase
      .from('ESTOQUE GERAL AJUSTES')
      .select('diferenca_quantidade, diferenca_valor')
      .eq('id_inventario', sessionId)

    const { data: compras } = await supabase
      .from('ESTOQUE GERAL COMPRAS')
      .select('compras_quantidade, valor_unitario')
      .eq('id_inventario', sessionId)

    const diferencas = adjustments?.reduce(
      (acc, curr) => ({
        quantidade: acc.quantidade + (curr.diferenca_quantidade || 0),
        valor: acc.valor + (curr.diferenca_valor || 0),
      }),
      { quantidade: 0, valor: 0 },
    ) || { quantidade: 0, valor: 0 }

    const comprasMetrics = compras?.reduce(
      (acc, curr) => ({
        total_qty: acc.total_qty + (curr.compras_quantidade || 0),
        total_value:
          acc.total_value +
          (curr.compras_quantidade || 0) * (curr.valor_unitario || 0),
      }),
      { total_qty: 0, total_value: 0 },
    ) || { total_qty: 0, total_value: 0 }

    const preco_medio =
      comprasMetrics.total_qty > 0
        ? comprasMetrics.total_value / comprasMetrics.total_qty
        : 0

    return {
      diferencas,
      compras: {
        total_quantidade: comprasMetrics.total_qty,
        preco_medio,
      },
    }
  },
}
