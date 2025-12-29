import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { ProductRow } from '@/types/product'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { format, parseISO, differenceInDays } from 'date-fns'
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
    // 1. Fetch Orders from BANCO_DE_DADOS
    // Fetch a larger limit to ensure we get complete orders given it's a line-item table
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

    // 2. Identify unique Order IDs to fetch relevant payments
    const orderIds = [
      ...new Set(
        data
          .map((item) => item['NÚMERO DO PEDIDO'])
          .filter((id) => id !== null && id !== undefined),
      ),
    ] as number[]

    // 3. Fetch Payments from RECEBIMENTOS for these orders
    let paymentsMap = new Map<
      number,
      {
        total: number
        methods: Set<string>
        details: {
          method: string
          value: number // Valor Pago
          registeredValue: number // Valor Registrado
          date: string
          employeeName: string
          createdAt: string
        }[]
      }
    >()

    if (orderIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'venda_id, valor_pago, valor_registrado, forma_pagamento, data_pagamento, created_at, FUNCIONARIOS(nome_completo)',
        )
        .in('venda_id', orderIds)

      if (paymentsError) {
        console.error('Error fetching receipts:', paymentsError)
      } else if (paymentsData) {
        // Aggregate payments by venda_id
        paymentsData.forEach((p: any) => {
          if (!p.venda_id) return
          const existing = paymentsMap.get(p.venda_id) || {
            total: 0,
            methods: new Set<string>(),
            details: [],
          }
          existing.total += p.valor_pago || 0
          if (p.forma_pagamento) existing.methods.add(p.forma_pagamento)

          // Add detail
          existing.details.push({
            method: p.forma_pagamento,
            value: p.valor_pago || 0,
            registeredValue: p.valor_registrado || 0,
            date: p.data_pagamento || '',
            employeeName: p.FUNCIONARIOS?.nome_completo || 'N/A',
            createdAt: p.created_at || '',
          })

          paymentsMap.set(p.venda_id, existing)
        })
      }
    }

    // 4. Group by Order Number to create "Settlements"
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
      // Accumulate sales value for all items in the order
      order.valorVendaTotal += parseCurrency(row['VALOR VENDIDO'])
    })

    // 5. Convert map to array and Sort by Date/Time Descending
    const orders = Array.from(ordersMap.values()).sort((a, b) => {
      const dtA = new Date(`${a.data}T${a.hora || '00:00:00'}`).getTime()
      const dtB = new Date(`${b.data}T${b.hora || '00:00:00'}`).getTime()
      return dtB - dtA
    })

    // 6. Process calculated fields and financial data
    const result = orders.map((order) => {
      const descontoStr = order.desconto || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
      const valorDesconto = order.valorVendaTotal * discountFactor
      const saldoAPagar = order.valorVendaTotal - valorDesconto

      // Retrieve "Valor Pago" from RECEBIMENTOS map
      const paymentInfo = paymentsMap.get(order.id)
      const valorPago = paymentInfo ? paymentInfo.total : 0
      const uniqueMethods = paymentInfo
        ? Array.from(paymentInfo.methods).join(', ')
        : '-'
      const paymentDetails = paymentInfo ? paymentInfo.details : []

      // Debito = Saldo a Pagar - Valor Pago (Aggregated from RECEBIMENTOS)
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

    // Calculate Media Mensal based on intervals
    for (let i = 0; i < result.length; i++) {
      const current = result[i]
      let mediaMensal = null

      if (i < result.length - 1) {
        const previous = result[i + 1]
        // Parse dates safely
        const dateCurrent = parseISO(current.data)
        const datePrev = parseISO(previous.data)

        const diffDays = differenceInDays(dateCurrent, datePrev)

        // Formula: VALOR VENDIDO / ((Data Atual - Data Anterior) / 30)
        if (diffDays > 0) {
          const factor = diffDays / 30
          mediaMensal = current.valorVendaTotal / factor
        }
      }

      result[i].mediaMensal = mediaMensal
    }

    return result
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
        (p) =>
          `${p.method} Reg: R$ ${formatCurrency(p.value)} Pago: R$ ${formatCurrency(p.paidValue)} (${p.installments}x)`,
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

      // Calculate VALOR DEVIDO per item
      // Logic: (Item Sales Value) - (Item Sales Value * Discount)
      // This distributes the debt proportionally to items
      const itemDebt = valorVendidoVal * (1 - discountFactor)

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
        'VALOR DEVIDO': itemDebt, // Populate new column
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
            valor_registrado: detail.value, // Captured Separately
            valor_pago: 0, // Future installments are debts, not paid yet
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
          valor_registrado: payment.value, // Captured Separately
          valor_pago: payment.paidValue, // Manual entry required now
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
        throw recebimentosError
      }
    }
  },
}
