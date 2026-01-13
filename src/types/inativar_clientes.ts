export interface InativarCliente {
  id: number
  pedido_id: number
  funcionario_nome: string | null
  cliente_codigo: number
  cliente_nome: string | null
  valor_venda: number
  saldo_a_pagar: number
  valor_pago: number
  debito: number
  created_at: string
  // New fields
  expositor_retirado: boolean
  observacoes_expositor: string | null
  status: 'PENDENTE' | 'CONCLUIDO'
}

export interface InativarClienteInsert {
  pedido_id: number
  funcionario_nome: string | null
  cliente_codigo: number
  cliente_nome: string | null
  valor_venda: number
  saldo_a_pagar: number
  valor_pago: number
  debito: number
  // Optional new fields for insert
  expositor_retirado?: boolean
  observacoes_expositor?: string | null
  status?: 'PENDENTE' | 'CONCLUIDO'
}
