import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

// Manually extending types since we can't regenerate supabase types in this environment
// Changing codigo_interno and CÓDIGO BARRAS to string to support alphanumeric and leading zeros

export type ProductRow = Omit<
  Database['public']['Tables']['PRODUTOS']['Row'],
  'codigo_interno' | 'CÓDIGO BARRAS'
> & {
  codigo_interno?: string | null
  'CÓDIGO BARRAS'?: string | null
  FREQUENTES?: string | null
}

export type ProductInsert = Omit<
  Database['public']['Tables']['PRODUTOS']['Insert'],
  'codigo_interno' | 'CÓDIGO BARRAS'
> & {
  codigo_interno?: string | null
  'CÓDIGO BARRAS'?: string | null
  FREQUENTES?: string | null
}

export type ProductUpdate = Omit<
  Database['public']['Tables']['PRODUTOS']['Update'],
  'codigo_interno' | 'CÓDIGO BARRAS'
> & {
  codigo_interno?: string | null
  'CÓDIGO BARRAS'?: string | null
  FREQUENTES?: string | null
}

// Helper to handle empty strings as null for numbers (Legacy CODIGO)
const numberOrNull = z.preprocess(
  (val) =>
    val === '' || val === null || val === undefined ? null : Number(val),
  z.number().nullable().optional(),
)

// Helper to handle empty strings as null for text fields
const stringOrNull = z.preprocess(
  (val) =>
    val === '' || val === null || val === undefined ? null : String(val),
  z.string().nullable().optional(),
)

export const productSchema = z.object({
  ID: z.coerce
    .number()
    .int('O ID deve ser um número inteiro')
    .min(1, 'O ID é obrigatório e deve ser positivo'),
  PRODUTO: z
    .string()
    .min(2, 'Nome do produto deve ter no mínimo 2 caracteres')
    .nullable(),
  CODIGO: numberOrNull,
  codigo_interno: stringOrNull,
  'CÓDIGO BARRAS': stringOrNull,
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
  FREQUENTES: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
