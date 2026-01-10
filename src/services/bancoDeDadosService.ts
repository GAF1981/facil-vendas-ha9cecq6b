import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { ProductRow } from '@/types/product'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { format, parseISO, differenceInDays } from 'date-fns'
import { PaymentEntry } from '@/types/payment'
import { RecebimentoInsert } from '@/types/recebimento'
import { rotaService } from '@/services/rotaService'
import { reportsService } from '@/services/reportsService'

export const bancoDeDadosService = {
  async hasOutstandingBalance(clienteId: number): Promise<boolean> {
    const { count, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*', { count: 'exact', head: true })
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .gt('SALDO FINAL', 0)

    if (error) {
      console.error('Error checking client balance:', error)
      return false
    }

    return (count || 0) > 0
  },

  async getLastIdVendaItens(
    clienteId: number,
    produtoId: number,
  ): Promise<number | null> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"ID VENDA ITENS"')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .eq('COD. PRODUTO', produtoId)
      .order('ID VENDA ITENS', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching last ID VENDA ITENS:', error)
      return null
    }

    return data?.['ID VENDA ITENS'] || null
  },

  async getMaxIdVendaItens(): Promise<number> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"ID VENDA ITENS"')
      .order('ID VENDA ITENS', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching max ID VENDA ITENS:', error)
      throw error
    }

    // If table is empty, start at 0 (next will be 1)
    return (data?.['ID VENDA ITENS'] || 0) as number
  },

  async getMaxNumeroPedido() {
    // Using quotes for column with spaces to be safe
    // Crucial fix: Filter out NULL values to avoid incorrect ordering (NULLS FIRST)
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"NÚMERO DO PEDIDO"')
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"NÚMERO DO PEDIDO"', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data?.['NÚMERO DO PEDIDO'] || 0) as number
  },

  // This is primarily for PREVIEW in the UI.
  // For actual saving, use reserveNextOrderNumber() to guarantee uniqueness/consistency.
  async getNextNumeroPedido() {
    const max = await this.getMaxNumeroPedido()
    return max + 1
  },

  // Calls the RPC to get the next order number safely
  async reserveNextOrderNumber(): Promise<number> {
    const { data, error } = await supabase.rpc('get_next_order_number')
    if (error) throw error
    return data as number
  },

  async getLastAcerto(
    clienteId: number,
  ): Promise<{ date: string; time: string } | null> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"DATA DO ACERTO", "HORA DO ACERTO"')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .order('"DATA DO ACERTO"', { ascending: false })
      .order('"HORA DO ACERTO"', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching last acerto:', error)
      return null
    }

    if (!data) return null

    return {
      date: data['DATA DO ACERTO'] || '',
      time: data['HORA DO ACERTO'] || '',
    }
  },

  async getAcertoItemsAsNewTransaction(
    clienteId: number,
    date: string,
    time: string,
  ): Promise<{ items: AcertoItem[]; nextId: number }> {
    const { data: dbItems, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .eq('"DATA DO ACERTO"', date)
      .eq('"HORA DO ACERTO"', time)

    if (dbError) throw dbError
    if (!dbItems || dbItems.length === 0) return { items: [], nextId: 1 }

    const productCodes = [
      ...new Set(
        dbItems.map((i) => i['COD. PRODUTO']).filter((c) => c != null),
      ),
    ] as number[]

    let products: ProductRow[] = []
    if (productCodes.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('PRODUTOS')
        .select('*')
        .in('CODIGO', productCodes)

      if (productsError) console.error('Error fetching products', productsError)
      if (productsData) products = productsData
    }

    const items: AcertoItem[] = dbItems
      .map((dbItem) => {
        const product = products.find(
          (p) => p.CODIGO === dbItem['COD. PRODUTO'],
        )
        if (!product) return null

        const saldoInicial = dbItem['SALDO FINAL'] || 0
        const contagem = 0
        const quantVendida = saldoInicial - contagem
        const precoUnitario = parseCurrency(product.PREÇO)
        const valorVendido = quantVendida * precoUnitario

        return {
          uid: Math.random().toString(36).substr(2, 9),
          produtoId: product.ID,
          produtoCodigo: dbItem['COD. PRODUTO'],
          produtoNome: dbItem['MERCADORIA'] || product.PRODUTO || 'Sem nome',
          tipo: dbItem['TIPO'],
          precoUnitario: precoUnitario,
          saldoInicial: saldoInicial,
          contagem: contagem,
          quantVendida: quantVendida,
          valorVendido: valorVendido,
          saldoFinal: 0,
          idVendaItens: null, // Let DB handle identity
        }
      })
      .filter((i) => i !== null) as AcertoItem[]

    return { items, nextId: 0 }
  },

  async getMonthlyAverage(clienteId: number): Promise<number> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"VALOR VENDIDO", "DATA DO ACERTO"')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error calculating monthly average:', error)
      return 0
    }

    if (!data || data.length === 0) return 0

    const monthlyTotals: Record<string, number> = {}

    data.forEach((row) => {
      const date = row['DATA DO ACERTO']
      const valStr = row['VALOR VENDIDO']
      if (!date || !valStr) return

      const monthKey = date.substring(0, 7)
      const val = parseCurrency(valStr)

      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + val
    })

    const months = Object.values(monthlyTotals)
    if (months.length === 0) return 0

    const total = months.reduce((a, b) => a + b, 0)
    return total / months.length
  },

  async getAcertoHistory(clienteId: number) {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "HORA DO ACERTO", "FUNCIONÁRIO", "VALOR VENDIDO", "DESCONTO POR GRUPO"',
      )
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .order('"DATA DO ACERTO"', { ascending: false })
      .order('"HORA DO ACERTO"', { ascending: false })
      .limit(1000)

    if (error) throw error
    if (!data || data.length === 0) return []

    const orderIds = [
      ...new Set(
        data
          .map((item) => item['NÚMERO DO PEDIDO'])
          .filter((id) => id !== null && id !== undefined),
      ),
    ] as number[]

    let paymentsMap = new Map<number, any>()

    if (orderIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'venda_id, valor_pago, valor_registrado, forma_pagamento, vencimento, created_at, FUNCIONARIOS(nome_completo)',
        )
        .in('venda_id', orderIds)

      if (paymentsError) {
        console.error('Error fetching receipts:', paymentsError)
      } else if (paymentsData) {
        paymentsData.forEach((p: any) => {
          if (!p.venda_id) return
          const existing = paymentsMap.get(p.venda_id) || {
            total: 0,
            methods: new Set<string>(),
            details: [],
          }
          existing.total += p.valor_pago || 0
          if (p.forma_pagamento) existing.methods.add(p.forma_pagamento)

          existing.details.push({
            method: p.forma_pagamento,
            value: p.valor_pago || 0,
            registeredValue: p.valor_registrado || 0,
            date: p.vencimento || '',
            employeeName: p.FUNCIONARIOS?.nome_completo || 'N/A',
            createdAt: p.created_at || '',
          })

          paymentsMap.set(p.venda_id, existing)
        })
      }
    }

    const ordersMap = new Map<number, any>()

    data.forEach((row) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: orderId,
          data: row['DATA DO ACERTO'],
          hora: row['HORA DO ACERTO'],
          vendedor: row['FUNCIONÁRIO'],
          valorVendaTotal: 0,
          desconto: row['DESCONTO POR GRUPO'],
        })
      }

      const order = ordersMap.get(orderId)
      order.valorVendaTotal += parseCurrency(row['VALOR VENDIDO'])
    })

    const orders = Array.from(ordersMap.values()).sort((a, b) => {
      const dtA = new Date(`${a.data}T${a.hora || '00:00:00'}`).getTime()
      const dtB = new Date(`${b.data}T${b.hora || '00:00:00'}`).getTime()
      return dtB - dtA
    })

    const result = orders.map((order) => {
      const descontoStr = order.desconto || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
      const valorDesconto = order.valorVendaTotal * discountFactor
      const saldoAPagar = order.valorVendaTotal - valorDesconto

      const paymentInfo = paymentsMap.get(order.id)
      const valorPago = paymentInfo ? paymentInfo.total : 0
      const uniqueMethods = paymentInfo
        ? Array.from(paymentInfo.methods).join(', ')
        : '-'
      const paymentDetails = paymentInfo ? paymentInfo.details : []

      const debito = saldoAPagar - valorPago

      return {
        ...order,
        saldoAPagar,
        valorPago,
        debito: debito,
        methods: uniqueMethods,
        paymentDetails,
        mediaMensal: null as number | null,
      }
    })

    for (let i = 0; i < result.length; i++) {
      const current = result[i]
      let mediaMensal = null

      if (i < result.length - 1) {
        const previous = result[i + 1]
        const dateCurrent = parseISO(current.data)
        const datePrev = parseISO(previous.data)

        const diffDays = differenceInDays(dateCurrent, datePrev)

        if (diffDays > 0) {
          const factor = diffDays / 30
          mediaMensal = current.valorVendaTotal / factor
        }
      }

      result[i].mediaMensal = mediaMensal
    }

    return result
  },

  async getHistoryForPdf(clienteId: number) {
    // Specifically fetches history from 'debitos_historico' for PDF report generation
    // to ensure consistency with the reports module and include Média Mensal/Pedido fields.
    const { data, error } = await supabase
      .from('debitos_historico')
      .select('*')
      .eq('cliente_codigo', clienteId)
      .order('data_acerto', { ascending: false })
      .order('pedido_id', { ascending: false })
      .limit(10)

    if (error) throw error

    return data.map((row) => ({
      id: row.pedido_id,
      data: row.data_acerto,
      valorVendaTotal: row.valor_venda || 0,
      saldoAPagar: row.saldo_a_pagar || 0,
      valorPago: row.valor_pago || 0,
      debito: row.debito || 0,
      vendedor: row.vendedor_nome || '-',
      mediaMensal: row.media_mensal || 0,
      desconto: row.desconto || 0,
    }))
  },

  async getOrderDetails(orderId: number) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (itemsError) throw itemsError

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('RECEBIMENTOS')
      .select('*')
      .eq('venda_id', orderId)

    if (paymentsError) throw paymentsError

    return { items: itemsData || [], payments: paymentsData || [] }
  },

  async logInitialBalanceAdjustment(payload: {
    numero_pedido?: number | null
    cliente_id: number
    cliente_nome: string
    vendedor_id: number
    vendedor_nome: string
    saldo_anterior: number
    saldo_novo: number
    produto_id: number
    data_acerto?: string
  }) {
    const quantity = payload.saldo_novo - payload.saldo_anterior

    const { error } = await supabase.from('AJUSTE_SALDO_INICIAL').insert({
      ...payload,
      quantidade_alterada: quantity,
      data_acerto: payload.data_acerto || new Date().toISOString(),
    } as any)

    if (error) throw error
  },

  async saveTransaction(
    client: ClientRow,
    employee: Employee,
    items: AcertoItem[],
    date: Date,
    acertoTipo: string,
    payments: PaymentEntry[],
    notaFiscalVenda: string,
    customOrderNumber?: number,
  ): Promise<number> {
    // 1. Get Context (Order Number)
    const nextPedido =
      customOrderNumber ?? (await this.reserveNextOrderNumber())

    const dataAcertoStr = format(date, 'yyyy-MM-dd')
    const horaAcerto = format(date, 'HH:mm:ss')
    const dataEHora = date.toISOString()

    // 2. Fetch current product prices
    const productIds = items.map((i) => i.produtoId)

    if (productIds.length === 0) return nextPedido

    const { data: productsData, error: productsError } = await supabase
      .from('PRODUTOS')
      .select('ID, PREÇO')
      .in('ID', productIds)

    if (productsError) throw productsError

    const priceMap = new Map<number, number>()
    productsData?.forEach((p) => {
      priceMap.set(p.ID, parseCurrency(p.PREÇO))
    })

    // Construct Payment String (FORMA)
    const paymentString = payments
      .map(
        (p) =>
          `${p.method} Reg: R$ ${formatCurrency(p.value)} Pago: R$ ${formatCurrency(p.paidValue)} (${p.installments}x)`,
      )
      .join(' | ')

    const formaPagamento = paymentString || acertoTipo

    // Determine Status NF
    const nfCadastro = client['NOTA FISCAL'] || 'NÃO'
    const nfVenda = notaFiscalVenda || 'NÃO'
    let statusNf = 'Pendente'

    if (nfCadastro === 'NÃO' && nfVenda === 'NÃO') {
      statusNf = 'Resolvida'
    } else if (nfCadastro === 'SIM' && nfVenda === 'NÃO') {
      statusNf = 'Pendente'
    } else if (nfCadastro === 'NÃO' && nfVenda === 'SIM') {
      statusNf = 'Pendente'
    }

    // 3. Prepare rows
    const rowsToInsert = items.map((item) => {
      const currentPrice = priceMap.get(item.produtoId) || item.precoUnitario
      const valorVendidoVal = currentPrice * item.quantVendida
      const saldoFinal = item.saldoFinal
      const contagem = item.contagem

      const diff = saldoFinal - contagem
      let novasConsignacoesVal = 0
      let recolhidoVal = 0

      if (diff > 0) {
        novasConsignacoesVal = diff
        recolhidoVal = 0
      } else if (diff < 0) {
        novasConsignacoesVal = 0
        recolhidoVal = Math.abs(diff)
      }

      const descontoStr = client.Desconto || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal

      const valorConsignadoVendaVal = saldoFinal * currentPrice
      const valorConsignadoCustoVal =
        valorConsignadoVendaVal - valorConsignadoVendaVal * discountFactor

      const itemDebt = valorVendidoVal * (1 - discountFactor)

      return {
        // 'ID VENDA ITENS': item.idVendaItens, // OMITTED to fix identity issue
        'NÚMERO DO PEDIDO': nextPedido,
        'DATA DO ACERTO': dataAcertoStr,
        'HORA DO ACERTO': horaAcerto,
        'DATA E HORA': dataEHora,
        'CÓDIGO DO CLIENTE': client.CODIGO,
        CLIENTE: client['NOME CLIENTE'],
        'CODIGO FUNCIONARIO': employee.id,
        FUNCIONÁRIO: employee.nome_completo,
        'DESCONTO POR GRUPO': client.Desconto,
        'COD. PRODUTO': item.produtoCodigo ?? null,
        MERCADORIA: item.produtoNome,
        TIPO: item.tipo,
        FORMA: formaPagamento,
        'SALDO INICIAL': item.saldoInicial,
        CONTAGEM: contagem,
        'QUANTIDADE VENDIDA': item.quantVendida.toString(),
        'VALOR VENDIDO': formatCurrency(valorVendidoVal),
        'VALOR VENDA PRODUTO': formatCurrency(valorVendidoVal),
        'PREÇO VENDIDO': formatCurrency(currentPrice),
        'SALDO FINAL': saldoFinal,
        'NOVAS CONSIGNAÇÕES': formatCurrency(novasConsignacoesVal),
        RECOLHIDO: formatCurrency(recolhidoVal),
        'VALOR CONSIGNADO TOTAL (Preço Venda)': formatCurrency(
          valorConsignadoVendaVal,
        ),
        'VALOR CONSIGNADO TOTAL (Custo)': formatCurrency(
          valorConsignadoCustoVal,
        ),
        'VALOR DEVIDO': itemDebt,
        DETALHES_PAGAMENTO: payments,
        // New Columns
        nota_fiscal_cadastro: nfCadastro,
        nota_fiscal_venda: nfVenda,
        nota_fiscal_emitida: statusNf,
      }
    })

    // 4. Insert into BANCO_DE_DADOS
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowsToInsert as any)

    if (error) throw error

    // 5. Insert into RECEBIMENTOS
    const recebimentosToInsert: RecebimentoInsert[] = []

    payments.forEach((payment) => {
      // Use details if available (even for 1x to capture correct calculated paid values)
      // Fallback to main payment object if details missing (legacy safety)
      const detailsToUse =
        payment.details && payment.details.length > 0
          ? payment.details
          : [
              {
                value: payment.value,
                paidValue: payment.paidValue,
                dueDate: payment.dueDate,
              },
            ]

      detailsToUse.forEach((detail) => {
        recebimentosToInsert.push({
          venda_id: nextPedido,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_registrado: detail.value,
          valor_pago: detail.paidValue || 0, // Ensure we use the granular paidValue (e.g. 0 for future installments or check)
          vencimento: new Date(`${detail.dueDate}T12:00:00`).toISOString(),
          ID_da_fêmea: nextPedido,
        })
      })
    })

    if (recebimentosToInsert.length > 0) {
      const { error: recebimentosError } = await supabase
        .from('RECEBIMENTOS')
        .insert(recebimentosToInsert)

      if (recebimentosError) {
        console.error('Error inserting recebimentos:', recebimentosError)
        throw recebimentosError
      }
    }

    // 6. Insert into NOTA_FISCAL if requested
    if (nfVenda === 'SIM') {
      const { error: nfError } = await supabase.from('NOTA_FISCAL').insert({
        venda_id: nextPedido,
        cliente_id: client.CODIGO,
      })

      if (nfError) {
        console.error('Error inserting nota fiscal record:', nfError)
      }
    }

    // 7. Check Rota and Decrement x_na_rota
    try {
      await rotaService.checkAndDecrementXNaRota(client.CODIGO, date)
    } catch (rotaError) {
      console.error('Error updating Rota counter on settlement:', rotaError)
    }

    // 8. Auto-update debt history for this order (Requirement)
    try {
      await reportsService.updateDebtHistoryForOrder(nextPedido)
    } catch (debtError) {
      console.error('Error auto-updating debt history:', debtError)
    }

    return nextPedido
  },
}
