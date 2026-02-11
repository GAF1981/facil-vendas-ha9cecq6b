import { z } from 'zod'

export interface SupplierContact {
  nome: string
  telefone: string
}

export interface Supplier {
  id: number
  nome_fornecedor: string
  cnpj: string | null
  endereco: string | null
  telefone: string | null
  contatos: SupplierContact[] | null
  created_at?: string
}

export const supplierContactSchema = z.object({
  nome: z.string().min(1, 'Nome do contato é obrigatório'),
  telefone: z.string().min(1, 'Telefone do contato é obrigatório'),
})

export const supplierSchema = z.object({
  nome_fornecedor: z.string().min(2, 'Nome é obrigatório'),
  cnpj: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  contatos: z.array(supplierContactSchema).default([]),
})

export type SupplierFormData = z.infer<typeof supplierSchema>
