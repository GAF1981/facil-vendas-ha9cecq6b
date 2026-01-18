import { supabase } from '@/lib/supabase/client'
import {
  RotaMotoqueiroKm,
  RotaMotoqueiroKmInsert,
} from '@/types/rota_motoqueiro'

export const rotaMotoqueiroService = {
  async getAll(month?: string) {
    let query = supabase
      .from('rota_motoqueiro_km')
      .select('*, funcionario:FUNCIONARIOS(nome_completo)')
      .order('data_hora', { ascending: false })

    if (month) {
      // month format: YYYY-MM
      const [year, monthNum] = month.split('-').map(Number)

      // Start of month: 1st day 00:00:00 Brazil Time (UTC-3)
      const startDate = new Date(`${month}-01T00:00:00-03:00`)

      // End of month: Last day 23:59:59 Brazil Time (UTC-3)
      // We calculate the last day of the month
      const lastDay = new Date(year, monthNum, 0).getDate()
      const endDate = new Date(`${month}-${lastDay}T23:59:59.999-03:00`)

      // .toISOString() converts these to UTC, ensuring we query the correct absolute time range
      query = query
        .gte('data_hora', startDate.toISOString())
        .lte('data_hora', endDate.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return data as RotaMotoqueiroKm[]
  },

  async create(data: RotaMotoqueiroKmInsert) {
    if (!data.funcionario_id) {
      throw new Error('ID do funcionário é obrigatório para registrar KM.')
    }

    const { data: created, error } = await supabase
      .from('rota_motoqueiro_km')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return created
  },

  async update(id: number, data: Partial<RotaMotoqueiroKmInsert>) {
    const { data: updated, error } = await supabase
      .from('rota_motoqueiro_km')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updated
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('rota_motoqueiro_km')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
