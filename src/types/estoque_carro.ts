import { z } from 'zod'

export interface EstoqueCarroSession {
  id: number
  data_inicio: string
  data_fim: string | null
  funcionario_id: number
}

export interface EstoqueCarroItem {
  produto_id: number
  codigo: number | null
  produto: string
  tipo: string | null
  preco: number
  saldo_inicial: number
  entradas_cliente: number
  entradas_estoque: number
  saidas_cliente: number
  saidas_estoque: number
  saldo_final: number // Calculated
  contagem: number
  diferenca_qtd: number
  diferenca_val: number
  ajustes: number
  novo_saldo: number
  id_estoque_carro: number // Added for drill-down context
  has_count_record: boolean // Added for validation (Pendente status)
}

export interface CountUpdatePayload {
  produto_id: number
  quantidade: number
}

export interface EstoqueCarroMovementInsert {
  id_estoque_carro: number
  produto_id: number | null
  quantidade: number
  created_at?: string
  pedido?: number | null
  data_horario?: string | null
  funcionario?: string | null
  codigo_produto?: number | null
  barcode?: string | null
  produto?: string | null
  preco?: number | null
  // Dynamic columns based on table
  ENTRADAS_cliente_carro?: number
  SAIDAS_carro_cliente?: number
  ENTRADAS_estoque_carro?: number
  SAIDAS_carro_estoque?: number
}
