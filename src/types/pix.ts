export interface PixDetails {
  id?: number
  recebimento_id: number
  nome_no_pix: string
  banco_pix: 'BS2' | 'CORA' | 'OUTROS'
  data_realizada: string
  confirmado_por?: string
  created_at?: string
}

export interface PixRecebimentoRow {
  id: number // ID from Recebimentos
  orderId: number
  clientCode: number
  clientName: string // Added field for customer name
  paymentMethod: string
  value: number
  pixDetails?: PixDetails | null
}
