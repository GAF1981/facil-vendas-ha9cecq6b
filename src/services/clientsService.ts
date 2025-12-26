import { supabase } from '@/lib/supabase/client'
import { ClientRow, ClientInsert, ClientUpdate } from '@/types/client'

export const clientsService = {
  // Now supports pagination and search optimized for CODIGO and NOME CLIENTE
  async getClients(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
  ) {
    let query = supabase.from('CLIENTES').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      // Check if search term is a valid number (and not empty string)
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        // If numeric, search match in CODIGO (exact) OR NOME CLIENTE (partial)
        query = query.or(
          `CODIGO.eq.${searchTerm},NOME CLIENTE.ilike.%${searchTerm}%`,
        )
      } else {
        // If text, search match only in NOME CLIENTE (partial)
        // Explicitly ignoring other fields like Address, CNPJ, etc.
        query = query.ilike('NOME CLIENTE', `%${searchTerm}%`)
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('CODIGO', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      data: data as ClientRow[],
      count: count || 0,
    }
  },

  async getAll() {
    const { data, error } = await supabase
      .from('CLIENTES')
      .select('*')
      .order('CODIGO', { ascending: false })
      .limit(1000)

    if (error) throw error
    return data as ClientRow[]
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('CLIENTES')
      .select('*')
      .eq('CODIGO', id)
      .single()

    if (error) throw error
    return data as ClientRow
  },

  async create(client: ClientInsert) {
    const { data, error } = await supabase
      .from('CLIENTES')
      .insert(client)
      .select()
      .single()

    if (error) throw error
    return data as ClientRow
  },

  async update(id: number, client: ClientUpdate) {
    const { data, error } = await supabase
      .from('CLIENTES')
      .update(client)
      .eq('CODIGO', id)
      .select()
      .single()

    if (error) throw error
    return data as ClientRow
  },

  async delete(id: number) {
    const { error } = await supabase.from('CLIENTES').delete().eq('CODIGO', id)

    if (error) throw error
  },

  async getMetrics() {
    const { count: totalClients, error: countError } = await supabase
      .from('CLIENTES')
      .select('*', { count: 'exact', head: true })

    if (countError) throw countError

    const { data: recentClients, error: listError } = await supabase
      .from('CLIENTES')
      .select('*')
      .order('CODIGO', { ascending: false })
      .limit(5)

    if (listError) throw listError

    return {
      totalClients: totalClients || 0,
      recentClients: recentClients as ClientRow[],
    }
  },
}
