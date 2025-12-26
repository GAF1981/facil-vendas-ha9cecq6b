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
        const numValue = Number(searchTerm)
        // PostgreSQL integer max value is 2,147,483,647.
        const isIntSafe = numValue <= 2147483647

        const conditions = []
        if (isIntSafe) {
          conditions.push(`CODIGO.eq.${searchTerm}`)
        }
        // CÓDIGO BARRAS typically handles larger numbers (EAN-13)
        conditions.push(`"CÓDIGO BARRAS".eq.${searchTerm}`)
        // Always allow searching by name even if it looks like a number
        conditions.push(`MERCADORIA.ilike.%${searchTerm}%`)

        query = query.or(conditions.join(','))
      } else {
        // Text search: name or description
        query = query.or(
          `MERCADORIA.ilike.%${searchTerm}%, "DESCRIÇÃO RESUMIDA".ilike.%${searchTerm}%`,
        )
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('MERCADORIA', { ascending: true })
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
