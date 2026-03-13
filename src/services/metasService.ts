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

  async getAcertos(funcionarioId: number, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"DATA DO ACERTO", "NÚMERO DO PEDIDO", "FORMA"')
      .eq('CODIGO FUNCIONARIO', funcionarioId)
      .gte('DATA DO ACERTO', startDate)
      .lte('DATA DO ACERTO', endDate)
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (error) throw error

    const uniqueOrdersPerDay = new Map<string, Set<number>>()
    const uniqueCaptacaoPerDay = new Map<string, Set<number>>()

    data?.forEach((row) => {
      const date = row['DATA DO ACERTO']
      const orderId = row['NÚMERO DO PEDIDO']
      const forma = row['FORMA']
      if (!date || !orderId) return

      const dateStr = date.includes('T')
        ? date.split('T')[0]
        : date.split(' ')[0]

      if (forma && forma.toLowerCase().includes('captação')) {
        if (!uniqueCaptacaoPerDay.has(dateStr)) {
          uniqueCaptacaoPerDay.set(dateStr, new Set())
        }
        uniqueCaptacaoPerDay.get(dateStr)!.add(orderId as number)
      } else {
        if (!uniqueOrdersPerDay.has(dateStr)) {
          uniqueOrdersPerDay.set(dateStr, new Set())
        }
        uniqueOrdersPerDay.get(dateStr)!.add(orderId as number)
      }
    })

    const regularMap = new Map<string, number>()
    uniqueOrdersPerDay.forEach((orders, date) => {
      regularMap.set(date, orders.size)
    })

    const captacaoMap = new Map<string, number>()
    uniqueCaptacaoPerDay.forEach((orders, date) => {
      captacaoMap.set(date, orders.size)
    })

    return { regular: regularMap, captacao: captacaoMap }
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

