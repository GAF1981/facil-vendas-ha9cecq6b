import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { ProductRow } from '@/types/product'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { format } from 'date-fns'
import { PaymentEntry } from '@/types/payment'
import { RecebimentoInsert } from '@/types/recebimento'

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
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"NÚMERO DO PEDIDO"')
      .order('"NÚMERO DO PEDIDO"', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return (data?.['NÚMERO DO PEDIDO'] || 0) as number
  },

  async getNextNumeroPedido() {
    const max = await this.getMaxNumeroPedido()
    return max + 1
  },

  async getLastAcerto(
    clienteId: number,
  ): Promise<{ date: string; time: string } | null> {
    // Explicitly selecting and ordering by columns with spaces
    // ensuring we map CÓDIGO DO CLIENTE to the passed ID
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
    // 1. Fetch DB Items for this client and specific datetime
    const { data: dbItems, error: dbError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .eq('"DATA DO ACERTO"', date)
      .eq('"HORA DO ACERTO"', time)

    if (dbError) throw dbError
    if (!dbItems || dbItems.length === 0)
      return { items: [], nextId: (await this.getMaxIdVendaItens()) + 1 }

    // 2. Fetch Products to resolve IDs (since DB only stores COD. PRODUTO and MERCADORIA)
    const productCodes = [
      ...new Set(
        dbItems.map((i) => i['COD. PRODUTO']).filter((c) => c != null),
      ),
    ] as number[]

    // Fetch products by Code
    let products: ProductRow[] = []
    if (productCodes.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from('PRODUTOS')
        .select('*')
        .in('CODIGO', productCodes)

      if (productsError) console.error('Error fetching products', productsError)
      if (productsData) products = productsData
    }

    // 3. Prepare IDs
    let currentMaxId = await this.getMaxIdVendaItens()

    // 4. Map DB Items to AcertoItem
    const items: AcertoItem[] = dbItems
      .map((dbItem) => {
        // Find matching product
        const product = products.find(
          (p) => p.CODIGO === dbItem['COD. PRODUTO'],
        )

        // If product not found by code, we can't reliably link it.
        if (!product) return null

        currentMaxId++

        // Mapping Logic:
        // CODIGO -> COD. PRODUTO
        // PRODUTO -> MERCADORIA
        // TIPO -> TIPO
        // SALDO INICIAL -> SALDO FINAL (from previous record)
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
          idVendaItens: currentMaxId,
        }
      })
      .filter((i) => i !== null) as AcertoItem[]

    return { items, nextId: currentMaxId + 1 }
  },

  async getMonthlyAverage(clienteId: number): Promise<number> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"VALOR VENDIDO", "DATA DO ACERTO"')
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(100) // Last 100 transactions to estimate average

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

      const monthKey = date.substring(0, 7) // YYYY-MM
      const val = parseCurrency(valStr)

      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + val
    })

    const months = Object.values(monthlyTotals)
    if (months.length === 0) return 0

    const total = months.reduce((a, b) => a + b, 0)
    return total / months.length
  },

  async getAcertoHistory(clienteId: number) {
    // Fetch last 500 rows to reconstruct history
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "DATA DO ACERTO", "HORA DO ACERTO", "FUNCIONÁRIO", "VALOR VENDIDO", DETALHES_PAGAMENTO, "DESCONTO POR GRUPO"',
      )
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .order('"DATA DO ACERTO"', { ascending: false })
      .order('"HORA DO ACERTO"', { ascending: false })
      .limit(500)

    if (error) throw error
    if (!data) return []

    // Group by Order Number to create "Settlements"
    const ordersMap = new Map<number, any>()
    const orderIds: number[] = []

    data.forEach((row) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        orderIds.push(orderId)
        ordersMap.set(orderId, {
          id: orderId,
          data: row['DATA DO ACERTO'],
          hora: row['HORA DO ACERTO'],
          vendedor: row['FUNCIONÁRIO'],
          valorVendaTotal: 0,
          desconto: row['DESCONTO POR GRUPO'],
          pagamentos: row['DETALHES_PAGAMENTO'],
        })
      }

      const order = ordersMap.get(orderId)
      // Accumulate sales value for all items in the order
      order.valorVendaTotal += parseCurrency(row['VALOR VENDIDO'])
    })

    // Fetch payments from RECEBIMENTOS for these orders
    // This ensures we get the most accurate payment info stored in the structured table
    const paymentsMap = new Map<number, number>()
    if (orderIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('RECEBIMENTOS')
        .select('venda_id, valor_pago')
        .in('venda_id', orderIds)

      if (!paymentsError && paymentsData) {
        paymentsData.forEach((p) => {
          const current = paymentsMap.get(p.venda_id) || 0
          paymentsMap.set(p.venda_id, current + (Number(p.valor_pago) || 0))
        })
      }
    }

    // Process calculated fields
    return Array.from(ordersMap.values()).map((order) => {
      const descontoStr = order.desconto || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
      const valorDesconto = order.valorVendaTotal * discountFactor
      const saldoAPagar = order.valorVendaTotal - valorDesconto

      // Prioritize RECEBIMENTOS table, fallback to JSON in BANCO_DE_DADOS if no records in RECEBIMENTOS
      // This handles backward compatibility for old records that might not be in RECEBIMENTOS
      let valorPago = paymentsMap.get(order.id) || 0

      // If no payment found in RECEBIMENTOS (or value is 0), try to use the legacy JSON column from BANCO_DE_DADOS
      if (valorPago === 0 && Array.isArray(order.pagamentos)) {
        valorPago = order.pagamentos.reduce(
          (acc: number, p: any) => acc + (Number(p.value) || 0),
          0,
        )
      }

      return {
        ...order,
        saldoAPagar,
        valorPago,
        debito: saldoAPagar - valorPago,
      }
    })
  },

  async saveTransaction(
    client: ClientRow,
    employee: Employee,
    items: AcertoItem[],
    date: Date,
    acertoTipo: string,
    payments: PaymentEntry[],
  ) {
    // 1. Get Context (Order Number)
    const nextPedido = await this.getNextNumeroPedido()

    const dataAcertoStr = format(date, 'yyyy-MM-dd')
    const horaAcerto = format(date, 'HH:mm:ss')

    // 2. Fetch current product prices (Automated Price Lookup)
    const productIds = items.map((i) => i.produtoId)

    if (productIds.length === 0) return

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
        (p) => `${p.method} R$ ${formatCurrency(p.value)} (${p.installments}x)`,
      )
      .join(' | ')

    const formaPagamento = paymentString || acertoTipo

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

      return {
        'ID VENDA ITENS': item.idVendaItens,
        'NÚMERO DO PEDIDO': nextPedido,
        'DATA DO ACERTO': dataAcertoStr,
        'HORA DO ACERTO': horaAcerto,
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
        DETALHES_PAGAMENTO: payments,
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
      // If we have installments details, use them to create separate entries
      if (
        payment.installments > 1 &&
        payment.details &&
        payment.details.length > 0
      ) {
        payment.details.forEach((detail) => {
          recebimentosToInsert.push({
            venda_id: nextPedido,
            cliente_id: client.CODIGO,
            funcionario_id: employee.id,
            forma_pagamento: payment.method,
            valor_pago: detail.value,
            // Combine date with 12:00 time to ensure valid timestamp
            data_pagamento: new Date(
              `${detail.dueDate}T12:00:00`,
            ).toISOString(),
          })
        })
      } else {
        // Single payment entry
        recebimentosToInsert.push({
          venda_id: nextPedido,
          cliente_id: client.CODIGO,
          funcionario_id: employee.id,
          forma_pagamento: payment.method,
          valor_pago: payment.value,
          // Use dueDate if available (set to 12:00 to avoid timezone issues), otherwise now
          data_pagamento: payment.dueDate
            ? new Date(`${payment.dueDate}T12:00:00`).toISOString()
            : new Date().toISOString(),
        })
      }
    })

    if (recebimentosToInsert.length > 0) {
      const { error: recebimentosError } = await supabase
        .from('RECEBIMENTOS')
        .insert(recebimentosToInsert)

      if (recebimentosError) {
        console.error('Error inserting recebimentos:', recebimentosError)
        // Throw error to alert failure even if BANCO_DE_DADOS insert was successful
        // This ensures the caller knows something went wrong with critical financial data
        throw recebimentosError
      }
    }
  },
}
