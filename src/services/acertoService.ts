import { supabase } from '@/lib/supabase/client'
import { Acerto } from '@/types/acerto'
import { bancoDeDadosService } from './bancoDeDadosService'
import { clientsService } from './clientsService'
import { parseCurrency } from '@/lib/formatters'
import { cobrancaService } from './cobrancaService'

export const acertoService = {
  async saveAcerto(acerto: Acerto) {
    const { data: acertoData, error: acertoError } = await supabase
      .from('ACERTOS')
      .insert({
        CLIENTE_ID: acerto.clienteId,
        FUNCIONARIO_ID: acerto.funcionarioId,
        VALOR_TOTAL: acerto.valorTotal,
        OBSERVACOES: acerto.observacoes,
        DATA_ACERTO: new Date().toISOString(),
      })
      .select()
      .single()

    if (acertoError) throw acertoError
    if (!acertoData) throw new Error('Falha ao criar acerto')

    const itemsToInsert = acerto.itens.map((item) => ({
      ACERTO_ID: acertoData.ID,
      PRODUTO_ID: item.produtoId,
      SALDO_INICIAL: item.saldoInicial,
      CONTAGEM: item.contagem,
      QUANT_VENDIDA: item.quantVendida,
      PRECO_UNITARIO: item.precoUnitario,
      VALOR_VENDIDO: item.valorVendido,
      SALDO_FINAL: item.saldoFinal,
    }))

    const { error: itemsError } = await supabase
      .from('ITENS_ACERTO')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    return acertoData
  },

  async generatePdf(
    data: any,
    options?: {
      preview?: boolean
      signature?: string | null
      format?: 'A4' | '80mm'
    },
  ) {
    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          ...data,
          reportType: 'acerto', // Explicitly type as acerto for edge function routing
          preview: options?.preview ?? false,
          signature: options?.signature ?? null,
          format: options?.format ?? '80mm',
        },
        responseType: 'blob', // Important for file download
      } as any,
    )

    if (error) throw error
    return blob as Blob
  },

  async reprintOrder(
    orderId: number,
    issuerName?: string,
    format: 'A4' | '80mm' = '80mm',
  ) {
    return this.generateDocument(
      orderId,
      'ACERTO (REIMPRESSÃO)',
      false,
      issuerName,
      format,
    )
  },

  async reprintReceipt(
    orderId: number,
    issuerName?: string,
    format: 'A4' | '80mm' = '80mm',
  ) {
    return this.generateDocument(
      orderId,
      'RECIBO DE PAGAMENTO',
      true,
      issuerName,
      format,
    )
  },

  // Shared logic for generating document data structure from Order ID
  async generateDocument(
    orderId: number,
    acertoTipo: string,
    isReceipt: boolean,
    issuerName?: string,
    format: 'A4' | '80mm' = 'A4',
  ) {
    const { items: dbItems, payments: dbPayments } =
      await bancoDeDadosService.getOrderDetails(orderId)

    if (dbItems.length === 0 && dbPayments.length === 0) {
      throw new Error('Pedido não encontrado.')
    }

    let clientId: number | null = null
    let funcionarioName = 'Não identificado'
    let dateStr = new Date().toISOString()
    let descontoStr = '0'

    if (dbItems.length > 0) {
      const first = dbItems[0]
      clientId = first['CÓDIGO DO CLIENTE']
      funcionarioName = first['FUNCIONÁRIO'] || 'Não identificado'
      descontoStr = first['DESCONTO POR GRUPO'] || '0'

      if (first['DATA E HORA']) {
        dateStr = first['DATA E HORA']
      } else if (first['DATA DO ACERTO']) {
        const d = first['DATA DO ACERTO']
        const t = first['HORA DO ACERTO'] || '12:00:00'
        try {
          dateStr = new Date(`${d}T${t}`).toISOString()
        } catch (e) {
          dateStr = new Date().toISOString()
        }
      }
    } else if (dbPayments.length > 0) {
      const first = dbPayments[0]
      clientId = first.cliente_id
      if (first.created_at) dateStr = first.created_at
    }

    if (!clientId) throw new Error('Dados do cliente não encontrados.')

    const client = await clientsService.getById(clientId)

    // Fetch last Acerto Date for this client
    const lastAcertoInfo = await bancoDeDadosService.getLastAcerto(clientId)
    const lastAcertoDate = lastAcertoInfo?.date || null

    // Fetch History
    const history = await bancoDeDadosService.getHistoryForPdf(clientId)
    const recentHistory = history.filter((h) => h.id !== orderId).slice(0, 10) // Limit to 10 most recent excluding current
    const lastOrder = recentHistory.length > 0 ? recentHistory[0] : null

    // Fetch Monthly Average for the PDF report
    const monthlyAverage = await bancoDeDadosService.getMonthlyAverage(clientId)

    // Fetch Collection Actions (Installments)
    const collectionActions = await cobrancaService.getCollectionActions(
      orderId.toString(),
    )

    const items = dbItems.map((item) => ({
      uid: item['ID VENDA ITENS']?.toString() || Math.random().toString(),
      produtoId: 0,
      produtoCodigo: item['COD. PRODUTO'],
      produtoNome: item['MERCADORIA'] || '',
      tipo: item['TIPO'],
      precoUnitario: parseCurrency(item['PREÇO VENDIDO']),
      saldoInicial: item['SALDO INICIAL'] || 0,
      contagem: item['CONTAGEM'] || 0,
      quantVendida: parseCurrency(item['QUANTIDADE VENDIDA']),
      valorVendido: parseCurrency(item['VALOR VENDIDO']),
      saldoFinal: item['SALDO FINAL'] || 0,
    }))

    // Construct detailed payments list from DB records
    const detailedPayments = dbPayments
      .map((p) => ({
        method: p.forma_pagamento as string,
        value: p.valor_pago || 0,
        paidValue: p.valor_pago || 0,
        // Join with FUNCIONARIOS allows us to get name
        employee: (p as any).FUNCIONARIOS?.nome_completo || 'N/D',
        date: p.data_pagamento || p.created_at || '',
      }))
      .filter((p) => p.value > 0)

    // Construct pending installments list
    // Priority: collection actions -> standard DB payments (unpaid)
    let pendingInstallments: any[] = []

    if (collectionActions && collectionActions.length > 0) {
      pendingInstallments = collectionActions.flatMap(
        (action) =>
          action.installments?.map((inst) => ({
            method: inst.forma_pagamento || 'Outros',
            value: inst.valor || 0,
            dueDate: inst.vencimento || '',
          })) || [],
      )
    } else {
      // Fallback to standard unpaid payments from DB
      pendingInstallments = dbPayments
        .filter((p) => (p.valor_pago || 0) < (p.valor_registrado || 0))
        .map((p) => ({
          method: p.forma_pagamento as string,
          value: p.valor_registrado || 0,
          dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
        }))
    }

    // Reconstruction of simple payments array for backward compatibility / logic
    const payments: any[] = dbPayments.map((p) => {
      return {
        method: p.forma_pagamento as any,
        value: p.valor_registrado || 0,
        paidValue: p.valor_pago || 0,
        dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
        details: [],
      }
    })

    const totalVendido = items.reduce((acc, i) => acc + i.valorVendido, 0)
    const descontoVal = parseCurrency(descontoStr.replace('%', ''))
    const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
    const valorDesconto = totalVendido * discountFactor
    const valorAcerto = totalVendido - valorDesconto
    const valorPago = payments.reduce((acc, p) => acc + p.paidValue, 0)
    const debito = Math.max(0, valorAcerto - valorPago)

    // Ensure we are passing 10 history items max (service limits to 10 but slice again to be safe)
    const finalHistory = recentHistory.slice(0, 10)

    const data = {
      client: {
        ...client,
      },
      clientMunicipio: client.MUNICÍPIO,
      lastAcertoDate: lastAcertoDate,
      employee: { nome_completo: funcionarioName },
      items,
      date: dateStr,
      acertoTipo,
      totalVendido,
      valorDesconto,
      valorAcerto,
      valorPago,
      debito,
      payments, // kept for compatibility
      detailedPayments, // New detailed structure
      pendingInstallments, // New detailed structure
      installments: pendingInstallments, // Mapped for thermal print consistency
      orderNumber: orderId,
      preview: false,
      signature: null,
      isReceipt,
      issuerName,
      lastOrder: lastOrder ? { id: lastOrder.id, date: lastOrder.data } : null,
      history: finalHistory, // Pass history to PDF
      monthlyAverage,
    }

    return this.generatePdf(data, { format })
  },

  async reversePayment(
    paymentId: number,
    orderId: number,
    userId: number,
    userName: string,
  ) {
    // 1. Update RECEBIMENTOS to set valor_pago = 0
    const { error: updateError } = await supabase
      .from('RECEBIMENTOS')
      .update({ valor_pago: 0 })
      .eq('id', paymentId)

    if (updateError) throw updateError

    // 2. Log action to system_logs
    const { error: logError } = await supabase.from('system_logs').insert({
      type: 'PAYMENT_REVERSAL',
      description: `Estorno de pagamento (ID: ${paymentId}) do pedido #${orderId}`,
      user_id: userId,
      meta: { paymentId, orderId, reversedBy: userName },
      created_at: new Date().toISOString(),
    })

    if (logError) console.error('Error logging reversal:', logError)

    // 3. Update debt history to reflect the change
    const { error: rpcError } = await supabase.rpc(
      'update_debito_historico_order',
      {
        p_pedido_id: orderId,
      },
    )

    if (rpcError) throw rpcError
  },
}
