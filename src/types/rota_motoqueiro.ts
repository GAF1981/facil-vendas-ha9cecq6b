import { z } from 'zod'

export interface RotaMotoqueiroKm {
  id: number
  created_at: string
  data_hora: string
  km_percorrido: number
  funcionario_id: number
  // Joined
  funcionario?: {
    nome_completo: string
  }
}

export type RotaMotoqueiroKmInsert = Omit<
  RotaMotoqueiroKm,
  'id' | 'created_at' | 'funcionario'
>

export const kmSchema = z.object({
  data_hora: z.string().min(1, 'Data e hora são obrigatórias'),
  km_percorrido: z.coerce.number().min(0.1, 'KM deve ser maior que 0'),
})

export type KmFormData = z.infer<typeof kmSchema>
