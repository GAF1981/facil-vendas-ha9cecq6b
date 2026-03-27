import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { ProductRow } from '@/types/product'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { format } from 'date-fns'
import { PaymentEntry, PaymentMethodType } from '@/types/payment'
import { RecebimentoInsert } from '@/types/recebimento'
import { rotaService } from '@/services/rotaService'
import { reportsService } from '@/services/reportsService'
import { estoqueCarroService } from '@/services/estoqueCarroService'

export const bancoDeDadosService = {
  async hasOutstandingBalance(clienteId: number): Promise<boolean> {
    const { count, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"ID VENDA ITENS"', { count: 'exact' })
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .gt('SALDO FINAL', 0)
      .limit(1)

    if (error) {
      console.error('Error checking client balance:', error)
      return false
    }
    return (count || 0) > 0
  },

  async checkClientHasOrders(
    clienteId: number,
    excludeOrderId?: number,
  ): Promise<boolean> {
    let query = supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "VALOR VENDIDO", "QUANTIDADE VENDIDA", "SALDO FINAL", "NOVAS CONSIGNAÇÕES"',
      )
      .eq('"CÓDIGO DO CLIENTE"', clienteId)
      .not('"NÚMERO DO PEDIDO"', 'is', null)

    if (excludeOrderId) {
      query = query.neq('"NÚMERO DO PEDIDO"', excludeOrderId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error checking client orders:', error)
      return false
    }

    // Ignore drafts or test records: an effective order must have some movement
    const validOrders = (data || []).filter((row) => {
      const valorVendido = parseCurrency(row['VALOR VENDIDO'])
      const qtdVendida = parseCurrency(row['QUANTIDADE VENDIDA'])
      const saldoFinal = Number(row['SALDO FINAL']) || 0
      const novasConsignacoes = parseCurrency(row['NOVAS CONSIGNAÇÕES'])

      return (
        valorVendido > 0 ||
        qtdVendida > 0 ||
        saldoFinal > 0 ||
        novasConsignacoes > 0
      )
    })

    return validOrders.length > 0
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
    return (data?.['ID VENDA ITENS'] || 0) as number
  },

  async getMaxNumeroPedido() {
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

  async getNextNumeroPedido() {
    const max = await this.getMaxNumeroPedido()
    return max + 1
  },

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
      .map((dbItem: any) => {
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
          codigoInterno: product.codigo_interno || dbItem.codigo_interno || '',
          codigoBarras: product['CÓDIGO BARRAS'] || dbItem.codigo_barras || '',
          produtoNome: dbItem['MERCADORIA'] || product.PRODUTO || 'Sem nome',
          tipo: dbItem['TIPO'],
          precoUnitario: precoUnitario,
          saldoInicial: saldoInicial,
          contagem: contagem,
          quantVendida: quantVendida,
          valorVendido: valorVendido,
          saldoFinal: 0,
          idVendaItens: null,
        }
      })
      .filter((i) => i !== null) as AcertoItem[]

    items.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome))

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
    const { data: debitosData, error: debitosError } = await supabase
      .from('debitos_historico')
      .select('*')
      .eq('cliente_codigo', clienteId)
      .order('data_acerto', { ascending: false })
      .order('pedido_id', { ascending: false })
      .limit(1000)

    if (debitosError) throw debitosError

    const { data: ajustesData, error: ajustesError } = await supabase
      .from('AJUSTE_SALDO_INICIAL')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data_acerto', { ascending: false })
      .limit(100)

    if (ajustesError) throw ajustesError

    const orderIds = debitosData?.map((d) => d.pedido_id) || []

    const paymentsMap = new Map<number, any>()
    const collectionCountsMap = new Map<number, number>()

    if (orderIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('RECEBIMENTOS')
        .select(
          'id, venda_id, valor_pago, valor_registrado, forma_pagamento, vencimento, created_at, FUNCIONARIOS(nome_completo)',
        )
        .in('venda_id', orderIds)

      paymentsData?.forEach((p: any) => {
        if (!p.venda_id) return
        const existing = paymentsMap.get(p.venda_id) || {
          total: 0,
          methods: new Set<string>(),
          details: [],
        }
        existing.total += p.valor_pago || 0
        if (p.forma_pagamento) existing.methods.add(p.forma_pagamento)
        existing.details.push({
          id: p.id,
          method: p.forma_pagamento,
          value: p.valor_pago || 0,
          registeredValue: p.valor_registrado || 0,
          date: p.vencimento || '',
          employeeName: p.FUNCIONARIOS?.nome_completo || 'N/A',
          createdAt: p.created_at || '',
        })
        paymentsMap.set(p.venda_id, existing)
      })

      const { data: actionsData } = await supabase
        .from('acoes_cobranca')
        .select('pedido_id')
        .in('pedido_id', orderIds)

      actionsData?.forEach((a) => {
        if (a.pedido_id) {
          collectionCountsMap.set(
            a.pedido_id,
            (collectionCountsMap.get(a.pedido_id) || 0) + 1,
          )
        }
      })
    }

    const debitosEntries = (debitosData || []).map((row) => {
      const paymentInfo = paymentsMap.get(row.pedido_id)
      let dataStr = ''
      let horaStr = row.hora_acerto || ''

      if (row.data_acerto) {
        try {
          if (row.data_acerto.includes('T')) {
            dataStr = row.data_acerto.split('T')[0]
            if (!horaStr) {
              horaStr = row.data_acerto.split('T')[1].substring(0, 5)
            }
          } else {
            dataStr = row.data_acerto.split(' ')[0]
          }
        } catch (e) {
          dataStr = row.data_acerto
        }
      }

      const valorVendaTotal = row.valor_venda || 0
      const desconto = row.desconto || 0
      const valorPago = row.valor_pago || 0
      const debito = Math.max(0, valorVendaTotal - desconto - valorPago)

      return {
        id: row.pedido_id,
        data: dataStr,
        hora: horaStr,
        vendedor: row.vendedor_nome || '-',
        valorVendaTotal,
        saldoAPagar: row.saldo_a_pagar || valorVendaTotal - desconto,
        valorPago,
        debito,
        desconto,
        methods: paymentInfo ? Array.from(paymentInfo.methods).join(', ') : '-',
        paymentDetails: paymentInfo ? paymentInfo.details : [],
        collectionActionCount: collectionCountsMap.get(row.pedido_id) || 0,
        mediaMensal: row.media_mensal || null,
        cliente_nome: row.cliente_nome,
        isAjuste: false,
      }
    })

    const ajustesMap = new Map<string, any>()
    ;(ajustesData || []).forEach((row) => {
      const key = row.numero_pedido
        ? `pedido_${row.numero_pedido}`
        : `data_${row.data_acerto?.split('T')[0]}_${row.vendedor_id}`
      if (!ajustesMap.has(key)) {
        let dataStr = ''
        if (row.data_acerto) {
          dataStr = row.data_acerto.includes('T')
            ? row.data_acerto.split('T')[0]
            : row.data_acerto.split(' ')[0]
        }
        ajustesMap.set(key, {
          id: row.numero_pedido || row.id,
          data: dataStr,
          hora: '00:00',
          vendedor: row.vendedor_nome || '-',
          valorVendaTotal: 0,
          saldoAPagar: 0,
          valorPago: 0,
          debito: 0,
          mediaMensal: null,
          cliente_nome: row.cliente_nome,
          isAjuste: true,
          quantidadeAlterada: 0,
        })
      }
      ajustesMap.get(key).quantidadeAlterada += row.quantidade_alterada || 0
    })

    const ajustesEntries = Array.from(ajustesMap.values())

    const combined = [...debitosEntries, ...ajustesEntries].sort((a, b) => {
      const dtA = new Date(`${a.data}T${a.hora || '00:00:00'}`).getTime()
      const dtB = new Date(`${b.data}T${b.hora || '00:00:00'}`).getTime()
      return dtB - dtA
    })

    const acertosOnly = combined.filter((c) => !c.isAjuste)
    for (let i = 0; i < acertosOnly.length; i++) {
      const current = acertosOnly[i]
      if (!current.mediaMensal && i < acertosOnly.length - 1) {
        const previous = acertosOnly[i + 1]
        try {
          const d1 = new Date(`${current.data}T${current.hora || '00:00:00'}`)
          const d2 = new Date(`${previous.data}T${previous.hora || '00:00:00'}`)
          const diffTime = Math.abs(d1.getTime() - d2.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > 0) {
            current.mediaMensal = current.valorVendaTotal / (diffDays / 30)
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return combined
  },

  async getHistoryForPdf(clienteId: number) {
    const { data: debitosData, error: debitosError } = await supabase
      .from('debitos_historico')
      .select('*')
      .eq('cliente_codigo', clienteId)
      .order('data_acerto', { ascending: false })
      .order('pedido_id', { ascending: false })
      .limit(20)

    if (debitosError) throw debitosError

    const { data: ajustesData, error: ajustesError } = await supabase
      .from('AJUSTE_SALDO_INICIAL')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('data_acerto', { ascending: false })
      .limit(100)

    if (ajustesError) throw ajustesError

    const ajustesEntriesMap = new Map<string, any>()
    ;(ajustesData || []).forEach((row) => {
      const key = row.numero_pedido
        ? `pedido_${row.numero_pedido}`
        : `data_${row.data_acerto?.split('T')[0]}_${row.vendedor_id}`
      if (!ajustesEntriesMap.has(key)) {
        ajustesEntriesMap.set(key, {
          type: 'AJUSTE',
          id: row.numero_pedido || row.id,
          data: row.data_acerto,
          hora: '00:00:00',
          vendedor: row.vendedor_nome || '-',
          valorVendaTotal: 0,
          saldoAPagar: 0,
          valorPago: 0,
          debito: 0,
          mediaMensal: 0,
          desconto: 0,
          isAjuste: true,
          quantidadeAlterada: 0,
        })
      }
      ajustesEntriesMap.get(key).quantidadeAlterada +=
        row.quantidade_alterada || 0
    })

    const ajustesEntries = Array.from(ajustesEntriesMap.values())

    const debitosEntries = debitosData.map((row) => {
      const valorVendaTotal = row.valor_venda || 0
      const desconto = row.desconto || 0
      const valorPago = row.valor_pago || 0
      const debito = Math.max(0, valorVendaTotal - desconto - valorPago)

      return {
        type: 'ACERTO',
        id: row.pedido_id,
        data: row.data_acerto,
        hora: '00:00:00',
        vendedor: row.vendedor_nome || '-',
        valorVendaTotal,
        saldoAPagar: row.saldo_a_pagar || valorVendaTotal - desconto,
        valorPago,
        debito,
        mediaMensal: row.media_mensal || 0,
        desconto,
      }
    })

    const combined = [...debitosEntries, ...ajustesEntries].sort((a, b) => {
      const d1 = new Date(a.data || 0).getTime()
      const d2 = new Date(b.data || 0).getTime()
      return d2 - d1
    })

    const acertoEntries = combined.filter((e) => e.type === 'ACERTO')

    const result = combined.map((row) => {
      let mediaMensal = row.mediaMensal || 0

      if (row.type === 'ACERTO' && !mediaMensal) {
        const indexInAcertos = acertoEntries.findIndex((e) => e.id === row.id)
        if (indexInAcertos >= 0 && indexInAcertos < acertoEntries.length - 1) {
          const current = acertoEntries[indexInAcertos]
          const previous = acertoEntries[indexInAcertos + 1]
          try {
            const d1 = new Date(current.data)
            const d2 = new Date(previous.data)
            const diffTime = Math.abs(d1.getTime() - d2.getTime())
            const diffDays = Math.max(
              1,
              Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
            )
            const factor = diffDays / 30
            mediaMensal = current.valorVendaTotal / factor
          } catch (e) {
            // ignore date errors
          }
        }
      }

      return {
        id: row.id,
        data: row.data,
        valorVendaTotal: row.valorVendaTotal,
        saldoAPagar: row.saldoAPagar,
        valorPago: row.valorPago,
        debito: row.debito,
        vendedor: row.vendedor,
        mediaMensal: mediaMensal,
        desconto: row.desconto,
        isAjuste: row.isAjuste,
        quantidadeAlterada: row.quantidadeAlterada,
      }
    })

    return result.slice(0, 10)
  },

  async getOrderDetails(orderId: number) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (itemsError) throw itemsError

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('RECEBIMENTOS')
      .select('*, FUNCIONARIOS(nome_completo)')
      .eq('venda_id', orderId)

    if (paymentsError) throw paymentsError
    return { items: itemsData || [], payments: paymentsData || [] }
  },

  async getEditableOrderDetails(orderId: number) {
    const { items: dbItems, payments: dbPayments } =
      await this.getOrderDetails(orderId)

    if (dbItems.length === 0) return null

    const clientId = dbItems[0]['CÓDIGO DO CLIENTE']
    const employeeId = dbItems[0]['CODIGO FUNCIONARIO']
    const nfVenda = dbItems[0].nota_fiscal_venda || 'NÃO'

    let originalDate = dbItems[0]['DATA E HORA']
    if (!originalDate) {
      const d = dbItems[0]['DATA DO ACERTO']
      const t = dbItems[0]['HORA DO ACERTO'] || '00:00:00'
      originalDate = `${d}T${t}`
    }
    const sessionId = dbItems[0].session_id

    const codigos = [
      ...new Set(dbItems.map((i: any) => i['COD. PRODUTO']).filter(Boolean)),
    ]
    const { data: products } = await supabase
      .from('PRODUTOS')
      .select('ID, CODIGO, PRODUTO, codigo_interno, "CÓDIGO BARRAS"')
      .in('CODIGO', codigos)

    const items: AcertoItem[] = dbItems.map((dbItem: any) => {
      const p = products?.find((p) => p.CODIGO === dbItem['COD. PRODUTO'])
      return {
        uid: Math.random().toString(36).substr(2, 9),
        produtoId: p?.ID || 0,
        produtoCodigo: dbItem['COD. PRODUTO'],
        codigoInterno: dbItem.codigo_interno || p?.codigo_interno || '',
        codigoBarras: dbItem.codigo_barras || p?.['CÓDIGO BARRAS'] || '',
        produtoNome: dbItem['MERCADORIA'] || p?.PRODUTO || '',
        tipo: dbItem['TIPO'],
        precoUnitario: parseCurrency(dbItem['PREÇO VENDIDO']),
        saldoInicial: dbItem['SALDO INICIAL'] || 0,
        contagem: dbItem['CONTAGEM'] || 0,
        quantVendida: parseCurrency(dbItem['QUANTIDADE VENDIDA']),
        valorVendido: parseCurrency(dbItem['VALOR VENDIDO']),
        saldoFinal: dbItem['SALDO FINAL'] || 0,
        idVendaItens: dbItem['ID VENDA ITENS'],
      }
    })

    const paymentsMap = new Map<string, PaymentEntry>()
    dbPayments.forEach((p: any) => {
      const method = p.forma_pagamento as PaymentMethodType
      if (!paymentsMap.has(method)) {
        paymentsMap.set(method, {
          method,
          value: 0,
          paidValue: 0,
          installments: 0,
          dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
          hasZeroDownPayment: false,
          details: [],
        })
      }
      const entry = paymentsMap.get(method)!
      entry.value += p.valor_registrado || 0
      entry.paidValue += p.valor_pago || 0
      entry.installments += 1

      if ((p.valor_registrado || 0) > 0 || (p.valor_pago || 0) > 0) {
        entry.details!.push({
          number: entry.installments,
          value: p.valor_registrado || 0,
          paidValue: p.valor_pago || 0,
          dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
        })
      }
    })

    const payments = Array.from(paymentsMap.values())
    payments.forEach((p) => {
      p.details?.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      if (p.details && p.details.length > 0) {
        p.details.forEach((d, i) => (d.number = i + 1))
      }
      if (p.installments > 1 && p.details && p.details.length > 0) {
        p.dueDate = p.details[0].dueDate
      }
    })

    return {
      clientId,
      employeeId,
      items,
      payments,
      nfVenda,
      originalDate,
      sessionId,
    }
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
    const timestamp = payload.data_acerto
      ? new Date(payload.data_acerto).toISOString()
      : new Date().toISOString()

    const { error } = await supabase.from('AJUSTE_SALDO_INICIAL').insert({
      ...payload,
      quantidade_alterada: quantity,
      data_acerto: timestamp,
    } as any)
    if (error) throw error
  },

  async editTransaction(
    client: ClientRow,
    employee: Employee,
    items: AcertoItem[],
    date: Date,
    acertoTipo: string,
    payments: PaymentEntry[],
    notaFiscalVenda: string,
    orderId: number,
    sessionId?: number | null,
  ) {
    await supabase
      .from('ESTOQUE CARRO: CARRO PARA O CLIENTE')
      .delete()
      .eq('pedido', orderId)
    await supabase
      .from('ESTOQUE CARRO: CLIENTE PARA O CARRO')
      .delete()
      .eq('pedido', orderId)
    await supabase.from('RECEBIMENTOS').delete().eq('venda_id', orderId)
    await supabase
      .from('BANCO_DE_DADOS')
      .delete()
      .eq('"NÚMERO DO PEDIDO"', orderId)

    return await this.saveTransaction(
      client,
      employee,
      items,
      date,
      acertoTipo,
      payments,
      notaFiscalVenda,
      orderId,
      sessionId,
    )
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
    customSessionId?: number | null,
  ): Promise<number> {
    const nextPedido =
      customOrderNumber ?? (await this.reserveNextOrderNumber())
    const dataAcertoStr = format(date, 'yyyy-MM-dd')
    const horaAcerto = format(date, 'HH:mm:ss')
    const dataEHora = date.toISOString()

    const activeRoute = await rotaService.getActiveRota()
    const activeRouteId = activeRoute?.id || null

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

    const totalSalesAll = items.reduce(
      (acc, i) =>
        acc + (priceMap.get(i.produtoId) || i.precoUnitario) * i.quantVendida,
      0,
    )

    const descontoStr = client.Desconto || '0'
    let discountFactor = 0
    if (descontoStr.includes('%')) {
      discountFactor = parseCurrency(descontoStr.replace('%', '')) / 100
    } else {
      const flat = parseCurrency(descontoStr)
      discountFactor = totalSalesAll > 0 ? flat / totalSalesAll : 0
    }

    const paymentString = payments
      .map(
        (p) =>
          `${p.method} Reg: R$ ${formatCurrency(p.value)} Pago: R$ ${formatCurrency(p.paidValue)} (${p.installments}x)`,
      )
      .join(' | ')
    const formaPagamento = paymentString || acertoTipo

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

      const valorConsignadoVendaVal = saldoFinal * currentPrice
      const valorConsignadoCustoVal =
        valorConsignadoVendaVal - valorConsignadoVendaVal * discountFactor
      const itemDebt = valorVendidoVal * (1 - discountFactor)

      const row: any = {
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
        codigo_interno: item.codigoInterno,
        codigo_barras: item.codigoBarras,
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
        nota_fiscal_cadastro: nfCadastro,
        nota_fiscal_venda: nfVenda,
        nota_fiscal_emitida: statusNf,
      }

      if (customSessionId !== undefined && customSessionId !== null) {
        row.session_id = customSessionId
      }

      return row
    })

    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowsToInsert as any)
    if (error) throw error

    const recebimentosToInsert: RecebimentoInsert[] = []
    payments.forEach((payment) => {
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
          valor_pago: detail.paidValue || 0,
          vencimento: new Date(`${detail.dueDate}T12:00:00`).toISOString(),
          ID_da_fêmea: nextPedido,
          rota_id: activeRouteId,
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

    if (nfVenda === 'SIM') {
      const { error: nfError } = await supabase
        .from('NOTA_FISCAL')
        .insert({ venda_id: nextPedido, cliente_id: client.CODIGO })
      if (nfError) console.error('Error inserting nota fiscal record:', nfError)
    }

    if (nfCadastro === 'NÃO' && nfVenda === 'SIM') {
      const { error: clientUpdateError } = await supabase
        .from('CLIENTES')
        .update({ 'NOTA FISCAL': 'SIM' } as any)
        .eq('CODIGO', client.CODIGO)

      if (clientUpdateError) {
        console.error(
          'Error auto-updating client tax status:',
          clientUpdateError,
        )
      }
    }

    try {
      await rotaService.checkAndDecrementXNaRota(client.CODIGO, date)
    } catch (rotaError) {
      console.error('Error updating Rota counter on settlement:', rotaError)
    }

    try {
      await reportsService.updateDebtHistoryForOrder(nextPedido)
    } catch (debtError) {
      console.error('Error auto-updating debt history:', debtError)
    }

    try {
      await estoqueCarroService.syncStockFromSettlement(
        employee.id,
        employee.nome_completo,
        date,
        nextPedido,
        items,
      )
    } catch (stockError) {
      console.error('Error syncing stock movements:', stockError)
    }

    return nextPedido
  },

  async generateOrderReceipt(
    orderId: number,
    type: 'standard' | 'settlement' = 'standard',
  ): Promise<Blob> {
    const { data: orderData, error: orderError } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*, codigo_interno, codigo_barras' as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (orderError) throw orderError
    if (!orderData || orderData.length === 0)
      throw new Error('Pedido não encontrado.')

    const firstItem = orderData[0]
    const clientId = firstItem['CÓDIGO DO CLIENTE']
    const employeeId = firstItem['CODIGO FUNCIONARIO']

    const { data: clientData } = await supabase
      .from('CLIENTES')
      .select('*')
      .eq('CODIGO', clientId)
      .single()

    const { data: employeeData } = await supabase
      .from('FUNCIONARIOS')
      .select('*')
      .eq('id', employeeId)
      .single()

    const { data: paymentsData } = await supabase
      .from('RECEBIMENTOS')
      .select('*')
      .eq('venda_id', orderId)

    const productIds = [
      ...new Set(orderData.map((d: any) => d['COD. PRODUTO']).filter(Boolean)),
    ]
    let productsData: any[] = []
    if (productIds.length > 0) {
      const { data } = await supabase
        .from('PRODUTOS')
        .select('ID, codigo_interno, "CÓDIGO BARRAS"')
        .in('ID', productIds)
      productsData = data || []
    }

    const items = orderData.map((d: any) => {
      const p = productsData.find((prod) => prod.ID === d['COD. PRODUTO'])
      return {
        produtoNome: d.MERCADORIA,
        produtoCodigo: d['COD. PRODUTO'],
        codigoInterno: d.codigo_interno || p?.codigo_interno || '',
        codigoBarras: d.codigo_barras || p?.['CÓDIGO BARRAS'] || '',
        tipo: d['TIPO'],
        precoUnitario: d['PREÇO VENDIDO']
          ? parseCurrency(d['PREÇO VENDIDO'])
          : 0,
        saldoInicial: Number(d['SALDO INICIAL']) || 0,
        contagem: Number(d.CONTAGEM) || 0,
        quantVendida: Number(d['QUANTIDADE VENDIDA']) || 0,
        saldoFinal: Number(d['SALDO FINAL']) || 0,
        valorVendido: parseCurrency(d['VALOR VENDIDO']),
        novasConsignacoes: d['NOVAS CONSIGNAÇÕES']
          ? parseCurrency(d['NOVAS CONSIGNAÇÕES'])
          : 0,
        recolhido: d['RECOLHIDO'] ? parseCurrency(d['RECOLHIDO']) : 0,
      }
    })

    const totalVendido = items.reduce(
      (acc, item) => acc + (item.valorVendido || 0),
      0,
    )

    const valorAcerto = orderData.reduce(
      (acc, d) => acc + (Number(d['VALOR DEVIDO']) || 0),
      0,
    )

    const valorDesconto = Math.max(0, totalVendido - valorAcerto)

    const installments = (paymentsData || [])
      .filter((p) => (p.valor_registrado || 0) > 0)
      .map((p) => ({
        method: p.forma_pagamento,
        dueDate: p.vencimento,
        value: p.valor_registrado,
      }))

    let history: any[] = []
    let monthlyAverage = 0

    if (clientId) {
      try {
        history = await this.getHistoryForPdf(clientId)
        monthlyAverage = history.length > 0 ? history[0].mediaMensal || 0 : 0
      } catch (histError) {
        console.error('Failed to fetch history for PDF', histError)
      }
    }

    const payload = {
      reportType: type === 'standard' ? 'detailed-order' : 'thermal-history',
      format: type === 'standard' ? 'a4' : '80mm',
      client: clientData,
      employee: employeeData,
      items: items,
      date: firstItem['DATA DO ACERTO'] || new Date().toISOString(),
      orderNumber: orderId,
      totalVendido: totalVendido,
      valorDesconto: valorDesconto,
      valorAcerto: valorAcerto,
      installments: installments,
      history,
      monthlyAverage,
      payments: [],
    }

    const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: payload,
      },
    )

    if (pdfError) throw pdfError
    if (!(pdfBlob instanceof Blob)) throw new Error('Falha ao gerar PDF')

    return pdfBlob
  },
}
