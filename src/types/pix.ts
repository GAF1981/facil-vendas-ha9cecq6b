import { z } from 'zod'

export interface PixEntry {
  id: number
  recebimento_id: number
  nome_no_pix: string
  banco_pix: string
  data_pix_realizado: string | null
  confirmado_por: string | null
  created_at: string
}

export interface PixReceiptRow {
  id: number // recebimento.id
  venda_id: number // recebimento.venda_id
  id_da_femea: number | null // recebimento.ID_da_fêmea
  cliente_id: number // recebimento.cliente_id
  forma_pagamento: string // recebimento.forma_pagamento
  valor_pago: number // recebimento.valor_pago
  valor_registrado: number | null // recebimento.valor_registrado
  vencimento: string | null // recebimento.vencimento
  created_at: string | null // recebimento.created_at
  cliente_nome: string // Joined
  // Pix specific data (Left Join - nullable)
  pix_id?: number
  nome_no_pix?: string
  banco_pix?: string
  data_pix_realizado?: string
  confirmado_por?: string
  // Enhanced info
  data_acerto?: string | null
  vendedor_pedido?: string | null
}

export const pixConferenceSchema = z.object({
  nome_no_pix: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  banco_pix: z.string().min(1, 'Selecione o banco'),
  data_pix_realizado: z.string().min(1, 'Data é obrigatória'),
})

export type PixConferenceFormData = z.infer<typeof pixConferenceSchema>

export interface PixFilters {
  orderId: string
  name: string
  bank: string
  status: string
}
