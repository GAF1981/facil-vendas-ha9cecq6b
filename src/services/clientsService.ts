import { supabase } from '@/lib/supabase/client'
import { ClientRow, ClientInsert, ClientUpdate } from '@/types/client'

export const clientsService = {
  // Now supports pagination and search
  async getClients(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
  ) {
    let query = supabase.from('CLIENTES').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      // If search is numeric, it could be a CODIGO or partial text match in other fields
      // If text, search only text fields
      if (isNumber) {
        // Using raw PostgREST syntax for OR with mixed types can be tricky in the JS client helper
        // But Supabase 'or' helper takes a string of comma-separated filters.
        // We cast CODIGO to text implicitly in the backend query or we just check equality for exact match
        // For strictness, if it's a number, we try exact match on ID OR partial on others.
        query = query.or(
          `CODIGO.eq.${searchTerm},NOME CLIENTE.ilike.%${searchTerm}%,RAZÃO SOCIAL.ilike.%${searchTerm}%,CNPJ.ilike.%${searchTerm}%`,
        )
      } else {
        query = query.or(
          `NOME CLIENTE.ilike.%${searchTerm}%,RAZÃO SOCIAL.ilike.%${searchTerm}%,CNPJ.ilike.%${searchTerm}%`,
        )
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
    // Legacy support if needed, but preferable to use getClients
    const { data, error } = await supabase
      .from('CLIENTES')
      .select('*')
      .order('CODIGO', { ascending: false })
      .limit(1000) // Keep limit for safety on this deprecated method

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

    // Simple robust query for recent clients
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
