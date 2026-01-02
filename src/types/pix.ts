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
  id: number // recebimento_id
  venda_id: number
  // Mapped from ID_da_fêmea
  id_da_femea: number | null
  cliente_id: number
  forma_pagamento: string
  valor_pago: number
  valor_registrado: number | null
  vencimento: string | null
  created_at: string | null
  // Client info
  cliente_nome: string
  // Pix info (if any)
  pix_id?: number
  nome_no_pix?: string
  banco_pix?: string
  data_pix_realizado?: string
  confirmado_por?: string
}

export const pixConferenceSchema = z.object({
  nome_no_pix: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  banco_pix: z.string().min(1, 'Selecione o banco'),
  data_pix_realizado: z.string().min(1, 'Data é obrigatória'),
})

export type PixConferenceFormData = z.infer<typeof pixConferenceSchema>
