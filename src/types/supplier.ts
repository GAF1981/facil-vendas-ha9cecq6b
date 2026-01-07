import { z } from 'zod'

export interface Supplier {
  id: number
  nome_fornecedor: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  created_at?: string
}

export const supplierSchema = z.object({
  nome_fornecedor: z.string().min(2, 'Nome é obrigatório'),
  cnpj: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
