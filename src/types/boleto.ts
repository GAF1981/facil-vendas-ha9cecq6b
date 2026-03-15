export interface Boleto {
  id: number
  cliente_nome: string
  cliente_codigo: number
  status: string
  vencimento: string // YYYY-MM-DD
  valor: number
  pedido_id?: number | null
  created_at?: string
  conferido: boolean
}

export type BoletoInsert = Omit<Boleto, 'id' | 'created_at' | 'conferido'> & {
  conferido?: boolean
}
export type BoletoUpdate = Partial<BoletoInsert>

export interface BoletoWithConferido extends Omit<Boleto, 'conferido'> {
  conferido: 'SIM' | 'NÃO'
  originalConferido: boolean
}
