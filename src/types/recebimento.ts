import { Database } from '@/lib/supabase/types'

export interface RecebimentoInsert {
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_registrado?: number
  valor_pago: number
  vencimento?: string
  funcionario_id: number | null
  forma_cobranca?: string | null
  data_combinada?: string | null
  ID_da_fêmea?: number | null
  data_pagamento?: string | null
  motivo?: string | null
}

export interface RecebimentoRow {
  id: number
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_registrado: number | null
  valor_pago: number
  vencimento: string | null
  funcionario_id: number | null
  forma_cobranca: string | null
  data_combinada: string | null
  ID_da_fêmea: number | null
  created_at: string | null
  data_pagamento: string | null
}

export interface RecebimentoInstallment extends RecebimentoRow {
  cliente_nome: string
  cliente_codigo: number
  funcionario_nome?: string
}

export interface PaymentHistoryItem {
  id: number
  data: string
  funcionario: string
  forma_pagamento: string
  valor: number
  original_payment_id?: number // To track origin if split
}

export interface ConsolidatedRecebimento extends RecebimentoInstallment {
  history: PaymentHistoryItem[]
  saldo: number
  status_calculado?: 'VENCIDA' | 'A VENCER' | 'PAGO'
}
