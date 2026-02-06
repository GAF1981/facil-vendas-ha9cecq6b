import { supabase } from '@/lib/supabase/client'
import { ProductRow, ProductInsert, ProductUpdate } from '@/types/product'

export interface ImportPreviewResult {
  toUpdate: number
  toCreate: number
  errors: string[]
  previewUpdates: any[] // Sample of updates for preview if needed
  previewCreates: any[] // Sample of creates for preview if needed
}

export interface ImportResult {
  success: boolean
  updated: number
  created: number
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

      // Sanitize search term to prevent PostgREST syntax errors
      // We replace commas and parentheses with the SQL wildcard '_'
      // This allows searching for "49,99" without breaking the OR filter syntax
      const sanitizedSearch = searchTerm.replace(/[,()]/g, '_')

      // Always search text fields with ilike
      // Removed CODIGO reference to avoid errors with non-existent column
      let orQuery = `PRODUTO.ilike.%${sanitizedSearch}%,codigo_interno.ilike.%${sanitizedSearch}%,"CÓDIGO BARRAS".ilike.%${sanitizedSearch}%`

      // If it looks like a number, also search numeric IDs
      // We use original searchTerm for ID because it must be a valid number
      if (isNumber) {
        orQuery += `,ID.eq.${searchTerm}`
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

  async analyzeImport(data: CsvProductRow[]): Promise<ImportPreviewResult> {
    if (data.length === 0) {
      return {
        toUpdate: 0,
        toCreate: 0,
        errors: ['O arquivo CSV não contém dados válidos.'],
        previewUpdates: [],
        previewCreates: [],
      }
    }

    try {
      // Fetch only necessary columns for matching
      const { data: existingProducts, error } = await supabase
        .from('PRODUTOS')
        .select('ID, PRODUTO')

      if (error) throw error

      const productMap = new Map<string, number>()
      existingProducts?.forEach((p) => {
        if (p.PRODUTO) {
          productMap.set(p.PRODUTO.toLowerCase().trim(), p.ID)
        }
      })

      let toUpdate = 0
      let toCreate = 0
      const previewUpdates: any[] = []
      const previewCreates: any[] = []

      for (const row of data) {
        if (!row.produto) continue

        const normalizedName = row.produto.toLowerCase().trim()
        if (productMap.has(normalizedName)) {
          toUpdate++
          if (previewUpdates.length < 5) previewUpdates.push(row)
        } else {
          toCreate++
          if (previewCreates.length < 5) previewCreates.push(row)
        }
      }

      return {
        toUpdate,
        toCreate,
        errors: [],
        previewUpdates,
        previewCreates,
      }
    } catch (error: any) {
      console.error('Error analyzing import:', error)
      return {
        toUpdate: 0,
        toCreate: 0,
        errors: [error.message || 'Erro ao analisar arquivo.'],
        previewUpdates: [],
        previewCreates: [],
      }
    }
  },

  async importProducts(
    data: CsvProductRow[],
    userId?: number,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      updated: 0,
      created: 0,
      errors: [],
    }

    try {
      // 1. Fetch Existing Products
      const { data: existingProducts, error } = await supabase
        .from('PRODUTOS')
        .select('ID, PRODUTO')

      if (error) throw error

      const productMap = new Map<string, number>()
      existingProducts?.forEach((p) => {
        if (p.PRODUTO) {
          productMap.set(p.PRODUTO.toLowerCase().trim(), p.ID)
        }
      })

      // 2. Separate Updates and Creates
      const updates: {
        id: number
        codigo_interno?: string | null
        codigo_barras?: string | null
      }[] = []

      const creates: {
        ID: number
        PRODUTO: string
        codigo_interno?: string | null
        'CÓDIGO BARRAS'?: string | null
      }[] = []

      // 3. Get Next ID for new items
      let nextId = await this.getNextId()

      for (const row of data) {
        if (!row.produto) continue

        const normalizedName = row.produto.toLowerCase().trim()
        const existingId = productMap.get(normalizedName)

        // Sanitize codes - ensure empty strings become null or trimmed strings
        const codigoInterno = row.codigo_interno
          ? row.codigo_interno.trim()
          : null
        const codigoBarras = row.codigo_barras ? row.codigo_barras.trim() : null

        if (existingId) {
          updates.push({
            id: existingId,
            codigo_interno: codigoInterno,
            codigo_barras: codigoBarras,
          })
        } else {
          creates.push({
            ID: nextId++,
            PRODUTO: row.produto.trim(),
            codigo_interno: codigoInterno,
            'CÓDIGO BARRAS': codigoBarras,
          })
        }
      }

      // 4. Perform Bulk Updates (via RPC)
      if (updates.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < updates.length; i += chunkSize) {
          const chunk = updates.slice(i, i + chunkSize)
          const { error: updateError } = await supabase.rpc(
            'bulk_update_product_codes',
            { payload: chunk },
          )

          if (updateError) {
            console.error('Error updating batch:', updateError)
            result.errors.push(`Erro ao atualizar lote ${i / chunkSize + 1}`)
          } else {
            result.updated += chunk.length
          }
        }
      }

      // 5. Perform Bulk Inserts
      if (creates.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < creates.length; i += chunkSize) {
          const chunk = creates.slice(i, i + chunkSize)
          const { error: insertError } = await supabase
            .from('PRODUTOS')
            .insert(chunk as any)

          if (insertError) {
            console.error('Error inserting batch:', insertError)
            result.errors.push(
              `Erro ao criar novos produtos lote ${i / chunkSize + 1}`,
            )
          } else {
            result.created += chunk.length
          }
        }
      }

      result.success = result.errors.length === 0

      // 6. Audit Log
      if (userId) {
        await supabase.from('system_logs').insert({
          type: 'PRODUCT_IMPORT',
          description: `Importação CSV: ${result.created} criados, ${result.updated} atualizados.`,
          meta: {
            created: result.created,
            updated: result.updated,
            errors: result.errors,
          },
          user_id: userId,
        })
      }
    } catch (err: any) {
      console.error('Import error:', err)
      result.errors.push(err.message || 'Erro crítico ao processar importação.')
      result.success = false
    }

    return result
  },
}
