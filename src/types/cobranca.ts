import { PaymentEntry } from './payment'

export interface Receivable {
  id: number
  vencimento: string | null
  valorRegistrado: number
  valorPago: number
  formaPagamento: string
  status: 'VENCIDO' | 'A VENCER' | 'PAGO'
  // New granular fields for collection control
  formaCobranca?: string | null
  dataCombinada?: string | null
}

export interface OrderDebt {
  orderId: number
  date: string // Data do Acerto
  totalValue: number // Sum of products (raw)
  discount: number
  netValue: number // total - discount
  paidValue: number // from RECEBIMENTOS
  remainingValue: number
  status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO'
  paymentDetails: PaymentEntry[] // From BANCO_DE_DADOS (Legacy/Reference)
  paymentsMade: { date: string; value: number }[] // From RECEBIMENTOS (History)
  installments: Receivable[] // Granular rows for display
  oldestOverdueDate: string | null
  // New columns
  formaPagamento: string // "Forma de Pagamento" (Order Level)
  valorDevido: number // "Valor Devido"
  collectionActionCount: number // New: Count of collection actions
}

export interface ClientDebt {
  clientId: number
  clientName: string
  clientType: string
  totalDebt: number
  orderCount: number
  status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO'
  lastAcertoDate: string
  oldestOverdueDate: string | null
  orders: OrderDebt[]
}

export interface CollectionAction {
  id: number
  acao: string | null
  dataAcao: string | null
  novaDataCombinada: string | null
  funcionarioNome: string | null
  funcionarioId: string | null
  pedidoId: string | null
  clienteId: number | null
  clienteNome: string | null
}

export interface CollectionActionInsert {
  acao: string
  dataAcao: string
  novaDataCombinada: string | null
  funcionarioNome: string
  funcionarioId: string
  pedidoId: string
  clienteId: number
  clienteNome: string
}
