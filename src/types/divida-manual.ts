export interface DividaManual {
  id: number
  cobranca_seq: number
  funcionario_id: number | null
  cliente_id: number
  data_acerto: string
  vencimento: string
  forma_pagamento: string
  valor_parcela: number
  valor_pago: number
  forma_cobranca: string | null
  data_combinada: string | null
  motivo: string | null
  created_at: string
  FUNCIONARIOS?: {
    nome_completo: string
  }
  CLIENTES?: {
    'NOME CLIENTE': string
    'TIPO DE CLIENTE': string
    'FONE 1': string
    'FONE 2': string
    telefone_cobranca: string
  }
}

export interface DividaManualAcao {
  id: number
  divida_id: number
  funcionario_id: number | null
  acao: string
  data_acao: string
  nova_data_combinada: string | null
  motivo: string | null
  created_at: string
  FUNCIONARIOS?: {
    nome_completo: string
  }
}
