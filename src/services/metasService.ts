import { supabase } from '@/lib/supabase/client'
import { MetaFuncionario } from '@/types/meta'

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

  async getAcertos(funcionarioId: number, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"DATA DO ACERTO", "NÚMERO DO PEDIDO"')
      .eq('CODIGO FUNCIONARIO', funcionarioId)
      .gte('DATA DO ACERTO', startDate)
      .lte('DATA DO ACERTO', endDate)
      .not('NÚMERO DO PEDIDO', 'is', null)

    if (error) throw error

    const uniqueOrdersPerDay = new Map<string, Set<number>>()

    data?.forEach((row) => {
      const date = row['DATA DO ACERTO']
      const orderId = row['NÚMERO DO PEDIDO']
      if (!date || !orderId) return

      const dateStr = date.includes('T')
        ? date.split('T')[0]
        : date.split(' ')[0]

      if (!uniqueOrdersPerDay.has(dateStr)) {
        uniqueOrdersPerDay.set(dateStr, new Set())
      }
      uniqueOrdersPerDay.get(dateStr)!.add(orderId as number)
    })

    const result = new Map<string, number>()
    uniqueOrdersPerDay.forEach((orders, date) => {
      result.set(date, orders.size)
    })

    return result
  },
}
