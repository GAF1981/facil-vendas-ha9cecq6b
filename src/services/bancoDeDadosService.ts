import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { parseCurrency, formatCurrency } from '@/lib/formatters'

export const bancoDeDadosService = {
  // Check if client has outstanding balance to determine if CAPTACAO button should be shown
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

  async getMaxIdVendaItens() {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('ID VENDA ITENS')
      .order('ID VENDA ITENS', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return (data?.['ID VENDA ITENS'] || 0) as number
  },

  async getMaxNumeroPedido() {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('NÚMERO DO PEDIDO')
      .order('NÚMERO DO PEDIDO', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return (data?.['NÚMERO DO PEDIDO'] || 0) as number
  },

  async saveTransaction(
    client: ClientRow,
    employee: Employee,
    items: AcertoItem[],
    date: Date,
  ) {
    // 1. Get IDs
    const currentMaxId = await this.getMaxIdVendaItens()
    const currentMaxPedido = await this.getMaxNumeroPedido()
    const nextPedido = currentMaxPedido + 1
    let nextId = currentMaxId + 1

    // Date formatting
    const dataAcertoStr = date.toLocaleDateString('pt-BR') // DD/MM/YYYY
    const horaAcerto = date.toLocaleTimeString('pt-BR', { hour12: false }) // HH:mm:ss

    // 2. Prepare payload
    const rowsToInsert = items.map((item) => {
      // Calculations
      const valentiaVal = item.precoUnitario // From Products Table (stored in item)
      const valorVendidoVal = item.valorVendido // Calculated as Price * QuantVendida

      const saldoFinal = item.saldoFinal
      const contagem = item.contagem

      // NOVAS CONSIGNAÇÕES: SALDO FINAL - CONTAGEM. If > 0 save result, else 0
      const diff = saldoFinal - contagem
      const novasConsignacoesVal = diff > 0 ? diff : 0

      // RECOHIDO: If (SALDO FINAL - CONTAGEM) < 0, save abs result, else 0
      const recolhidoVal = diff < 0 ? Math.abs(diff) : 0

      // Desconto Logic
      const descontoStr = client.Desconto || '0'
      const descontoVal = parseCurrency(descontoStr)
      // Heuristic: If discount is > 1 (e.g. 20), assume percentage (0.2 -> 20/100). If <= 1 (e.g. 0.2), use as is.
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal

      // VALOR CONSIGNADO TOTAL (Preço Venda) = SALDO FINAL * VALENTIA
      const valorConsignadoVendaVal = saldoFinal * valentiaVal

      // VALOR CONSIGNADO TOTAL (Custo) = Venda - (Venda * Discount)
      const valorConsignadoCustoVal =
        valorConsignadoVendaVal - valorConsignadoVendaVal * discountFactor

      // Increment ID for next item
      const idVendaItens = nextId++

      // Map to DB columns
      return {
        'ID VENDA ITENS': idVendaItens,
        'NÚMERO DO PEDIDO': nextPedido,
        'DATA DO ACERTO': dataAcertoStr,
        'HORA DO ACERTO': horaAcerto,

        'COD. CLIENTE': client.CODIGO,
        CLIENTE: client['NOME CLIENTE'],

        'CODIGO FUNCIONARIO': employee.id,
        FUNCIONÁRIO: employee.nome_completo,

        'DESCONTO POR GRUPO': client.Desconto,

        // Item Mapping
        'COD. PRODUTO': item.produtoId,
        MERCADORIA: item.produtoNome,
        TIPO: item.tipo,
        'SALDO INICIAL': item.saldoInicial,
        CONTAGEM: contagem,

        'QUANTIDADE VENDIDA': item.quantVendida.toString(),
        'VALOR VENDIDO': formatCurrency(valorVendidoVal),
        'VALOR VENDA PRODUTO': formatCurrency(valorVendidoVal),

        'SALDO FINAL': saldoFinal,

        // Business Logic Columns
        VALENTIA: formatCurrency(valentiaVal),
        'NOVAS CONSIGNAÇÕES': formatCurrency(novasConsignacoesVal),
        RECOHIDO: formatCurrency(recolhidoVal),
        'VALOR CONSIGNADO TOTAL (Preço Venda)': formatCurrency(
          valorConsignadoVendaVal,
        ),
        'VALOR CONSIGNADO TOTAL (Custo)': formatCurrency(
          valorConsignadoCustoVal,
        ),
      }
    })

    // 3. Insert
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowsToInsert as any)

    if (error) throw error
  },
}
