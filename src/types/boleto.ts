export interface Boleto {
  id: number
  cliente_nome: string
  cliente_codigo: number
  status: string
  vencimento: string // YYYY-MM-DD
  valor: number
  pedido_id?: number | null
  created_at?: string
}

export type BoletoInsert = Omit<Boleto, 'id' | 'created_at'>
export type BoletoUpdate = Partial<BoletoInsert>

export interface BoletoWithConferido extends Boleto {
  conferido: 'SIM' | 'NÃO'
}
