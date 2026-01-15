import { supabase } from '@/lib/supabase/client'
import { NotaFiscalSettlement, EmitInvoicePayload } from '@/types/nota-fiscal'
import { parseCurrency } from '@/lib/formatters'

export const notaFiscalService = {
  async getAllSettlements(): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, CLIENTE',
      )
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(1000)

    if (error) throw error

    // Fetch issued invoices to get numbers
    const { data: issuedData, error: issuedError } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')

    if (issuedError)
      console.error('Error fetching issued invoices:', issuedError)

    const issuedMap = new Map<number, string>()
    issuedData?.forEach((i) => issuedMap.set(i.pedido_id, i.numero_nota_fiscal))

    return this.processSettlementData(data, '', issuedMap)
  },

  async getSettlementsByClient(
    clientId: number,
    clientNotaFiscalInfo: string,
  ): Promise<NotaFiscalSettlement[]> {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "DATA DO ACERTO", "VALOR VENDIDO", nota_fiscal_emitida, nota_fiscal_cadastro, nota_fiscal_venda, solicitacao_nf, CLIENTE',
      )
      .eq('"CÓDIGO DO CLIENTE"', clientId)
      .not('"NÚMERO DO PEDIDO"', 'is', null)
      .order('"DATA DO ACERTO"', { ascending: false })

    if (error) throw error

    // Fetch issued invoices
    const { data: issuedData } = await supabase
      .from('notas_fiscais_emitidas')
      .select('pedido_id, numero_nota_fiscal')
      .eq('cliente_id', clientId)

    const issuedMap = new Map<number, string>()
    issuedData?.forEach((i) => issuedMap.set(i.pedido_id, i.numero_nota_fiscal))

    return this.processSettlementData(data, clientNotaFiscalInfo, issuedMap)
  },

  processSettlementData(
    data: any[] | null,
    defaultNfInfo: string,
    issuedMap: Map<number, string>,
  ): NotaFiscalSettlement[] {
    if (!data) return []

    const ordersMap = new Map<number, NotaFiscalSettlement>()

    data.forEach((row: any) => {
      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!ordersMap.has(orderId)) {
        // Normalize inputs
        const nfCadastro = row.nota_fiscal_cadastro || defaultNfInfo || 'NÃO'
        const nfVenda = row.nota_fiscal_venda || 'NÃO'
        const solicitacao = row.solicitacao_nf || 'NÃO'
        let status = row.nota_fiscal_emitida || 'Pendente'

        // Strict Status Automation Logic (Resolvido vs Pendente)
        // Only override if not already Emitida
        if (status !== 'Emitida') {
          // Helper to check for "SIM"
          const isSim = (val: string | null) => val === 'SIM'

          // Logic: If ANY is SIM, then Pendente. Else Resolvido.
          if (isSim(nfCadastro) || isSim(nfVenda) || isSim(solicitacao)) {
            status = 'Pendente'
          } else {
            status = 'Resolvida'
          }
        }

        ordersMap.set(orderId, {
          orderId: orderId,
          clientCode: row['CÓDIGO DO CLIENTE'],
          clientName: row['CLIENTE'] || 'N/D',
          dataAcerto: row['DATA DO ACERTO'] || '',
          valorTotalVendido: 0,
          notaFiscalCadastro: nfCadastro,
          notaFiscalVenda: nfVenda,
          solicitacaoNf: solicitacao,
          notaFiscalEmitida: status,
          numeroNotaFiscal: issuedMap.get(orderId) || null,
        })
      }

      const order = ordersMap.get(orderId)!
      order.valorTotalVendido += parseCurrency(row['VALOR VENDIDO'])
    })

    return Array.from(ordersMap.values())
  },

  async toggleRequest(orderId: number, currentValue: string) {
    const newValue = currentValue === 'SIM' ? 'NÃO' : 'SIM'
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ solicitacao_nf: newValue } as any)
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
    return newValue
  },

  async emitInvoice(payload: EmitInvoicePayload) {
    // 1. Insert into NOTAS FISCAIS EMITIDAS
    const { error: insertError } = await supabase
      .from('notas_fiscais_emitidas')
      .insert({
        pedido_id: payload.pedidoId,
        cliente_id: payload.clienteId,
        numero_nota_fiscal: payload.numeroNotaFiscal,
        funcionario_id: payload.funcionarioId,
      })

    if (insertError) throw insertError

    // 2. Update BANCO_DE_DADOS status
    const { error: updateError } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ nota_fiscal_emitida: 'Emitida' } as any)
      .eq('"NÚMERO DO PEDIDO"', payload.pedidoId)

    if (updateError) throw updateError
  },

  async generateDetailedReport(orderId: number) {
    // Fetch all items for this order from BANCO_DE_DADOS
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*')
      .eq('"NÚMERO DO PEDIDO"', orderId)

    if (error) throw error
    if (!data || data.length === 0) throw new Error('Pedido não encontrado')

    // Map data to expected format for PDF
    // We send raw values mostly, but structure object properties nicely
    const items = data.map((item) => ({
      codProduto: item['COD. PRODUTO'],
      produto: item['MERCADORIA'],
      tipo: item['TIPO'],
      saldoInicial: item['SALDO INICIAL'],
      contagem: item['CONTAGEM'],
      quantidadeVendida: item['QUANTIDADE VENDIDA'],
      valorVendido: item['VALOR VENDIDO'],
      saldoFinal: item['SALDO FINAL'],
      novasConsignacoes: item['NOVAS CONSIGNAÇÕES'],
      devolucoes: item['RECOLHIDO'],
    }))

    // Header info from first record
    const first = data[0]
    const header = {
      orderId: first['NÚMERO DO PEDIDO'],
      cliente: first['CLIENTE'],
      codigoCliente: first['CÓDIGO DO CLIENTE'],
      funcionario: first['FUNCIONÁRIO'],
      dataAcerto: first['DATA DO ACERTO'],
    }

    const { data: pdfBlob, error: pdfError } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          reportType: 'detailed-order-report',
          format: 'A4',
          header,
          items,
        },
        responseType: 'blob',
      },
    )

    if (pdfError) throw pdfError
    return pdfBlob as Blob
  },
}
