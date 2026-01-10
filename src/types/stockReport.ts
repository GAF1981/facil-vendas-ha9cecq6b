import { Database } from '@/lib/supabase/types'

export interface StockReportRow {
  id: number
  numero_pedido: number | null
  data_hora_acerto: string | null
  codigo_cliente: number | null
  cliente_nome: string | null
  produto_nome: string | null
  saldo_final: number | null
  preco_vendido: number | null
  estoque_por_produto: number | null
  estoque_final: number | null
  created_at: string
}

export interface StockReportFilters {
  numero_pedido?: string
  codigo_cliente?: string
  cliente_nome?: string
  startDate?: Date
  endDate?: Date
  mode: 'live' | 'history'
}
