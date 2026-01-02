export interface InventarioItem {
  id: number // Mapped from Product ID
  codigo_barras: string | null
  codigo_produto: number | null
  mercadoria: string
  tipo: string | null
  preco: number
  saldo_inicial: number
  entrada_estoque_carro: number
  entrada_cliente_carro: number
  saida_carro_estoque: number
  saida_carro_cliente: number
  saldo_final: number
  estoque_contagem_carro: number
  diferenca_quantidade: number
  diferenca_valor: number
  hasError?: boolean // Indicates if there was a data processing error for this item
}

// Deprecated in favor of DatasDeInventario but kept for reference if needed
export interface InventorySession {
  id: number
  tipo: 'GERAL' | 'FUNCIONARIO'
  funcionario_id: number | null
  data_inicio: string
  data_fim: string | null
  status: 'ABERTO' | 'FECHADO'
  created_at: string
}

export interface DatasDeInventario {
  'ID INVENTÁRIO': number
  'Data de Início de Inventário': string
  'Data de Fechamento de Inventário': string | null
  TIPO: 'GERAL' | 'FUNCIONARIO' | null
  'CODIGO FUNCIONARIO': number | null
}

export type InventorySessionInsert = Omit<
  InventorySession,
  'id' | 'created_at' | 'data_fim' | 'data_inicio'
>

export interface MovementInsert {
  TIPO: 'REPOSICAO' | 'DEVOLUCAO'
  funcionario_id: number
  produto_id: number
  quantidade: number
  session_id: number
}

export interface ContagemEstoqueFinalInsert {
  produto_id: number
  quantidade: number
  session_id: number | null
  valor_unitario_snapshot: number
}
