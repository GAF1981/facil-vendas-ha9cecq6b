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

  async getAcertos(
    funcionarioId: number,
    funcionarioNome: string,
    startDate: string,
    endDate: string,
  ) {
    const safeName = (funcionarioNome || '').replace(/,/g, '').trim()
    let orQuery = `"CODIGO FUNCIONARIO".eq.${funcionarioId}`
    if (safeName) {
      orQuery += `,FUNCIONÁRIO.ilike.%${safeName}%`
    }

    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"DATA DO ACERTO", "DATA E HORA", "NÚMERO DO PEDIDO", "FORMA"')
      .gte('DATA DO ACERTO', startDate)
      .lte('DATA DO ACERTO', endDate)
      .not('NÚMERO DO PEDIDO', 'is', null)
      .or(orQuery)

    if (error) throw error

    const uniqueOrdersPerDay = new Map<string, Set<number>>()
    const uniqueCaptacaoPerDay = new Map<string, Set<number>>()

    data?.forEach((row) => {
      let dateStr = row['DATA DO ACERTO']
      if (!dateStr && row['DATA E HORA']) {
        dateStr = row['DATA E HORA'].split('T')[0]
      }
      if (!dateStr) return

      const orderId = row['NÚMERO DO PEDIDO']
      const forma = row['FORMA']
      if (!orderId) return

      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0]
      } else if (dateStr.includes(' ')) {
        dateStr = dateStr.split(' ')[0]
      }

      const formaStr = forma ? forma.toLowerCase() : ''
      if (formaStr.includes('captação') || formaStr.includes('captacao')) {
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
