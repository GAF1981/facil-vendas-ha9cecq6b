import { ClientRow } from './client'

export interface Rota {
  id: number
  data_inicio: string
  data_fim: string | null
}

export interface RotaItem {
  id: number
  rota_id: number
  cliente_id: number
  x_na_rota: number
  boleto: boolean
  agregado: boolean
  vendedor_id: number | null
}

export interface RotaRow {
  // Identification
  rowNumber: number
  client: ClientRow
  // Rota Specific
  x_na_rota: number
  boleto: boolean
  agregado: boolean
  vendedor_id: number | null
  // Financial & Stats
  debito: number
  quant_debito: number
  data_acerto: string | null
  projecao: number
  numero_pedido: number | null
  estoque: number
  // Pendencies
  has_pendency: boolean
  // Meta
  is_completed: boolean // Green status
}

export interface RotaFilterState {
  search: string
  x_na_rota: string | 'todos'
  agregado: string | 'todos' // 'SIM', 'NÃO'
  vendedor: string | 'todos'
  municipio: string | 'todos'
  tipo_cliente: string | 'todos'
  debito_min: string
  debito_max: string
  data_acerto_start: string
  data_acerto_end: string
  projecao_min: string
  projecao_max: string
  estoque_min: string
  estoque_max: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  key: string
  direction: SortDirection
}
