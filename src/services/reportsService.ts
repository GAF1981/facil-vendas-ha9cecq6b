import { supabase } from '@/lib/supabase/client'
import { parseCurrency } from '@/lib/formatters'
import { differenceInDays, startOfDay } from 'date-fns'
import { parseDateSafe } from '@/lib/dateUtils'

export interface ProjectionReportRow {
  id: string
  orderId: number
  clientCode: number
  clientName: string
  orderDate: string
  totalValue: number
  daysBetweenOrders: number | null
  indexDays: number | null
  monthlyAverage: number | null
  daysSinceLastOrder: number | null
  projection: number | null
}

export interface TopSellingItem {
  produto_nome: string
  produto_codigo: number
  quantidade_total: number
  valor_total: number
}

export interface TopSellingItemV3 {
  produto_nome: string
  produto_codigo: number
  quantidade_total: number
  valor_total: number
  estoque_inicial_total: number
}

export interface TopSellingItemV4 {
  produto_nome: string
  produto_codigo: number
  quantidade_total: number
  valor_total: number
  estoque_inicial_total: number
  tipo: string | null
}

export interface TopSellingItemV5 {
  produto_nome: string
  produto_codigo: number
  quantidade_total: number
  valor_total: number
  estoque_inicial_total: number
  grupo: string | null
}

export interface AdjustmentReportRow {
  id: number
  numero_pedido: number | null
  cliente_id: number
  cliente_nome: string
  vendedor_id: number | null
  vendedor_nome: string | null
  data_acerto: string
  saldo_anterior: number
  saldo_novo: number
  quantidade_alterada: number
  produto_id: number
  produto_nome?: string
  valor_ajuste?: number
}

export interface DebitoReportRow {
  rota_id: number | null
  pedido_id: number
  data_acerto: string
  hora_acerto: string | null
  vendedor_nome: string
  cliente_codigo: number | null
  cliente_nome: string | null
  rota: string | null
  media_mensal: number
  valor_venda: number
  saldo_a_pagar: number
  valor_pago: number
  debito: number
  desconto: number
  debito_total?: number
}

export interface ExpenseReportRow {
  id: number
  data: string
  detalhamento: string
  grupo: string
  funcionario_nome: string
  funcionario_id?: number
  saiu_do_caixa: boolean
  valor: number
  status: string
  banco_pagamento: string | null
  banco_outro: string | null
  data_lancamento: string | null
}

export const reportsService = {
  async getProjectionsReport(
    clientIds?: number[],
  ): Promise<ProjectionReportRow[]> {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_client_projections',
    )
    if (rpcError) throw rpcError

    const rpcMap = new Map<number, { projecao: number; dias: number }>()
    rpcData?.forEach((r: any) =>
      rpcMap.set(Number(r.client_id), {
        projecao: Number(r.projecao),
        dias: Number(r.dias_entre_acertos),
      }),
    )

    const fetchBatchedData = async (
      table: string,
      select: string,
      modifiers: (q: any) => any,
    ) => {
      let allRows: any[] = []
      const batchSize = 1000
      const limit = 100000

      for (let i = 0; i < limit / batchSize; i++) {
        const from = i * batchSize
        const to = from + batchSize - 1
        let query = supabase.from(table as any).select(select)
        query = modifiers(query)
        const { data, error } = await query.range(from, to)

        if (error) throw error
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < batchSize) break
      }
      return allRows
    }

    const salesData = await fetchBatchedData(
      'BANCO_DE_DADOS',
      '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "CLIENTE", "DATA DO ACERTO", "DATA E HORA", "VALOR VENDIDO", "HORA DO ACERTO"',
      (q) => {
        let query = q.not('NÚMERO DO PEDIDO', 'is', null)
        if (clientIds && clientIds.length > 0) {
          query = query.in('"CÓDIGO DO CLIENTE"', clientIds)
        }
        return query.order('NÚMERO DO PEDIDO', { ascending: false })
      },
    )

    const adjData = await fetchBatchedData(
      'AJUSTE_SALDO_INICIAL',
      'cliente_id, cliente_nome, data_acerto, numero_pedido, saldo_novo, id',
      (q) => {
        let query = q.not('data_acerto', 'is', null)
        if (clientIds && clientIds.length > 0) {
          query = query.in('cliente_id', clientIds)
        }
        return query.order('id', { ascending: false })
      },
    )

    const ordersMap = new Map<string, ProjectionReportRow>()

    salesData?.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      let dateStr = row['DATA DO ACERTO']
      if ((!dateStr || String(dateStr).trim() === '') && row['DATA E HORA']) {
        dateStr = row['DATA E HORA'].split('T')[0]
      }
      if (!dateStr || String(dateStr).trim() === '') return

      const dateObj = parseDateSafe(dateStr)
      if (!dateObj) return

      const val = parseCurrency(row['VALOR VENDIDO'])
      const uniqueId = `sale-${orderId}`

      const cid = Number(row['CÓDIGO DO CLIENTE'] || 0)

      if (!ordersMap.has(uniqueId)) {
        ordersMap.set(uniqueId, {
          id: uniqueId,
          orderId: orderId,
          clientCode: cid,
          clientName: row['CLIENTE'] || 'N/D',
          orderDate: dateObj.toISOString(),
          totalValue: 0,
          daysBetweenOrders: null,
          indexDays: null,
          monthlyAverage: null,
          daysSinceLastOrder: null,
          projection: null,
        })
      }

      const order = ordersMap.get(uniqueId)!
      order.totalValue += val
    })

    adjData?.forEach((row: any) => {
      const dateObj = parseDateSafe(row.data_acerto)
      if (!dateObj) return

      const orderId = row.numero_pedido || -row.id
      const uniqueId = `adj-${orderId}-${row.id}`
      const cid = Number(row.cliente_id)

      if (!ordersMap.has(uniqueId)) {
        ordersMap.set(uniqueId, {
          id: uniqueId,
          orderId: orderId,
          clientCode: cid,
          clientName: row.cliente_nome || 'Cliente Importado',
          orderDate: dateObj.toISOString(),
          totalValue: 0,
          daysBetweenOrders: null,
          indexDays: null,
          monthlyAverage: null,
          daysSinceLastOrder: null,
          projection: null,
        })
      }
    })

    const allOrders = Array.from(ordersMap.values())
    const clientOrdersMap = new Map<number, ProjectionReportRow[]>()
    allOrders.forEach((order) => {
      const list = clientOrdersMap.get(order.clientCode) || []
      list.push(order)
      clientOrdersMap.set(order.clientCode, list)
    })

    const result: ProjectionReportRow[] = []
    const today = startOfDay(new Date())

    clientOrdersMap.forEach((orders) => {
      orders.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime()
        const dateB = new Date(b.orderDate).getTime()
        if (dateB === dateA) {
          return b.orderId - a.orderId
        }
        return dateB - dateA
      })

      const latestOrderDate =
        orders.length > 0 ? new Date(orders[0].orderDate) : null
      const daysSinceLastForClient = latestOrderDate
        ? differenceInDays(today, latestOrderDate)
        : 0

      orders.forEach((currentOrder, index) => {
        if (index < orders.length - 1) {
          const prevOrder = orders[index + 1]
          currentOrder.daysBetweenOrders = Math.abs(
            differenceInDays(
              new Date(currentOrder.orderDate),
              new Date(prevOrder.orderDate),
            ),
          )

          if (currentOrder.daysBetweenOrders > 0) {
            currentOrder.indexDays = currentOrder.daysBetweenOrders / 30
            currentOrder.monthlyAverage =
              currentOrder.totalValue / currentOrder.indexDays
          } else {
            currentOrder.indexDays = 0
            currentOrder.monthlyAverage = currentOrder.totalValue
          }
        } else {
          currentOrder.daysBetweenOrders = null
          currentOrder.indexDays = null
          currentOrder.monthlyAverage = null
        }

        if (index === 0) {
          currentOrder.daysSinceLastOrder = daysSinceLastForClient
          currentOrder.projection =
            rpcMap.get(currentOrder.clientCode)?.projecao || null
        } else {
          currentOrder.daysSinceLastOrder = null
          currentOrder.projection = null
        }

        result.push(currentOrder)
      })
    })

    return result.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime()
      const dateB = new Date(b.orderDate).getTime()
      if (dateB === dateA) {
        return b.orderId - a.orderId
      }
      return dateB - dateA
    })
  },

  async getTopSellingItems(
    startDate: string,
    endDate: string,
  ): Promise<TopSellingItem[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"COD. PRODUTO", MERCADORIA, "QUANTIDADE VENDIDA", "VALOR VENDIDO", "DATA DO ACERTO"',
      )
      .gte('"DATA DO ACERTO"', startDate)
      .lte('"DATA DO ACERTO"', endDate)
      .not('"COD. PRODUTO"', 'is', null)

    if (error) throw error

    const aggregationMap = new Map<number, TopSellingItem>()

    data?.forEach((row: any) => {
      const codigo = row['COD. PRODUTO']
      if (!codigo) return

      const qtdStr = String(row['QUANTIDADE VENDIDA'] || '0')
      const valStr = String(row['VALOR VENDIDO'] || '0')

      const qtd = parseFloat(qtdStr.replace(',', '.') || '0') || 0
      const val = parseCurrency(valStr)

      if (!aggregationMap.has(codigo)) {
        aggregationMap.set(codigo, {
          produto_codigo: codigo,
          produto_nome: row.MERCADORIA || 'Produto Desconhecido',
          quantidade_total: 0,
          valor_total: 0,
        })
      }

      const item = aggregationMap.get(codigo)!
      item.quantidade_total += qtd
      item.valor_total += val
    })

    return Array.from(aggregationMap.values()).sort(
      (a, b) => b.valor_total - a.valor_total,
    )
  },

  async getTopSellingItemsV3(
    startDate: string,
    endDate: string,
    funcionarioId?: number,
    grupo?: string,
  ): Promise<TopSellingItemV3[]> {
    const { data, error } = await supabase.rpc('get_top_selling_items_v3', {
      start_date: startDate,
      end_date: endDate,
      p_funcionario_id: funcionarioId,
      p_grupo: grupo,
    })

    if (error) throw error
    return data as TopSellingItemV3[]
  },

  async getTopSellingItemsV4(
    startDate: string,
    endDate: string,
    funcionarioId?: number,
    grupo?: string,
  ): Promise<TopSellingItemV4[]> {
    const { data, error } = await supabase.rpc(
      'get_top_selling_items_v4' as any,
      {
        start_date: startDate,
        end_date: endDate,
        p_funcionario_id: funcionarioId,
        p_grupo: grupo,
      },
    )

    if (error) throw error
    return data as TopSellingItemV4[]
  },

  async getTopSellingItemsV5(
    startDate: string,
    endDate: string,
    funcionarioId?: number,
    grupo?: string,
  ): Promise<TopSellingItemV5[]> {
    const { data, error } = await supabase.rpc(
      'get_top_selling_items_v5' as any,
      {
        start_date: startDate,
        end_date: endDate,
        p_funcionario_id: funcionarioId,
        p_grupo: grupo,
      },
    )

    if (error) throw error
    return data as TopSellingItemV5[]
  },

  async getUniqueProductTypes(): Promise<string[]> {
    const { data, error } = await supabase.rpc(
      'get_unique_product_types' as any,
    )
    if (error) throw error
    return (data || []).map((d: any) => d.tipo)
  },

  async getUniqueProductGroups(): Promise<string[]> {
    const { data, error } = await supabase.rpc(
      'get_unique_product_groups' as any,
    )
    if (error) throw error
    return (data || []).map((d: any) => d.grupo)
  },

  async getInitialBalanceAdjustments(filters?: {
    sellerId?: string | null
    startDate?: Date
    endDate?: Date
  }): Promise<AdjustmentReportRow[]> {
    let query = supabase
      .from('AJUSTE_SALDO_INICIAL')
      .select('*')
      .order('data_acerto', { ascending: false })

    if (filters?.sellerId && filters.sellerId !== 'all') {
      query = query.eq('vendedor_id', parseInt(filters.sellerId))
    }

    if (filters?.startDate) {
      query = query.gte('data_acerto', filters.startDate.toISOString())
    }

    if (filters?.endDate) {
      query = query.lte('data_acerto', filters.endDate.toISOString())
    }

    if (!filters?.startDate && !filters?.sellerId) {
      query = query.limit(1000)
    } else {
      query = query.limit(5000)
    }

    const { data, error } = await query

    if (error) throw error

    const productIds = new Set<number>()
    data.forEach((row) => {
      if (row.produto_id) productIds.add(row.produto_id)
    })

    const productsMap = new Map<number, { name: string; price: number }>()

    if (productIds.size > 0) {
      const ids = Array.from(productIds)
      const chunkSize = 500
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize)
        const { data: products } = await supabase
          .from('PRODUTOS')
          .select('ID, PRODUTO, PREÇO')
          .in('ID', chunk)

        products?.forEach((p) => {
          if (p.ID) {
            productsMap.set(p.ID, {
              name: p.PRODUTO || 'Desconhecido',
              price: parseCurrency(p.PREÇO),
            })
          }
        })
      }
    }

    return data.map((row) => {
      const product = productsMap.get(row.produto_id)
      const price = product?.price || 0
      const adjustmentValue = (row.quantidade_alterada || 0) * price

      return {
        ...row,
        produto_nome: product?.name || `Produto ${row.produto_id}`,
        valor_ajuste: adjustmentValue,
      } as AdjustmentReportRow
    })
  },

  async refreshDebtsReport() {
    const { error } = await supabase.rpc('refresh_debitos_historico')
    if (error) throw error
  },

  async updateDebtHistoryForOrder(orderId: number) {
    const { error } = await supabase.rpc('update_debito_historico_order', {
      p_pedido_id: orderId,
    })
    if (error) {
      console.error(
        `Failed to auto-update debt history for order ${orderId}`,
        error,
      )
      throw error
    }
  },

  async getDebtsReport(): Promise<DebitoReportRow[]> {
    const { data: reportData, error } = await supabase
      .from('debitos_com_total_view' as any)
      .select('*')
      .order('data_acerto', { ascending: false })
      .limit(1000)

    if (error) throw error
    if (!reportData || reportData.length === 0) return []

    const orderIdsToFetch = new Set<number>()
    const clientCodes = new Set<number>()

    reportData.forEach((row: any) => {
      if (row.cliente_codigo) {
        clientCodes.add(row.cliente_codigo)
      } else {
        orderIdsToFetch.add(row.pedido_id)
      }
    })

    const orderIds = Array.from(orderIdsToFetch)
    const orderClientMap = new Map<number, number>()

    if (orderIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize)
        const { data: salesData } = await supabase
          .from('BANCO_DE_DADOS')
          .select('"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE"')
          .in('NÚMERO DO PEDIDO', chunk)

        salesData?.forEach((sale) => {
          if (sale['NÚMERO DO PEDIDO'] && sale['CÓDIGO DO CLIENTE']) {
            orderClientMap.set(
              sale['NÚMERO DO PEDIDO'],
              sale['CÓDIGO DO CLIENTE'],
            )
            clientCodes.add(sale['CÓDIGO DO CLIENTE'])
          }
        })
      }
    }

    const allClientCodes = Array.from(clientCodes)
    const clientNameMap = new Map<number, string>()

    if (allClientCodes.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < allClientCodes.length; i += chunkSize) {
        const chunk = allClientCodes.slice(i, i + chunkSize)
        const { data: clientData } = await supabase
          .from('CLIENTES')
          .select('CODIGO, "NOME CLIENTE"')
          .in('CODIGO', chunk)

        clientData?.forEach((client) => {
          if (client.CODIGO && client['NOME CLIENTE']) {
            clientNameMap.set(client.CODIGO, client['NOME CLIENTE'])
          }
        })
      }
    }

    const enrichedData = reportData.map((row: any) => {
      let clientCode = row.cliente_codigo

      if (!clientCode && orderClientMap.has(row.pedido_id)) {
        clientCode = orderClientMap.get(row.pedido_id) || null
      }

      let clientName = row.cliente_nome
      if (clientCode && clientNameMap.has(clientCode)) {
        clientName = clientNameMap.get(clientCode) || clientName
      }

      const valorVenda = row.valor_venda || 0
      const desconto = row.desconto || 0
      const valorPago = row.valor_pago || 0
      const debitoCalc = Math.max(0, valorVenda - desconto - valorPago)

      return {
        ...row,
        cliente_codigo: clientCode,
        cliente_nome: clientName,
        saldo_a_pagar:
          row.saldo_a_pagar !== undefined && row.saldo_a_pagar !== null
            ? row.saldo_a_pagar
            : valorVenda - desconto,
        debito: debitoCalc,
        debito_total: row.debito_total,
      }
    })

    return enrichedData as DebitoReportRow[]
  },

  async sendConsolidatedEmail(userEmail: string) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const { data, error } = await supabase.functions.invoke(
        'send-route-report',
        {
          body: { userEmail },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      )

      if (error) {
        console.warn('Edge function send-route-report error:', error)
        throw new Error(
          error.message || 'Falha ao enviar relatório, serviço indisponível.',
        )
      }
      return data
    } catch (error: any) {
      console.warn('Error in sendConsolidatedEmail:', error)
      throw new Error(error.message || 'Falha na comunicação com o servidor')
    }
  },

  async getExpensesReport(
    startDate: string,
    endDate: string,
    grupo?: string,
    funcionarioId?: string,
  ): Promise<ExpenseReportRow[]> {
    let query = supabase
      .from('DESPESAS')
      .select(
        `
        id,
        Data,
        Detalhamento,
        "Grupo de Despesas",
        Valor,
        saiu_do_caixa,
        funcionario_id,
        status,
        banco_pagamento,
        banco_outro,
        data_lancamento,
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .gte('Data', startDate)
      .lte('Data', endDate + 'T23:59:59')
      .order('Data', { ascending: false })

    if (grupo && grupo !== 'todos') {
      query = query.eq('Grupo de Despesas', grupo)
    }

    if (funcionarioId && funcionarioId !== 'todos') {
      query = query.eq('funcionario_id', parseInt(funcionarioId))
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((exp: any) => {
      const saiuDoCaixa = exp.saiu_do_caixa !== false
      let computedStatus = exp.status || 'A confirmar'

      if (saiuDoCaixa) {
        computedStatus = 'Confirmado'
      } else {
        if (exp.status === 'Confirmado' && exp.banco_pagamento) {
          computedStatus = 'Confirmado'
        } else {
          computedStatus = 'A confirmar'
        }
      }

      return {
        id: exp.id,
        data: exp.Data || '',
        detalhamento: exp.Detalhamento,
        grupo: exp['Grupo de Despesas'],
        funcionario_id: exp.funcionario_id,
        funcionario_nome: exp.FUNCIONARIOS?.nome_completo || 'N/D',
        saiu_do_caixa: saiuDoCaixa,
        valor: Number(exp.Valor),
        status: computedStatus,
        banco_pagamento: exp.banco_pagamento,
        banco_outro: exp.banco_outro,
        data_lancamento: exp.data_lancamento,
      }
    })
  },

  async updateExpenseConfirmation(
    id: number,
    data: {
      status: string
      banco_pagamento?: string | null
      banco_outro?: string | null
      data_lancamento?: string | null
    },
  ) {
    const { error } = await supabase
      .from('DESPESAS')
      .update({
        status: data.status,
        banco_pagamento: data.banco_pagamento,
        banco_outro: data.banco_outro,
        data_lancamento: data.data_lancamento,
      })
      .eq('id', id)

    if (error) throw error
  },
}
