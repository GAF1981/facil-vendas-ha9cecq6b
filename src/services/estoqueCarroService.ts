import { supabase } from '@/lib/supabase/client'
import { EstoqueCarroItem, EstoqueCarroSession } from '@/types/estoque_carro'
import { productsService } from './productsService'
import { parseCurrency } from '@/lib/formatters'
import { parseISO, isAfter, isBefore } from 'date-fns'
import {
  DeliveryHistoryRow,
  DeliveryHistoryFilter,
} from '@/types/delivery_history'
import { AcertoItem } from '@/types/acerto'

export const estoqueCarroService = {
  async getSessions(funcionarioId: number) {
    const { data, error } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .order('data_inicio', { ascending: false })
      .limit(100)

    if (error) throw error
    return data as EstoqueCarroSession[]
  },

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
    const lastSession = await this.getLastSession(funcionarioId)

    const { data: newSession, error: sessionError } = await supabase
      .from('ID ESTOQUE CARRO')
      .insert({
        funcionario_id: funcionarioId,
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (sessionError) throw sessionError

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

    const { data: products } = await productsService.getProducts(1, 10000)
    if (!products) return []

    const { data: initialBalances } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .select('produto_id, saldo_inicial')
      .eq('id_estoque_carro', sessionId)

    const initialMap = new Map<number, number>()
    initialBalances?.forEach((i) =>
      initialMap.set(i.produto_id, i.saldo_inicial),
    )

    const { data: clientToCarData } = await supabase
      .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
      .select('produto_id, ENTRADAS_cliente_carro')
      .eq('id_estoque_carro', sessionId)

    const clientToCarMap = new Map<number, number>()
    clientToCarData?.forEach((row) => {
      if (row.produto_id)
        clientToCarMap.set(
          row.produto_id,
          (clientToCarMap.get(row.produto_id) || 0) +
            (row.ENTRADAS_cliente_carro || 0),
        )
    })

    const { data: carToClientData } = await supabase
      .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
      .select('produto_id, SAIDAS_carro_cliente')
      .eq('id_estoque_carro', sessionId)

    const carToClientMap = new Map<number, number>()
    carToClientData?.forEach((row) => {
      if (row.produto_id)
        carToClientMap.set(
          row.produto_id,
          (carToClientMap.get(row.produto_id) || 0) +
            (row.SAIDAS_carro_cliente || 0),
        )
    })

    const { data: repoData } = await supabase
      .from('REPOSIÇÃO E DEVOLUÇÃO')
      .select('produto_id, quantidade, TIPO, created_at')
      .eq('id_estoque_carro', sessionId)

    const stockToCarMap = new Map<number, number>()
    const carToStockMap = new Map<number, number>()

    repoData?.forEach((row) => {
      if (!row.produto_id) return

      if (row.TIPO === 'REPOSIÇÃO' || row.TIPO === 'REPOSICAO') {
        stockToCarMap.set(
          row.produto_id,
          (stockToCarMap.get(row.produto_id) || 0) + row.quantidade,
        )
      } else if (row.TIPO === 'DEVOLUÇÃO' || row.TIPO === 'DEVOLUCAO') {
        carToStockMap.set(
          row.produto_id,
          (carToStockMap.get(row.produto_id) || 0) + row.quantidade,
        )
      }
    })

    const { data: counts } = await supabase
      .from('ESTOQUE CARRO CONTAGEM')
      .select('produto_id, quantidade')
      .eq('id_estoque_carro', sessionId)

    const countMap = new Map<number, number>()
    const hasCountMap = new Set<number>()
    counts?.forEach((c) => {
      countMap.set(c.produto_id, (countMap.get(c.produto_id) || 0) + (c.quantidade || 0))
      hasCountMap.add(c.produto_id)
    })

    const { data: adjustments } = await supabase
      .from('ESTOQUE CARRO AJUSTES')
      .select('produto_id, ajuste_manual')
      .eq('id_estoque_carro', sessionId)

    const adjustmentMap = new Map<number, number>()
    adjustments?.forEach((a) =>
      adjustmentMap.set(a.produto_id, a.ajuste_manual),
    )

    return products.map((p) => {
      const initial = initialMap.get(p.ID) || 0
      const inClient = clientToCarMap.get(p.ID) || 0
      const inStock = stockToCarMap.get(p.ID) || 0
      const outClient = carToClientMap.get(p.ID) || 0
      const outStock = carToStockMap.get(p.ID) || 0

      const saldoFinal = initial + inClient + inStock - outClient - outStock
      const contagem = countMap.get(p.ID) || 0

      const diffQtdCrit = saldoFinal - contagem
      const diffVal = diffQtdCrit * parseCurrency(p.PREÇO)

      const ajuste = adjustmentMap.get(p.ID) || 0
      const novoSaldo = contagem + ajuste

      return {
        id_estoque_carro: sessionId,
        produto_id: p.ID,
        codigo: p.CODIGO,
        barcode: p['CÓDIGO BARRAS'],
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
        has_count_record: hasCountMap.has(p.ID),
      }
    })
  },

  async getMovementDetails(sessionId: number, productId: number) {
    const fetchTable = async (table: string, type: string, qtyField: string) => {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('id_estoque_carro', sessionId)
        .eq('produto_id', productId)
      return (data || []).map((d) => ({
        id: d.id,
        movement_type: type,
        data_horario: d.created_at || d.data_horario || d.timestamp,
        quantidade: d[qtyField] || d.quantidade || 0,
        pedido: d.pedido || sessionId
      }))
    }

    const clientToCar = await fetchTable('ESTOQUE CARRO: CLIENTE PARA O CARRO', 'ENTRADAS_cliente_carro', 'ENTRADAS_cliente_carro')
    const carToClient = await fetchTable('ESTOQUE CARRO: CARRO PARA O CLIENTE', 'SAIDAS_carro_cliente', 'SAIDAS_carro_cliente')

    const { data: repoData } = await supabase
      .from('REPOSIÇÃO E DEVOLUÇÃO')
      .select('*')
      .eq('id_estoque_carro', sessionId)
      .eq('produto_id', productId)

    const inventoryMovements = (repoData || []).map((d) => {
      const isReposicao = d.TIPO === 'REPOSIÇÃO' || d.TIPO === 'REPOSICAO'
      const typeKey = isReposicao ? 'ENTRADAS_estoque_carro' : 'SAIDAS_carro_estoque'
      return {
        id: d.id,
        movement_type: typeKey,
        data_horario: d.created_at,
        quantidade: d.quantidade,
        pedido: sessionId
      }
    })

    const contagens = await fetchTable('ESTOQUE CARRO CONTAGEM', 'contagem', 'quantidade')

    return [...clientToCar, ...carToClient, ...inventoryMovements, ...contagens].sort(
      (a, b) => new Date(b.data_horario).getTime() - new Date(a.data_horario).getTime(),
    )
  },

  async syncStockFromSettlement(
    employeeId: number,
    employeeName: string,
    settlementDate: Date,
    orderId: number,
    items: AcertoItem[],
  ) {
    const { data: sessions, error: sessionError } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('funcionario_id', employeeId)
      .lte('data_inicio', settlementDate.toISOString())
      .order('data_inicio', { ascending: false })
      .limit(5)

    if (sessionError) {
      console.error('Error finding stock session:', sessionError)
      return
    }

    const validSession = sessions?.find((s) => {
      if (!s.data_fim) return true
      return parseISO(s.data_fim) >= settlementDate
    })

    if (!validSession) {
      console.warn(
        `No valid stock session found for employee ${employeeId} at ${settlementDate.toISOString()}. Stock movement skipped.`,
      )
      return
    }

    const sessionId = validSession.id
    const timestampStr = settlementDate.toISOString()

    const productIds = items.map((i) => i.produtoId)
    if (productIds.length === 0) return

    const { data: products } = await supabase
      .from('PRODUTOS')
      .select('ID, "CÓDIGO BARRAS"')
      .in('ID', productIds)

    const barcodeMap = new Map<number, string>()
    products?.forEach((p) => {
      if (p['CÓDIGO BARRAS']) {
        barcodeMap.set(p.ID, String(p['CÓDIGO BARRAS']))
      }
    })

    const carToClientInserts: any[] = []
    const clientToCarInserts: any[] = []

    for (const item of items) {
      const diff = item.saldoFinal - item.contagem
      const absDiff = Math.abs(diff)

      if (absDiff === 0) continue

      const payload = {
        id_estoque_carro: sessionId,
        produto_id: item.produtoId,
        quantidade: absDiff,
        pedido: orderId,
        data_horario: timestampStr,
        created_at: timestampStr,
        funcionario: employeeName,
        codigo_produto: item.produtoCodigo,
        barcode: barcodeMap.get(item.produtoId) || null,
        produto: item.produtoNome,
        preco: item.precoUnitario,
      }

      if (diff > 0) {
        carToClientInserts.push({
          ...payload,
          SAIDAS_carro_cliente: absDiff,
        })
      } else {
        clientToCarInserts.push({
          ...payload,
          ENTRADAS_cliente_carro: absDiff,
        })
      }
    }

    if (carToClientInserts.length > 0) {
      const { error } = await supabase
        .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
        .insert(carToClientInserts)
      if (error) console.error('Error inserting car->client movements:', error)
    }

    if (clientToCarInserts.length > 0) {
      const { error } = await supabase
        .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
        .insert(clientToCarInserts)
      if (error) console.error('Error inserting client->car movements:', error)
    }
  },

  async updateStockMovements(sessionId: number, employeeId: number) {
    const { data: targetSession, error: sessError } = await supabase
      .from('ID ESTOQUE CARRO')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessError || !targetSession) throw new Error('Session not found')

    const startDate = parseISO(targetSession.data_inicio)
    const endDate = targetSession.data_fim
      ? parseISO(targetSession.data_fim)
      : null

    const { data: employeeData } = await supabase
      .from('FUNCIONARIOS')
      .select('nome_completo')
      .eq('id', employeeId)
      .single()
    const employeeName = employeeData?.nome_completo || 'Unknown'

    await Promise.all([
      supabase
        .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
        .delete()
        .eq('id_estoque_carro', sessionId),
      supabase
        .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
        .delete()
        .eq('id_estoque_carro', sessionId),
    ])

    const { data: products } = await productsService.getProducts(1, 10000)
    const productsMap = new Map(products?.map((p) => [p.ID, p]) || [])
    const codeToProductMap = new Map(
      products?.map((p) => [p.CODIGO, p]).filter((e) => e[0]) || [],
    )

    const getProductDetails = (prodId: number | null, code: number | null) => {
      const prod =
        (prodId ? productsMap.get(prodId) : null) ||
        (code ? codeToProductMap.get(code) : null)
      return {
        produto_id: prod?.ID ?? prodId,
        codigo_produto: prod?.CODIGO ?? null,
        barcode: prod?.['CÓDIGO BARRAS'] ? String(prod['CÓDIGO BARRAS']) : null,
        produto: prod?.PRODUTO ?? 'Desconhecido',
        preco: prod?.PREÇO ? parseCurrency(prod.PREÇO) : 0,
      }
    }

    const dateStartStr = targetSession.data_inicio.split('T')[0]

    const { data: bdData } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('CODIGO FUNCIONARIO', employeeId)
      .gte('"DATA DO ACERTO"', dateStartStr)

    const clientToCarInserts: any[] = []
    const carToClientInserts: any[] = []

    bdData?.forEach((row: any) => {
      const rowEmployeeName = row['FUNCIONÁRIO']
      if (
        !rowEmployeeName ||
        rowEmployeeName.trim().toLowerCase() !==
          employeeName.trim().toLowerCase()
      ) {
        return
      }

      let rowDate: Date
      if (row['DATA E HORA']) {
        rowDate = parseISO(row['DATA E HORA'])
      } else {
        const dateStr = row['DATA DO ACERTO']
        const timeStr = row['HORA DO ACERTO'] || '00:00:00'
        if (!dateStr) return
        const rowDateTimeStr = `${dateStr}T${timeStr}`
        rowDate = parseISO(rowDateTimeStr)
      }

      if (!isAfter(rowDate, startDate)) return
      if (endDate && !isBefore(rowDate, endDate)) return

      const recolhido = parseCurrency(row['RECOLHIDO'])
      const novas = parseCurrency(row['NOVAS CONSIGNAÇÕES'])
      const prodCode = row['COD. PRODUTO']
      const orderId = row['NÚMERO DO PEDIDO']

      const details = getProductDetails(null, prodCode)

      if (recolhido > 0) {
        clientToCarInserts.push({
          id_estoque_carro: sessionId,
          produto_id: details.produto_id,
          quantidade: recolhido,
          pedido: orderId,
          data_horario: rowDate.toISOString(),
          funcionario: employeeName,
          codigo_produto: details.codigo_produto,
          barcode: details.barcode,
          produto: details.produto,
          preco: details.preco,
          ENTRADAS_cliente_carro: recolhido,
        })
      }

      if (novas > 0) {
        carToClientInserts.push({
          id_estoque_carro: sessionId,
          produto_id: details.produto_id,
          quantidade: novas,
          pedido: orderId,
          data_horario: rowDate.toISOString(),
          funcionario: employeeName,
          codigo_produto: details.codigo_produto,
          barcode: details.barcode,
          produto: details.produto,
          preco: details.preco,
          SAIDAS_carro_cliente: novas,
        })
      }
    })

    const insertBatch = async (table: string, items: any[]) => {
      if (items.length === 0) return
      const batchSize = 1000
      for (let i = 0; i < items.length; i += batchSize) {
        const { error } = await supabase
          .from(table)
          .insert(items.slice(i, i + batchSize))
        if (error) throw error
      }
    }

    await Promise.all([
      insertBatch('ESTOQUE CARRO: CLIENTE PARA O CARRO', clientToCarInserts),
      insertBatch('ESTOQUE CARRO: CARRO PARA O CLIENTE', carToClientInserts),
    ])
  },

  async resetInitialBalance(sessionId: number) {
    const { error } = await supabase
      .from('ESTOQUE CARRO SALDO INICIAL')
      .update({ saldo_inicial: 0 })
      .eq('id_estoque_carro', sessionId)

    if (error) throw error
  },

  async saveCount(
    sessionId: number,
    productId: number,
    quantity: number,
    employeeId?: number | null,
    employeeName?: string | null,
  ) {
    const payload = {
      id_estoque_carro: sessionId,
      produto_id: productId,
      quantidade: quantity,
      funcionario_id: employeeId,
      funcionario_nome: employeeName,
    }

    const { error } = await supabase.from('ESTOQUE CARRO CONTAGEM').insert(payload)
    if (error) throw error

    const { data: bdRecord } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"ID VENDA ITENS", "SALDO FINAL", "CONTAGEM"')
      .eq('session_id', sessionId)
      .eq('COD. PRODUTO', productId)
      .limit(1)
      .maybeSingle()

    if (bdRecord) {
      const newSaldoFinal = Number(bdRecord['SALDO FINAL'] || 0) + Number(quantity)
      const newContagem = Number(bdRecord['CONTAGEM'] || 0) + Number(quantity)

      await supabase
        .from('BANCO_DE_DADOS')
        .update({
          'SALDO FINAL': newSaldoFinal,
          CONTAGEM: newContagem,
        })
        .eq('ID VENDA ITENS', bdRecord['ID VENDA ITENS'])
    }
  },

  async updateCount(countId: number, newQuantity: number, sessionId: number, productId: number) {
    const { data: existing } = await supabase.from('ESTOQUE CARRO CONTAGEM').select('quantidade').eq('id', countId).single()
    if (!existing) return
    
    const oldQty = existing.quantidade || 0
    const diff = newQuantity - oldQty

    const { error } = await supabase.from('ESTOQUE CARRO CONTAGEM').update({ quantidade: newQuantity }).eq('id', countId)
    if (error) throw error

    if (diff !== 0) {
      const { data: bdRecord } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"ID VENDA ITENS", "SALDO FINAL", "CONTAGEM"')
        .eq('session_id', sessionId)
        .eq('COD. PRODUTO', productId)
        .limit(1)
        .maybeSingle()

      if (bdRecord) {
        await supabase
          .from('BANCO_DE_DADOS')
          .update({
            'SALDO FINAL': Number(bdRecord['SALDO FINAL'] || 0) + diff,
            CONTAGEM: Number(bdRecord['CONTAGEM'] || 0) + diff,
          })
          .eq('ID VENDA ITENS', bdRecord['ID VENDA ITENS'])
      }
    }
  },

  async deleteCount(countId: number, sessionId: number, productId: number) {
    const { data: existing } = await supabase.from('ESTOQUE CARRO CONTAGEM').select('quantidade').eq('id', countId).single()
    if (!existing) return
    
    const oldQty = existing.quantidade || 0

    const { error } = await supabase.from('ESTOQUE CARRO CONTAGEM').delete().eq('id', countId)
    if (error) throw error

    if (oldQty !== 0) {
      const { data: bdRecord } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"ID VENDA ITENS", "SALDO FINAL", "CONTAGEM"')
        .eq('session_id', sessionId)
        .eq('COD. PRODUTO', productId)
        .limit(1)
        .maybeSingle()

      if (bdRecord) {
        await supabase
          .from('BANCO_DE_DADOS')
          .update({
            'SALDO FINAL': Number(bdRecord['SALDO FINAL'] || 0) - oldQty,
            CONTAGEM: Number(bdRecord['CONTAGEM'] || 0) - oldQty,
          })
          .eq('ID VENDA ITENS', bdRecord['ID VENDA ITENS'])
      }
    }
  },

  async saveAdjustment(sessionId: number, productId: number, ajuste: number) {
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
    const finalBalances = items.map((item) => ({
      id_estoque_carro: session.id,
      produto_id: item.produto_id,
      saldo_final: item.novo_saldo,
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

    await supabase
      .from('ID ESTOQUE CARRO')
      .update({ data_fim: new Date().toISOString() })
      .eq('id', session.id)

    await this.startSession(session.funcionario_id)
  },

  async getDeliveryHistory(
    page: number = 1,
    pageSize: number = 20,
    filters: DeliveryHistoryFilter,
  ) {
    let query = supabase
      .from('view_delivery_history' as any)
      .select('*', { count: 'exact' })

    if (filters.startDate) {
      query = query.gte('data_movimento', filters.startDate)
    }

    if (filters.endDate) {
      const endDateTime = `${filters.endDate}T23:59:59`
      query = query.lte('data_movimento', endDateTime)
    }

    if (filters.search) {
      const s = filters.search
      query = query.or(`nome_cliente.ilike.%${s}%,produto.ilike.%${s}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('data_movimento', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: (data as DeliveryHistoryRow[]) || [],
      count: count || 0,
    }
  },

  async getAllDeliveryHistoryForExport(filters: DeliveryHistoryFilter) {
    let query = supabase.from('view_delivery_history' as any).select('*')

    if (filters.startDate) {
      query = query.gte('data_movimento', filters.startDate)
    }

    if (filters.endDate) {
      const endDateTime = `${filters.endDate}T23:59:59`
      query = query.lte('data_movimento', endDateTime)
    }

    if (filters.search) {
      const s = filters.search
      query = query.or(`nome_cliente.ilike.%${s}%,produto.ilike.%${s}%`)
    }

    const { data, error } = await query.order('data_movimento', {
      ascending: false,
    })

    if (error) throw error
    return (data as DeliveryHistoryRow[]) || []
  },
}

