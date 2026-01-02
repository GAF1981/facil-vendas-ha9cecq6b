export interface PixRecebimentoRow {
  id: number // ID from Recebimentos
  orderId: number
  clientCode: number
  clientName: string
  paymentMethod: string
  value: number
  isConfirmed?: boolean | null
  confirmedBy?: string | null
  createdAt?: string
}
