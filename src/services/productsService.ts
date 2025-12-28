import { supabase } from '@/lib/supabase/client'
import { ProductRow, ProductInsert, ProductUpdate } from '@/types/product'

export const productsService = {
  async getProducts(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    group: string | null = null,
    frequentes: string | null = null,
  ) {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        // Search by ID, Internal Code (CODIGO), Barcode (CÓDIGO BARRAS) OR Name (PRODUTO)
        // Using quotes for columns with spaces
        query = query.or(
          `ID.eq.${searchTerm},CODIGO.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm},PRODUTO.ilike.%${searchTerm}%`,
        )
      } else {
        // Search specifically by name (PRODUTO) for text queries
        query = query.ilike('PRODUTO', `%${searchTerm}%`)
      }
    }

    if (group && group !== 'todos') {
      query = query.eq('GRUPO', group)
    }

    if (frequentes && frequentes !== 'todos') {
      query = query.eq('FREQUENTES', frequentes)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('ID', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    return {
      data: (data as ProductRow[]) || [],
      count: count || 0,
    }
  },

  async getGroups() {
    const { data, error } = await supabase.rpc('get_unique_product_groups')

    if (error) {
      console.error('Error fetching groups:', error)
      return []
    }

    return (data as any[]).map((item) => item.grupo).filter(Boolean) as string[]
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('*')
      .eq('ID', id)
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async getNextId() {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('ID')
      .order('ID', { ascending: false })
      .limit(1)
      .single()

    // PGRST116: The result contains 0 rows (table is empty)
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching next ID:', error)
      throw error
    }

    const maxId = data?.ID || 0
    // Smart suggestion: If maxId < 105, start at 105. Otherwise, increment.
    return maxId < 105 ? 105 : maxId + 1
  },

  async checkIdExists(id: number) {
    const { count, error } = await supabase
      .from('PRODUTOS')
      .select('ID', { count: 'exact', head: true })
      .eq('ID', id)

    if (error) {
      console.error('Error checking ID existence:', error)
      throw error
    }

    return (count || 0) > 0
  },

  async create(product: ProductInsert) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .insert(product)
      .select()
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async update(id: number, product: ProductUpdate) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .update(product)
      .eq('ID', id)
      .select()
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async delete(id: number) {
    const { error } = await supabase.from('PRODUTOS').delete().eq('ID', id)

    if (error) throw error
  },
}
