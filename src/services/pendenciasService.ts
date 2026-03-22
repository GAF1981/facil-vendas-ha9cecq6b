import { supabase } from '@/lib/supabase/client'
import {
  Pendencia,
  PendenciaInsert,
  PendenciaUpdate,
  PendenciaAnotacao,
} from '@/types/pendencia'

export const pendenciasService = {
  async getAll(resolvida?: boolean) {
    let query = supabase
      .from('PENDENCIAS')
      .select(
        `
        *,
        CLIENTES (
          CODIGO,
          "NOME CLIENTE",
          "TIPO DE CLIENTE"
        ),
        creator:FUNCIONARIOS!PENDENCIAS_funcionario_id_fkey (
          id,
          nome_completo
        ),
        responsible:FUNCIONARIOS!PENDENCIAS_responsavel_id_fkey (
          id,
          nome_completo
        )
      `,
      )
      .order('created_at', { ascending: false })

    if (resolvida !== undefined) {
      query = query.eq('resolvida', resolvida)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Pendencia[]
  },

  async create(pendencia: PendenciaInsert) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .insert(pendencia)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async update(id: number, pendencia: PendenciaUpdate) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .update(pendencia)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async resolve(
    id: number,
    descricao_resolucao: string,
    responsavel_id: number,
  ) {
    const { data, error } = await supabase
      .from('PENDENCIAS')
      .update({
        resolvida: true,
        descricao_resolucao,
        responsavel_id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Pendencia
  },

  async delete(id: number) {
    const { error } = await supabase.from('PENDENCIAS').delete().eq('id', id)
    if (error) throw error
  },

  async getAnotacoes(pendenciaId: number) {
    const { data, error } = await supabase
      .from('pendencia_anotacoes')
      .select(
        `
        *,
        funcionario:FUNCIONARIOS(nome_completo)
      `,
      )
      .eq('pendencia_id', pendenciaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as PendenciaAnotacao[]
  },

  async addAnotacao(pendenciaId: number, funcionarioId: number, texto: string) {
    const { data, error } = await supabase
      .from('pendencia_anotacoes')
      .insert({
        pendencia_id: pendenciaId,
        funcionario_id: funcionarioId,
        texto,
      })
      .select()
      .single()

    if (error) throw error
    return data as PendenciaAnotacao
  },
}
