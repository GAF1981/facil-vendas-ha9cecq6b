import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

export type Product = Database['public']['Tables']['PRODUTOS']['Row']
export type ProductInsert = Database['public']['Tables']['PRODUTOS']['Insert']
export type ProductUpdate = Database['public']['Tables']['PRODUTOS']['Update']

// Helper to format price since it comes as string (likely formatted or raw number string)
export const formatPrice = (price: string | null) => {
  if (!price) return 'R$ 0,00'

  // Clean R$ and spaces
  let clean = price.replace('R$', '').trim()

  // Heuristic to handle different number formats
  // If it looks like 1.000,00 (Brazilian), normalize to 1000.00
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    // If just comma: 100,50 -> 100.50
    clean = clean.replace(',', '.')
  }

  const num = parseFloat(clean)
  if (isNaN(num)) return price // Return original if parsing fails

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

// Zod Schema for validation
export const productSchema = z.object({
  CODIGO: z.coerce
    .number({ required_error: 'Código é obrigatório' })
    .min(1, 'Código deve ser maior que 0'),
  'CÓDIGO BARRAS': z.coerce
    .number()
    .min(0, 'Código de barras inválido')
    .optional()
    .nullable(), // Although DB says number, it handles input
  MERCADORIA: z.string().min(2, 'Nome da mercadoria é obrigatório'),
  'DESCRIÇÃO RESUMIDA': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  PREÇO: z.string().optional().nullable(),
  'PRODUTOS CONCATENADOS': z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
})

export type ProductFormData = z.infer<typeof productSchema>
