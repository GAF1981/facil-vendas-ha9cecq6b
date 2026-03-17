import { supabase } from '@/lib/supabase/client'
import { ClientRow, ClientInsert, ClientUpdate } from '@/types/client'

export const clientsService = {
  // ... existing methods ...
  async getClients(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    typeFilter: string | 'all' = 'all',
    municipioFilter: string | 'all' = 'all',
    groupFilter: string | 'all' = 'all',
    routeFilter: string | 'all' = 'all',
    cnpjFilter: string = '',
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

    if (cnpjFilter) {
      const cleanCnpj = cnpjFilter.trim()
      if (cleanCnpj) {
        query = query.ilike('CNPJ', `%${cleanCnpj}%`)
      }
    }

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('TIPO DE CLIENTE', typeFilter)
    }
    if (municipioFilter && municipioFilter !== 'all') {
      query = query.eq('MUNICÍPIO', municipioFilter)
    }
    if (groupFilter && groupFilter !== 'all') {
      query = query.eq('GRUPO', groupFilter)
    }
    if (routeFilter && routeFilter !== 'all') {
      query = query.eq('GRUPO ROTA', routeFilter)
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

  async getAllForExport() {
    // Select specific columns as requested for export
    const { data, error } = await supabase
      .from('CLIENTES')
      .select(
        `
        CODIGO,
        "NOME CLIENTE",
        "RAZÃO SOCIAL",
        CNPJ,
        IE,
        "TIPO DE CLIENTE",
        TIPO,
        MUNICÍPIO,
        BAIRRO,
        ENDEREÇO,
        "CEP OFICIO",
        "FONE 1",
        "FONE 2",
        "CONTATO 1",
        "CONTATO 2",
        EMAIL,
        email_cobranca,
        telefone_cobranca,
        GRUPO,
        "GRUPO ROTA",
        "FORMA DE PAGAMENTO",
        "NOTA FISCAL",
        EXPOSITOR,
        "OBSERVAÇÃO FIXA",
        Desconto,
        "DESCONTO BRINQUEDO",
        "DESCONTO ACESSORIO",
        "DESCONTO ACESSORIO CELULAR",
        "DESCONTO OUTROS",
        "ALTERAÇÃO CLIENTE",
        situacao
      `,
      )
      .order('CODIGO', { ascending: true })

    if (error) throw error
    return data
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

  async getUniqueClientTypes() {
    const { data, error } = await supabase.rpc('get_unique_client_types')
    if (error) {
      console.error('Error fetching client types:', error)
      return []
    }
    return (data as any[]).map((item) => item.tipo).filter(Boolean) as string[]
  },

  async getUniqueExpositores() {
    const { data, error } = await supabase.rpc('get_unique_expositores')
    if (error) {
      console.error('Error fetching expositores:', error)
      return []
    }
    return (data as any[])
      .map((item) => item.expositor)
      .filter(Boolean) as string[]
  },

  async getAddressByCep(cep: string) {
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return null

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (data.erro) return null

      return {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        uf: data.uf,
        municipio: `${data.localidade} - ${data.uf}`,
      }
    } catch (error) {
      console.error('Error fetching address:', error)
      return null
    }
  },

  async checkDuplicateCpfCnpj(doc: string, excludeId?: number) {
    let query = supabase
      .from('CLIENTES')
      .select('CODIGO, "NOME CLIENTE"')
      .eq('CNPJ', doc)

    if (excludeId) {
      query = query.neq('CODIGO', excludeId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    return data
  },

  // New Methods for filters
  async getUniqueMunicipios() {
    const { data } = await supabase
      .from('CLIENTES')
      .select('MUNICÍPIO')
      .order('MUNICÍPIO')

    if (!data) return []
    return [
      ...new Set(data.map((c) => c.MUNICÍPIO).filter(Boolean)),
    ] as string[]
  },

  async getUniqueGroups() {
    const { data } = await supabase
      .from('CLIENTES')
      .select('GRUPO')
      .order('GRUPO')

    if (!data) return []
    return [...new Set(data.map((c) => c.GRUPO).filter(Boolean))] as string[]
  },

  async getAllCNPJs() {
    const { data } = await supabase.from('CLIENTES').select('CODIGO, CNPJ')
    return data || []
  },

  // Import related methods
  async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
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

          // Detect delimiter
          const firstLine = lines[0]
          const delimiter = firstLine.includes(';') ? ';' : ','

          // Parse headers (trim and remove quotes)
          const headers = lines[0]
            .split(delimiter)
            .map((h) => h.trim().replace(/^"|"$/g, ''))

          const result: any[] = []

          for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i]
            // Simple split regex for CSV to handle basic quoting
            // This splits by delimiter only if not inside quotes
            const regex = new RegExp(
              `\\s*${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)\\s*`,
            )
            const values = currentLine
              .split(regex)
              .map((v) => v.trim().replace(/^"|"$/g, ''))

            if (values.length === headers.length) {
              const row: any = {}
              headers.forEach((header, index) => {
                row[header] = values[index]
              })
              result.push(row)
            }
          }
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
  },

  async analyzeImport(data: any[]) {
    try {
      const { data: existing } = await supabase
        .from('CLIENTES')
        .select('CODIGO')
      const existingIds = new Set(existing?.map((c) => c.CODIGO) || [])

      let toCreate = 0
      let toUpdate = 0

      data.forEach((row) => {
        const keys = Object.keys(row)
        const codigoKey = keys.find((k) => k.toUpperCase() === 'CODIGO')
        const codigo = codigoKey ? Number(row[codigoKey]) : null

        if (codigo && !isNaN(codigo)) {
          if (existingIds.has(codigo)) {
            toUpdate++
          } else {
            toCreate++
          }
        }
      })

      return { toCreate, toUpdate }
    } catch (error) {
      console.error('Error analyzing import:', error)
      return { toCreate: 0, toUpdate: 0 }
    }
  },

  async importClients(clients: any[]) {
    // Helper to get value ignoring case of header
    const getValue = (row: any, key: string) => {
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase() === key.toLowerCase(),
      )
      return foundKey ? row[foundKey] : undefined
    }

    const mappedClients: ClientInsert[] = clients
      .map((c) => {
        return {
          CODIGO: Number(getValue(c, 'CODIGO')),
          'NOME CLIENTE': getValue(c, 'NOME CLIENTE') || '',
          'RAZÃO SOCIAL': getValue(c, 'RAZÃO SOCIAL') || '',
          CNPJ: getValue(c, 'CNPJ') || '',
          IE: getValue(c, 'IE') || '',
          'TIPO DE CLIENTE': getValue(c, 'TIPO DE CLIENTE') || 'ATIVO',
          TIPO: getValue(c, 'TIPO') || '',
          MUNICÍPIO: getValue(c, 'MUNICÍPIO') || '',
          BAIRRO: getValue(c, 'BAIRRO') || '',
          ENDEREÇO: getValue(c, 'ENDEREÇO') || '',
          'CEP OFICIO': getValue(c, 'CEP OFICIO') || '',
          'FONE 1': getValue(c, 'FONE 1') || '',
          'FONE 2': getValue(c, 'FONE 2') || '',
          'CONTATO 1': getValue(c, 'CONTATO 1') || '',
          'CONTATO 2': getValue(c, 'CONTATO 2') || '',
          EMAIL: getValue(c, 'EMAIL') || '',
          email_cobranca: getValue(c, 'email_cobranca') || '',
          telefone_cobranca: getValue(c, 'telefone_cobranca') || '',
          GRUPO: getValue(c, 'GRUPO') || '',
          'GRUPO ROTA': getValue(c, 'GRUPO ROTA') || '',
          'FORMA DE PAGAMENTO': getValue(c, 'FORMA DE PAGAMENTO') || '',
          'NOTA FISCAL': getValue(c, 'NOTA FISCAL') || '',
          EXPOSITOR: getValue(c, 'EXPOSITOR') || '',
          'OBSERVAÇÃO FIXA': getValue(c, 'OBSERVAÇÃO FIXA') || '',
          Desconto: getValue(c, 'Desconto') || '0%',
          'DESCONTO BRINQUEDO': getValue(c, 'DESCONTO BRINQUEDO') || '',
          'DESCONTO ACESSORIO': getValue(c, 'DESCONTO ACESSORIO') || '',
          'DESCONTO ACESSORIO CELULAR':
            getValue(c, 'DESCONTO ACESSORIO CELULAR') || '',
          'DESCONTO OUTROS': getValue(c, 'DESCONTO OUTROS') || '',
          'ALTERAÇÃO CLIENTE': getValue(c, 'ALTERAÇÃO CLIENTE') || '',
          situacao: getValue(c, 'situacao') || 'ATIVO',
        } as ClientInsert
      })
      .filter((c) => c.CODIGO && !isNaN(c.CODIGO))

    if (mappedClients.length === 0) {
      return {
        success: false,
        count: 0,
        errors: 0,
        message: 'Nenhum cliente válido encontrado.',
      }
    }

    const chunkSize = 100
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < mappedClients.length; i += chunkSize) {
      const chunk = mappedClients.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('CLIENTES')
        .upsert(chunk, { onConflict: 'CODIGO' })

      if (error) {
        console.error('Import error chunk', i, error)
        errorCount += chunk.length
      } else {
        successCount += chunk.length
      }
    }

    return {
      success: errorCount === 0,
      count: successCount,
      errors: errorCount,
    }
  },

  async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lon: number } | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const { data, error } = await supabase.functions.invoke(
        'geocode-address',
        {
          body: { address },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      )

      if (error) {
        console.warn('Edge function geocode-address returned an error:', error)
        
        // Throw an error if it's a 5xx or server error to trigger the catch block toast in UI
        if (error.status && error.status >= 500) {
            throw new Error('Serviço de geolocalização indisponível')
        }
        // 404 Address Not Found will return null and trigger "Não encontrado" toast
        return null
      }

      if (data && data.lat != null && data.lon != null) {
        return { lat: data.lat, lon: data.lon }
      }
      return null
    } catch (error) {
      console.warn('Error geocoding address:', error)
      throw error // Re-throw to allow UI to catch and show generic error toast
    }
  },
}
