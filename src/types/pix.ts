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
  id: number
  venda_id: number
  id_da_femea: number | null
  cliente_id: number
  forma_pagamento: string
  valor_pago: number
  valor_registrado: number | null
  vencimento: string | null
  created_at: string | null
  data_pagamento?: string | null
  cliente_nome: string
  // Pix specific data
  pix_id?: number
  nome_no_pix?: string
  banco_pix?: string
  data_pix_realizado?: string
  confirmado_por?: string
  // Enhanced info
  data_acerto?: string | null
  vendedor_pedido?: string | null
  rota_id?: number
}

export const pixConferenceSchema = z.object({
  nome_no_pix: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  banco_pix: z.string().min(1, 'Selecione o banco'),
  data_pix_realizado: z.string().min(1, 'Data é obrigatória'),
  valor: z.string().min(1, 'Valor é obrigatório'),
})

export type PixConferenceFormData = z.infer<typeof pixConferenceSchema>

export interface PixFilters {
  orderId: string
  name: string
  bank: string
  status: string
}
