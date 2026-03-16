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
  vendedor_proximo_id?: number | null
  tarefas?: string | null
}

export interface RotaRow {
  // Identification
  rowNumber: number
  client: ClientRow
  // Rota Specific
  x_na_rota: number
  boleto: boolean
  agregado: boolean
  favorito: boolean
  vendedor_id: number | null
  proximo_vendedor_id: number | null // New field for next route pre-selection
  tarefas: string | null
  // Financial & Stats
  debito: number
  quant_debito: number
  data_acerto: string | null
  projecao: number | null
  numero_pedido: number | null
  estoque: number | null
  valor_consignado: number | null
  // Pendencies
  has_pendency: boolean
  pendency_details: string[]
  // Meta
  is_completed: boolean
  // Status Logic
  earliest_unpaid_date: string | null
  vencimento_status: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO'
  vencimento_cobranca: string | null
}

export interface RotaFilterState {
  search: string
  x_na_rota: string | 'todos'
  agregado: string | 'todos'
  vendedor: string[]
  status_vendedor: string | 'todos' | 'com_vendedor' | 'sem_vendedor'
  proximo_vendedor: string | 'todos' // Added filter
  municipio: string | 'todos'
  grupo_rota: string | 'todos'
  debito_min: string
  debito_max: string
  data_acerto_start: string
  data_acerto_end: string
  projecao_min: string
  estoque_min: string
  estoque_max: string
  vencimento_status: string | 'todos'
  pendencias?: string | 'todos' // Added filter
  prioridade_apenas?: boolean // Added priority filter
}

export type SortDirection = 'asc' | 'desc'

export interface SortItem {
  key: string
  direction: SortDirection
}

export type SortConfig = SortItem[]
