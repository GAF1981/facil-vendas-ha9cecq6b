import { supabase } from '@/lib/supabase/client'
import { ProductRow, ProductInsert, ProductUpdate } from '@/types/product'

export interface BulkUpdateResult {
  success: number
  failed: number
  errors: string[]
}

export interface CsvProductRow {
  produto: string
  codigo_interno?: string
  codigo_barras?: string
}

export const productsService = {
  async getProducts(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    group: string | null = null,
    frequentes: string | null = null,
    orderBy: 'ID' | 'PRODUTO' = 'ID',
    ascending: boolean = false,
  ) {
    let query = supabase.from('PRODUTOS').select('*', { count: 'exact' })

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      // Always search text fields with ilike
      let orQuery = `PRODUTO.ilike.%${searchTerm}%,codigo_interno.ilike.%${searchTerm}%,"CÓDIGO BARRAS".ilike.%${searchTerm}%`

      // If it looks like a number, also search numeric IDs
      if (isNumber) {
        orQuery += `,ID.eq.${searchTerm},CODIGO.eq.${searchTerm}`
      }

      query = query.or(orQuery)
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
      .order(orderBy, { ascending })
      .range(from, to)

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    return {
      data: (data as unknown as ProductRow[]) || [],
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
    return data as unknown as ProductRow
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
      .insert(product as any)
      .select()
      .single()

    if (error) throw error
    return data as unknown as ProductRow
  },

  async update(id: number, product: ProductUpdate) {
    const { data, error } = await supabase
      .from('PRODUTOS')
      .update(product as any)
      .eq('ID', id)
      .select()
      .single()

    if (error) throw error
    return data as unknown as ProductRow
  },

  async delete(id: number) {
    const { error } = await supabase.from('PRODUTOS').delete().eq('ID', id)

    if (error) throw error
  },

  async parseCSV(file: File): Promise<CsvProductRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (!text) {
          resolve([])
          return
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
        if (lines.length < 2) {
          resolve([])
          return
        }

        const firstLine = lines[0]
        const delimiter = firstLine.includes(';') ? ';' : ','

        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.trim().toLowerCase().replace(/"/g, ''))

        const result: CsvProductRow[] = []

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i]
          const values = currentLine
            .split(delimiter)
            .map((v) => v.trim().replace(/"/g, ''))

          if (values.length === headers.length) {
            const row: any = {}
            headers.forEach((header, index) => {
              if (header === 'produto') row.produto = values[index]
              if (
                header === 'codigo_interno' ||
                header === 'código interno' ||
                header === 'codigo interno'
              )
                row.codigo_interno = values[index]
              if (
                header === 'codigo_barras' ||
                header === 'código de barras' ||
                header === 'codigo barras'
              )
                row.codigo_barras = values[index]
            })
            if (row.produto) {
              result.push(row as CsvProductRow)
            }
          }
        }
        resolve(result)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
  },

  async bulkUpdateFromCsv(data: CsvProductRow[]): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: 0,
      failed: 0,
      errors: [],
    }

    if (data.length === 0) {
      result.errors.push('O arquivo CSV não contém dados válidos.')
      return result
    }

    try {
      const { data: products, error } = await supabase
        .from('PRODUTOS')
        .select('ID, PRODUTO')

      if (error) throw error

      const productMap = new Map<string, number>()
      products?.forEach((p) => {
        if (p.PRODUTO) {
          productMap.set(p.PRODUTO.toLowerCase().trim(), p.ID)
        }
      })

      const updates: {
        ID: number
        codigo_interno?: string | null
        'CÓDIGO BARRAS'?: string | null
      }[] = []

      for (const row of data) {
        if (!row.produto) {
          result.failed++
          continue
        }

        const normalizedName = row.produto.toLowerCase().trim()
        const productId = productMap.get(normalizedName)

        if (productId) {
          // Use strings directly, preserve leading zeros
          const codigoInterno = row.codigo_interno
            ? row.codigo_interno.trim()
            : null
          const codigoBarras = row.codigo_barras
            ? row.codigo_barras.trim()
            : null

          updates.push({
            ID: productId,
            codigo_interno: codigoInterno,
            'CÓDIGO BARRAS': codigoBarras,
          })
          result.success++
        } else {
          result.failed++
        }
      }

      if (updates.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize)
          const { error: updateError } = await supabase
            .from('PRODUTOS')
            .upsert(chunk as any)

          if (updateError) {
            console.error('Error updating batch:', updateError)
            result.errors.push(`Erro ao atualizar lote ${i / chunkSize + 1}`)
          }
        }
      }
    } catch (err: any) {
      console.error('Bulk update error:', err)
      result.errors.push(
        err.message || 'Erro desconhecido ao processar atualização.',
      )
    }

    return result
  },
}
