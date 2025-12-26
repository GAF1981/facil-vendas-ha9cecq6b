import { supabase } from '@/lib/supabase/client'
import { ProductRow, ProductInsert, ProductUpdate } from '@/types/product'

export const productsService = {
  async getProducts(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
  ) {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        // Search by exact CODIGO or CÓDIGO BARRAS, or partial name
        query = query.or(
          `CODIGO.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm},PRODUTOS.ilike.%${searchTerm}%`,
        )
      } else {
        // Search by partial name
        query = query.ilike('PRODUTOS', `%${searchTerm}%`)
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('CODIGO', { ascending: true })
      .range(from, to)

    if (error) throw error

    return {
      data: data as ProductRow[],
      count: count || 0,
    }
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('*')
      .eq('CODIGO', id)
      .single()

    if (error) throw error
    return data as ProductRow
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
      .eq('CODIGO', id)
      .select()
      .single()

    if (error) throw error
    return data as ProductRow
  },

  async delete(id: number) {
    const { error } = await supabase.from('PRODUTOS').delete().eq('CODIGO', id)

    if (error) throw error
  },
}
