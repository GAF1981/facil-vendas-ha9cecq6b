import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

// Manually extending types since we can't regenerate supabase types in this environment
interface AdditionalFields {
  'DESCONTO ACESSORIO CELULAR'?: string | null
  'DESCONTO BRINQUEDO'?: string | null
  'DESCONTO ACESSORIO'?: string | null
  'DESCONTO OUTROS'?: string | null
  GRUPO?: string | null
  'GRUPO ROTA'?: string | null
}

// Type definition derived from Supabase Row with manual extension
export type ClientRow = Database['public']['Tables']['CLIENTES']['Row'] &
  AdditionalFields
export type ClientInsert = Database['public']['Tables']['CLIENTES']['Insert'] &
  AdditionalFields
export type ClientUpdate = Database['public']['Tables']['CLIENTES']['Update'] &
  AdditionalFields

// Zod Schema for validation
export const clientSchema = z.object({
  CODIGO: z.coerce
    .number({ required_error: 'Código é obrigatório' })
    .min(1, 'Código deve ser maior que 0'),
  'NOME CLIENTE': z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  'RAZÃO SOCIAL': z.string().optional().nullable(),
  CNPJ: z
    .string({ required_error: 'CPF / CNPJ é obrigatório' })
    .min(1, 'CPF / CNPJ é obrigatório'),
  IE: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
  'TIPO DE CLIENTE': z.string().min(1, 'Tipo de Cliente é obrigatório'),
  ENDEREÇO: z.string().optional().nullable(),
  BAIRRO: z.string().optional().nullable(),
  MUNICÍPIO: z.string().optional().nullable(),
  'CEP OFICIO': z.string().optional().nullable(),
  EMAIL: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal(''))
    .nullable(),
  'FONE 1': z.string().min(1, 'Telefone 1 é obrigatório'), // Mandatory per user story
  'FONE 2': z.string().optional().nullable(),
  'CONTATO 1': z.string().optional().nullable(),
  'CONTATO 2': z.string().optional().nullable(),
  'FORMA DE PAGAMENTO': z.string().optional().nullable(),
  'NOTA FISCAL': z.string().optional().nullable(),
  EXPOSITOR: z.string().optional().nullable(),
  Desconto: z
    .string()
    .optional()
    .nullable()
    .refine((val) => {
      if (!val) return true
      const num = parseFloat(val.replace('%', ''))
      // Strict range validation: 30% to 50%
      return !isNaN(num) && num >= 30 && num <= 50
    }, 'O desconto deve estar estritamente entre 30% e 50%'),
  'DESCONTO ACESSORIO CELULAR': z.string().optional().nullable(),
  'DESCONTO BRINQUEDO': z.string().optional().nullable(),
  'DESCONTO ACESSORIO': z.string().optional().nullable(),
  'DESCONTO OUTROS': z.string().optional().nullable(),
  GRUPO: z.string().optional().nullable(),
  'GRUPO ROTA': z.string().optional().nullable(),
  'OBSERVAÇÃO FIXA': z.string().optional().nullable(),
  'ALTERAÇÃO CLIENTE': z.string().optional().nullable(),
})

export type ClientFormData = z.infer<typeof clientSchema>
