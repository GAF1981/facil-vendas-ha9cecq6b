import { supabase } from '@/lib/supabase/client'
import { MetaFuncionario, MetaPeriodo } from '@/types/meta'

export const metasService = {
  async getMeta(funcionarioId: number): Promise<MetaFuncionario | null> {
    const { data, error } = await supabase
      .from('metas_funcionarios' as any)
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()

    if (error) throw error
    return data as MetaFuncionario | null
  },

  async upsertMeta(funcionarioId: number, metaDiaria: number) {
    const { error } = await supabase
      .from('metas_funcionarios' as any)
      .upsert(
        { funcionario_id: funcionarioId, meta_diaria: metaDiaria },
        { onConflict: 'funcionario_id' },
      )

    if (error) throw error
  },

  async getMetasPeriodos(funcionarioId: number): Promise<MetaPeriodo[]> {
    const { data, error } = await supabase
      .from('metas_periodos' as any)
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .order('data_inicio', { ascending: false })

    if (error) throw error
    return data as MetaPeriodo[]
  },

  async addMetaPeriodo(
    funcionarioId: number,
    dataInicio: string,
    dataFim: string,
    valorMeta: number,
  ) {
    const { error } = await supabase.from('metas_periodos' as any).insert({
      funcionario_id: funcionarioId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor_meta: valorMeta,
    })

    if (error) throw error
  },

  async deleteMetaPeriodo(id: number) {
    const { error } = await supabase
      .from('metas_periodos' as any)
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getExceptionDays() {
    const { data, error } = await supabase
      .from('meta_excecoes' as any)
      .select('*, FUNCIONARIOS(nome_completo)')
      .order('data_inicio')
    if (error) throw error
    return data || []
  },

  async addExceptionDay(
    data_inicio: string,
    data_fim: string,
    descricao: string,
    funcionario_id?: number | null,
  ) {
    const payload: any = { data_inicio, data_fim, descricao }
    if (funcionario_id) {
      payload.funcionario_id = funcionario_id
    }
    const { error } = await supabase
      .from('meta_excecoes' as any)
      .insert(payload)
    if (error) throw error
  },

  async deleteExceptionDay(id: number) {
    const { error } = await supabase
      .from('meta_excecoes' as any)
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
