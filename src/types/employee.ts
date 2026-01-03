import { z } from 'zod'

export interface Employee {
  id: number
  nome_completo: string
  apelido: string | null
  cpf: string | null
  email: string
  setor: string | null
  senha?: string
  foto_url?: string | null
  created_at?: string
  situacao: 'ATIVO' | 'INATIVO'
}

export type EmployeeInsert = Omit<Employee, 'id' | 'created_at'>
export type EmployeeUpdate = Partial<EmployeeInsert>

// Schema for employee form
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
  // Password optional and looser validation for legacy/updates
  senha: z.string().optional().nullable().or(z.literal('')),
  // Allow Data URLs (starting with data:) or standard URLs, or empty
  foto_url: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) =>
        !val ||
        val === '' ||
        val.startsWith('http') ||
        val.startsWith('data:image'),
      {
        message: 'URL inválida ou formato de imagem não suportado',
      },
    ),
  situacao: z.enum(['ATIVO', 'INATIVO'], {
    required_error: 'Situação é obrigatória',
  }),
})

export const loginSchema = z.object({
  email: z.string().email('Insira um email válido'),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>
export type LoginFormData = z.infer<typeof loginSchema>
