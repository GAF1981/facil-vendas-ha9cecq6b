import { z } from 'zod'

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
  // Enhanced fields for Conference
  pixId?: number | null
  pixName?: string | null
  pixBank?: string | null
  pixDate?: string | null
}

export interface PixAcertoRow {
  orderId: number
  clientCode: number
  clientName: string
  salesEmployee: string
  acertoForma: string // From BANCO_DE_DADOS.FORMA
  acertoPixConfirmed: boolean // BANCO_DE_DADOS.pix_acerto_confirmado
  acertoPixConfirmedBy: string | null
  recebimentoValue: number // From RECEBIMENTOS (sum of Pix)
  recebimentoPixConfirmed: boolean // From RECEBIMENTOS.pix_recebimento_confirmado (aggregated)
  recebimentoPixConfirmedBy: string | null
  recebimentoIds: number[] // IDs of RECEBIMENTOS rows for this order
}

export const pixConferenceSchema = z.object({
  recebimento_id: z.number(),
  nome_no_pix: z.string().min(3, 'Nome é obrigatório'),
  banco_pix: z.enum(['BS2', 'CORA', 'OUTROS'], {
    required_error: 'Selecione um banco',
  }),
  data_realizada: z.string().min(1, 'Data é obrigatória'),
})

export type PixConferenceFormData = z.infer<typeof pixConferenceSchema>
