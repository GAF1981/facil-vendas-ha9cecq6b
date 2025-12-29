import { PaymentEntry } from './payment'

export interface OrderDebt {
  orderId: number
  date: string // Data do Acerto
  totalValue: number // Sum of products (raw)
  discount: number
  netValue: number // total - discount
  paidValue: number // from RECEBIMENTOS
  remainingValue: number
  status: 'VENCIDO' | 'A VENCER'
  paymentDetails: PaymentEntry[] // From BANCO_DE_DADOS
  paymentsMade: { date: string; value: number }[] // From RECEBIMENTOS
  oldestOverdueDate: string | null
}

export interface ClientDebt {
  clientId: number
  clientName: string
  totalDebt: number
  orderCount: number
  status: 'VENCIDO' | 'A VENCER'
  lastAcertoDate: string
  oldestOverdueDate: string | null
  orders: OrderDebt[]
}
