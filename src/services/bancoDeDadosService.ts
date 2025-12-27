import { supabase } from '@/lib/supabase/client'
import { AcertoItem } from '@/types/acerto'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { parseCurrency, formatCurrency } from '@/lib/formatters'

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
    const currentMaxId = await this.getMaxIdVendaItens()
    const currentMaxPedido = await this.getMaxNumeroPedido()
    const nextPedido = currentMaxPedido + 1
    let nextId = currentMaxId + 1

    const dataAcertoStr = date.toLocaleDateString('pt-BR')
    const horaAcerto = date.toLocaleTimeString('pt-BR', { hour12: false })

    const rowsToInsert = items.map((item) => {
      const valentiaVal = item.precoUnitario
      const valorVendidoVal = item.valorVendido

      const saldoFinal = item.saldoFinal
      const contagem = item.contagem

      const diff = saldoFinal - contagem
      const novasConsignacoesVal = diff > 0 ? diff : 0
      const recolhidoVal = diff < 0 ? Math.abs(diff) : 0

      const descontoStr = client.Desconto || '0'
      const descontoVal = parseCurrency(descontoStr)
      const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal

      const valorConsignadoVendaVal = saldoFinal * valentiaVal
      const valorConsignadoCustoVal =
        valorConsignadoVendaVal - valorConsignadoVendaVal * discountFactor

      const idVendaItens = nextId++

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
        RECOHIDO: formatCurrency(recolhidoVal),
        'VALOR CONSIGNADO TOTAL (Preço Venda)': formatCurrency(
          valorConsignadoVendaVal,
        ),
        'VALOR CONSIGNADO TOTAL (Custo)': formatCurrency(
          valorConsignadoCustoVal,
        ),
      }
    })

    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .insert(rowsToInsert as any)

    if (error) throw error
  },
}
