import { supabase } from '@/lib/supabase/client'
import { Employee, EmployeeInsert, EmployeeUpdate } from '@/types/employee'

export const employeesService = {
  async getEmployees(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
  ) {
    let query = supabase.from('FUNCIONARIOS').select('*', { count: 'exact' })

    if (search) {
      query = query.ilike('nome_completo', `%${search}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('id', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: data as Employee[],
      count: count || 0,
    }
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('FUNCIONARIOS')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Employee
  },

  async create(employee: EmployeeInsert) {
    const { data, error } = await supabase
      .from('FUNCIONARIOS')
      .insert(employee)
      .select()
      .single()

    if (error) throw error
    return data as Employee
  },

  async update(id: number, employee: EmployeeUpdate) {
    const { data, error } = await supabase
      .from('FUNCIONARIOS')
      .update(employee)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Employee
  },

  async delete(id: number) {
    const { error } = await supabase.from('FUNCIONARIOS').delete().eq('id', id)

    if (error) throw error
  },
}
