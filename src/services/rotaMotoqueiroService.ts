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
      const start = `${month}-01T00:00:00`
      // Calculate end of month roughly or use logic
      // Easier: filter by text or date range
      // Let's use date range for accuracy
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59)

      query = query
        .gte('data_hora', startDate.toISOString())
        .lte('data_hora', endDate.toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    return data as RotaMotoqueiroKm[]
  },

  async create(data: RotaMotoqueiroKmInsert) {
    const { error } = await supabase.from('rota_motoqueiro_km').insert(data)
    if (error) throw error
  },

  async update(id: number, data: Partial<RotaMotoqueiroKmInsert>) {
    const { error } = await supabase
      .from('rota_motoqueiro_km')
      .update(data)
      .eq('id', id)
    if (error) throw error
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('rota_motoqueiro_km')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
