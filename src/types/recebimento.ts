export interface RecebimentoInsert {
  venda_id: number
  cliente_id: number
  forma_pagamento: string
  valor_pago: number
  data_pagamento?: string
  funcionario_id: number
}

export interface RecebimentoRow extends RecebimentoInsert {
  id: number
  created_at?: string
}
