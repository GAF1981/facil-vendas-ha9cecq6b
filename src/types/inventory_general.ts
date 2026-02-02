export interface InventoryGeneralSession {
  id: number
  data_inicio: string
  data_fim: string | null
  status: 'ABERTO' | 'FECHADO'
}

export interface MovementDetail {
  date: string
  quantity: number
  employeeName: string
}

export interface InventoryGeneralItem {
  produto_id: number
  codigo: number | null
  barcode: number | null // Added barcode field
  produto: string
  tipo: string | null
  preco: number
  saldo_inicial: number
  compras: number
  carro_para_estoque: number
  saidas_perdas: number
  estoque_para_carro: number
  saldo_final: number // Calculated: Initial + In - Out
  contagem: number
  diferenca_qty: number // Saldo Final - Contagem
  diferenca_val: number
  ajustes: number
  novo_saldo_final: number // Spec: Contagem + Ajustes

  // Status to track if a count has been explicitly recorded for validation
  has_count_record: boolean

  // Mandatory count flag based on logic: Saldo Final > 0 OR Any Movement > 0
  is_mandatory: boolean

  // Details for popovers
  details_carro_para_estoque: MovementDetail[]
  details_estoque_para_carro: MovementDetail[]
}

export type InventoryMovementType =
  | 'COMPRA'
  | 'CARRO_PARA_ESTOQUE'
  | 'PERDA'
  | 'ESTOQUE_PARA_CARRO'
  | 'CONTAGEM'

export interface InventoryReportMetrics {
  diferencas: {
    quantidade: number
    valor: number
  }
  compras: {
    total_quantidade: number
    preco_medio: number
  }
}
