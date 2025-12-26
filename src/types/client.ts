import { Database } from '@/lib/supabase/types'
import { z } from 'zod'

// Type definition derived from Supabase Row
export type ClientRow = Database['public']['Tables']['CLIENTES']['Row']
export type ClientInsert = Database['public']['Tables']['CLIENTES']['Insert']
export type ClientUpdate = Database['public']['Tables']['CLIENTES']['Update']

// Zod Schema for validation
export const clientSchema = z.object({
  CODIGO: z.coerce
    .number({ required_error: 'Código é obrigatório' })
    .min(1, 'Código deve ser maior que 0'),
  'NOME CLIENTE': z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  'RAZÃO SOCIAL': z.string().optional().nullable(),
  CNPJ: z.string().optional().nullable(),
  IE: z.string().optional().nullable(),
  TIPO: z.string().optional().nullable(),
  'TIPO DE CLIENTE': z.string().optional().nullable(),
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
  'FONE 1': z.string().optional().nullable(),
  'FONE 2': z.string().optional().nullable(),
  'CONTATO 1': z.string().optional().nullable(),
  'CONTATO 2': z.string().optional().nullable(),
  'FORMA DE PAGAMENTO': z.string().optional().nullable(),
  'NOTA FISCAL': z.string().optional().nullable(),
  EXPOSITOR: z.string().optional().nullable(),
  Desconto: z.string().optional().nullable(),
  'OBSERVAÇÃO FIXA': z.string().optional().nullable(),
  'ALTERAÇÃO CLIENTE': z.string().optional().nullable(),
})

export type ClientFormData = z.infer<typeof clientSchema>
