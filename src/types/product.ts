import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

export type ProductRow = Database['public']['Tables']['PRODUTOS']['Row']
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert']
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update']

export const productSchema = z.object({
  CODIGO: z.coerce
    .number({ required_error: 'Código é obrigatório' })
    .min(1, 'Código deve ser maior que 0'),
  'CÓDIGO BARRAS': z.coerce
    .number({ required_error: 'Código de barras é obrigatório' })
    .min(0, 'Código de barras inválido'),
  PRODUTOS: z
    .string({ required_error: 'Nome do produto é obrigatório' })
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
