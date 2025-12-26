import { z } from 'zod'

export interface Employee {
  id: number
  nome_completo: string
  apelido: string | null
  cpf: string | null
  email: string
  setor: string | null
  senha?: string // Optional because RPC login doesn't return it for security
  foto_url?: string | null
  created_at?: string
}

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at'>
export type EmployeeUpdate = Partial<EmployeeInsert>

// Schema for employee form (management)
export const employeeSchema = z.object({
  nome_completo: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  apelido: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .refine((val) => val.includes('@'), {
      message: 'O email deve conter o caractere @',
    }),
  setor: z.string().optional().nullable(),
  senha: z
    .string()
    .length(4, 'A senha deve ter exatamente 4 dígitos')
    .regex(/^\d+$/, 'A senha deve conter apenas números'),
  foto_url: z
    .string()
    .url('URL inválida')
    .optional()
    .nullable()
    .or(z.literal('')),
})

// Schema for login
export const loginSchema = z.object({
  email: z.string().email('Insira um email válido'),
  password: z
    .string()
    .length(4, 'A senha deve ter 4 dígitos')
    .regex(/^\d+$/, 'A senha deve conter apenas números'),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>
export type LoginFormData = z.infer<typeof loginSchema>
