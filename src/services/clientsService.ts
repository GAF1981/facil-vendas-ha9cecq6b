import { supabase } from '@/lib/supabase/client'
import { ClientRow, ClientInsert, ClientUpdate } from '@/types/client'

export const clientsService = {
  // Now supports filtering by TIPO DE CLIENTE
  async getClients(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    typeFilter: string | 'all' = 'all',
  ) {
    let query = supabase.from('CLIENTES').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        query = query.or(
          `CODIGO.eq.${searchTerm},NOME CLIENTE.ilike.%${searchTerm}%`,
        )
      } else {
        query = query.ilike('NOME CLIENTE', `%${searchTerm}%`)
      }
    }

    if (typeFilter && typeFilter !== 'all') {
      // Assuming the column is "TIPO DE CLIENTE"
      query = query.eq('TIPO DE CLIENTE', typeFilter)
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

  async getNextCode() {
    const { data, error } = await supabase
      .from('CLIENTES')
      .select('CODIGO')
      .order('CODIGO', { ascending: false })
      .limit(1)
      .single()

    // PGRST116 is the error code for "The result contains 0 rows" when using single()
    if (error && error.code !== 'PGRST116') throw error

    const maxCode = data?.CODIGO || 0
    return maxCode + 1
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

  async getRoutes() {
    const { data, error } = await supabase.rpc('get_unique_client_routes')

    if (error) {
      console.error('Error fetching routes:', error)
      return []
    }

    return (data as any[]).map((item) => item.rota).filter(Boolean) as string[]
  },

  async createRoute(name: string) {
    const { data, error } = await supabase
      .from('CRIAR_NOVA_ROTA')
      .insert({ nome_rota: name })
      .select()
      .single()

    if (error) throw error
    return data
  },
}
