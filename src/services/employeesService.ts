import { supabase } from '@/lib/supabase/client'
import { Employee, EmployeeInsert, EmployeeUpdate } from '@/types/employee'

export const employeesService = {
  async getEmployees(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
  ) {
    try {
      let query = supabase.from('FUNCIONARIOS').select('*', { count: 'exact' })

      if (search) {
        query = query.ilike('nome_completo', `%${search}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('id', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Supabase error fetching employees:', error)
        throw error
      }

      return {
        data: (data || []) as Employee[],
        count: count || 0,
      }
    } catch (err) {
      console.error('Service error fetching employees:', err)
      throw err
    }
  },

  async getById(id: number) {
    try {
      const { data, error } = await supabase
        .from('FUNCIONARIOS')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error(`Supabase error fetching employee with id ${id}:`, error)
        throw error
      }
      return data as Employee
    } catch (err) {
      console.error(`Service error fetching employee by id ${id}:`, err)
      throw err
    }
  },

  async getByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('FUNCIONARIOS')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        console.error(
          `Supabase error fetching employee with email ${email}:`,
          error,
        )
        throw error
      }
      return data as Employee
    } catch (err) {
      console.error(`Service error fetching employee by email ${email}:`, err)
      throw err
    }
  },

  async create(employee: EmployeeInsert) {
    try {
      // Cast to any to avoid type errors with outdated generated Supabase types
      const { data, error } = await supabase
        .from('FUNCIONARIOS')
        .insert(employee as any)
        .select()
        .single()

      if (error) {
        console.error('Supabase error creating employee:', error)
        throw error
      }
      return data as Employee
    } catch (err) {
      console.error('Service error creating employee:', err)
      throw err
    }
  },

  async update(id: number, employee: EmployeeUpdate) {
    try {
      // Cast to any to avoid type errors with outdated generated Supabase types
      const { data, error } = await supabase
        .from('FUNCIONARIOS')
        .update(employee as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Supabase error updating employee with id ${id}:`, error)
        throw error
      }
      return data as Employee
    } catch (err) {
      console.error(`Service error updating employee by id ${id}:`, err)
      throw err
    }
  },

  async delete(id: number) {
    try {
      const { error } = await supabase
        .from('FUNCIONARIOS')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Supabase error deleting employee with id ${id}:`, error)
        throw error
      }
    } catch (err) {
      console.error(`Service error deleting employee by id ${id}:`, err)
      throw err
    }
  },
}
