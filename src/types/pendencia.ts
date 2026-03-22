import { z } from 'zod'

export interface PendenciaAnotacao {
  id: number
  pendencia_id: number
  funcionario_id: number | null
  texto: string
  created_at: string
  // Joined fields
  funcionario?: {
    nome_completo: string
  } | null
}

export interface Pendencia {
  id: number
  cliente_id: number
  funcionario_id: number
  descricao_pendencia: string
  resolvida: boolean
  descricao_resolucao: string | null
  responsavel_id: number | null
  created_at: string
  // Joined fields
  CLIENTES?: {
    CODIGO: number
    'NOME CLIENTE': string
    'TIPO DE CLIENTE': string | null
  }
  // Aliased joins
  creator?: {
    id: number
    nome_completo: string
  }
  responsible?: {
    id: number
    nome_completo: string
  } | null
}

export type PendenciaInsert = Omit<
  Pendencia,
  'id' | 'created_at' | 'CLIENTES' | 'creator' | 'responsible'
>
export type PendenciaUpdate = Partial<PendenciaInsert>

export const pendenciaSchema = z.object({
  cliente_id: z.number({ required_error: 'Cliente é obrigatório' }),
  funcionario_id: z.number({ required_error: 'Funcionário é obrigatório' }),
  responsavel_id: z.number().optional().nullable(),
  descricao_pendencia: z
    .string()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres'),
})

export type PendenciaFormData = z.infer<typeof pendenciaSchema>

export const resolucaoSchema = z.object({
  descricao_resolucao: z
    .string()
    .min(3, 'A resolução deve ter pelo menos 3 caracteres'),
})

export type ResolucaoFormData = z.infer<typeof resolucaoSchema>
