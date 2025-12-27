import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { format } from 'date-fns'

export const bancoDeDadosService = {
  async hasOutstandingBalance(clienteId: number): Promise<boolean> {
    const { count, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('*', { count: 'exact', head: true })
      .eq('COD. CLIENTE', clienteId)
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
      .eq('COD. CLIENTE', clienteId)
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

  async saveTransaction(
    client: ClientRow,
    employee: Employee,
    items: AcertoItem[],
    date: Date,
  ) {
    // 1. Get Context (Order Number)
    // We calculate it again here to ensure sequence integrity at the moment of saving
    const nextPedido = await this.getNextNumeroPedido()

    const dataAcertoStr = format(date, 'yyyy-MM-dd')
    const horaAcerto = format(date, 'HH:mm:ss')

    // 2. Fetch current product prices for VALENTIA
    const productIds = items.map((i) => i.produtoId)

    // Guard against empty items list
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

    // 3. Prepare rows
    const rowsToInsert = items.map((item) => {
      // Get current price from DB (Valentia)
      const currentPrice = priceMap.get(item.produtoId) || item.precoUnitario
      const valentiaVal = currentPrice

      // Recalculate Sales Value based on current price
      const valorVendidoVal = currentPrice * item.quantVendida

      const saldoFinal = item.saldoFinal
      const contagem = item.contagem

      // Consignment Logic: Saldo Final - Contagem
      const diff = saldoFinal - contagem
      let novasConsignacoesVal = 0
      let recolhidoVal = 0

      if (diff > 0) {
        novasConsignacoesVal = diff
        recolhidoVal = 0
      } else if (diff < 0) {
        novasConsignacoesVal = 0
        recolhidoVal = Math.abs(diff) // Storing magnitude of collected items
      }

      // Discount Logic
      const descontoStr = client.Desconto || '0'
      const descontoVal = parseCurrency(descontoStr.replace('%', ''))
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal

      // Consigned Values Calculation
      const valorConsignadoVendaVal = saldoFinal * valentiaVal
      const valorConsignadoCustoVal =
        valorConsignadoVendaVal - valorConsignadoVendaVal * discountFactor

      return {
        // Explicitly set ID VENDA ITENS
        'ID VENDA ITENS': item.idVendaItens,

        'NÚMERO DO PEDIDO': nextPedido,
        'DATA DO ACERTO': dataAcertoStr,
        'HORA DO ACERTO': horaAcerto,

        'COD. CLIENTE': client.CODIGO,
        CLIENTE: client['NOME CLIENTE'],

        'CODIGO FUNCIONARIO': employee.id,
        FUNCIONÁRIO: employee.nome_completo,

        'DESCONTO POR GRUPO': client.Desconto,

        'COD. PRODUTO': item.produtoId,
        MERCADORIA: item.produtoNome,
        TIPO: item.tipo,
        'SALDO INICIAL': item.saldoInicial,
        CONTAGEM: contagem,

        'QUANTIDADE VENDIDA': item.quantVendida.toString(),
        'VALOR VENDIDO': formatCurrency(valorVendidoVal),
        'VALOR VENDA PRODUTO': formatCurrency(valorVendidoVal),

        'SALDO FINAL': saldoFinal,

        VALENTIA: formatCurrency(valentiaVal),
        'NOVAS CONSIGNAÇÕES': formatCurrency(novasConsignacoesVal),

        // Using the corrected column name
        RECOLHIDO: formatCurrency(recolhidoVal),

        'VALOR CONSIGNADO TOTAL (Preço Venda)': formatCurrency(
          valorConsignadoVendaVal,
        ),
        'VALOR CONSIGNADO TOTAL (Custo)': formatCurrency(
          valorConsignadoCustoVal,
        ),
      }
    })

    // 4. Insert into DB
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowsToInsert as any)

    if (error) throw error
  },
}
