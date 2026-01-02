export interface RecebimentoInsert {
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_registrado?: number
  valor_pago: number
  vencimento?: string // Renamed from data_pagamento
  funcionario_id: number
  forma_cobranca?: string | null
  data_combinada?: string | null
  ID_da_fêmea?: number // New column for Order Number
}

export interface RecebimentoRow extends RecebimentoInsert {
  id: number
  created_at?: string
}
