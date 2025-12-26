import { supabase } from '@/lib/supabase/client'
import { Product, ProductInsert, ProductUpdate } from '@/types/product'

export const productsService = {
  async getProducts(page = 1, pageSize = 20, search = '') {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      // Check if the search term matches a strictly numeric pattern (digits only)
      const isNumeric = /^\d+$/.test(searchTerm)

      if (isNumeric) {
        // If numeric, search in CODIGO, CÓDIGO BARRAS (exact) and PRODUTOS (partial)
        // We use 'or' to combine conditions
        // Note: We construct the OR string carefully to handle potential special characters in names if strictly numeric fails check but still safe
        query = query.or(
          `CODIGO.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm},PRODUTOS.ilike.%${searchTerm}%`,
        )
      } else {
        // Text search: name or description
        query = query.or(
          `PRODUTOS.ilike.%${searchTerm}%, "DESCRIÇÃO RESUMIDA".ilike.%${searchTerm}%`,
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
      data: data as Product[],
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
    return data as Product
  },

  async getByBarcode(barcode: number) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .select('*')
      .eq('CÓDIGO BARRAS', barcode)
      .single()

    if (error) return null
    return data as Product
  },

  async create(product: ProductInsert) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .insert(product)
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  async update(id: number, product: ProductUpdate) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .update(product)
      .eq('CODIGO', id)
      .select()
      .single()

    if (error) throw error
    return data as Product
  },

  async delete(id: number) {
    const { error } = await supabase.from('PRODUTOS').delete().eq('CODIGO', id)

    if (error) throw error
  },
}
