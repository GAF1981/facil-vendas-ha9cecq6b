import { supabase } from '@/lib/supabase/client'
import { Acerto } from '@/types/acerto'
import { bancoDeDadosService } from './bancoDeDadosService'
import { clientsService } from './clientsService'
import { parseCurrency } from '@/lib/formatters'
import { PaymentEntry } from '@/types/payment'

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
          preview: options?.preview ?? false,
          signature: options?.signature ?? null,
          format: options?.format ?? 'A4',
        },
        responseType: 'blob', // Important for file download
      } as any,
    )

    if (error) throw error
    return blob as Blob
  },

  async reprintOrder(orderId: number, issuerName?: string) {
    // Reprints default to A4 unless we extend this method later,
    // but the backend will handle A4 default if not passed.
    return this.generateDocument(
      orderId,
      'ACERTO (REIMPRESSÃO)',
      false,
      issuerName,
    )
  },

  async reprintReceipt(orderId: number, issuerName?: string) {
    return this.generateDocument(
      orderId,
      'RECIBO DE PAGAMENTO',
      true,
      issuerName,
    )
  },

  // Shared logic for generating document data structure from Order ID
  async generateDocument(
    orderId: number,
    acertoTipo: string,
    isReceipt: boolean,
    issuerName?: string,
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
      dateStr = first['DATA DO ACERTO'] || dateStr
      descontoStr = first['DESCONTO POR GRUPO'] || '0'
    } else if (dbPayments.length > 0) {
      const first = dbPayments[0]
      clientId = first.cliente_id
    }

    if (!clientId) throw new Error('Dados do cliente não encontrados.')

    const client = await clientsService.getById(clientId)

    // Fetch last Acerto Date for this client
    const lastAcertoInfo = await bancoDeDadosService.getLastAcerto(clientId)
    const lastAcertoDate = lastAcertoInfo?.date || null

    // Fetch History using the optimized PDF-specific method
    // This ensures data comes from 'debitos_historico' with correct columns (media_mensal, etc)
    const history = await bancoDeDadosService.getHistoryForPdf(clientId)

    // Filter out current order from history if present (though usually history is past)
    const previousOrders = history.filter((h) => h.id !== orderId)
    const lastOrder = previousOrders.length > 0 ? previousOrders[0] : null

    // Use the history fetched from debitos_historico directly
    const recentHistory = previousOrders // Already limited by the service

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

    const payments: PaymentEntry[] = dbPayments.map((p) => {
      // Logic to recreate granular details if possible or assume logic
      return {
        method: p.forma_pagamento as any,
        value: p.valor_registrado || 0,
        paidValue: p.valor_pago || 0,
        installments: 1, // Assumption unless we can infer from DB
        dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
        // If granular info needed, we can construct `details` here if available
        details: [
          {
            number: 1,
            value: p.valor_registrado || 0,
            paidValue: p.valor_pago || 0,
            dueDate: p.vencimento ? p.vencimento.split('T')[0] : '',
          },
        ],
      }
    })

    const totalVendido = items.reduce((acc, i) => acc + i.valorVendido, 0)
    const descontoVal = parseCurrency(descontoStr.replace('%', ''))
    const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
    const valorDesconto = totalVendido * discountFactor
    const valorAcerto = totalVendido - valorDesconto
    const valorPago = payments.reduce((acc, p) => acc + p.paidValue, 0)
    const debito = Math.max(0, valorAcerto - valorPago)

    const data = {
      client: {
        ...client,
      },
      clientMunicipio: client.MUNICÍPIO, // Explicitly pass municipality
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
      payments,
      orderNumber: orderId,
      preview: false,
      signature: null,
      isReceipt,
      issuerName,
      lastOrder: lastOrder ? { id: lastOrder.id, date: lastOrder.data } : null,
      history: recentHistory,
    }

    return this.generatePdf(data)
  },
}
