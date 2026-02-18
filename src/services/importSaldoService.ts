import { supabase } from '@/lib/supabase/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { format } from 'date-fns'

export interface ImportResult {
  successCount: number
  failureCount: number
  errors: string[]
}

export type CsvRow = Record<string, string>

interface ProductInfo {
  id: number
  codigo_interno: string
  codigo_legacy: number | null
  name: string
}

// Enhanced Synonyms for flexible matching
const HEADER_SYNONYMS = {
  clientCode: [
    'CODIGO DO CLIENTE',
    'COD. CLIENTE',
    'CODIGO CLIENTE',
    'ID CLIENTE',
    'CLIENTE ID',
    'COD CLIENTE',
    'CLIENTE',
    'CODIGO',
    'CÓDIGO',
    'CÓDIGO DO CLIENTE',
  ],
  productCode: [
    'CODIGO DO PRODUTO', // Requested explicit support
    'CODIGO INTERNO',
    'COD. INTERNO',
    'CÓD. INTERNO',
    'CODIGO PRODUTO',
    'COD. PRODUTO',
    'COD PRODUTO',
    'PRODUTO CODIGO',
    'PRODUTO',
    'ID PRODUTO',
    'ID',
    'CÓDIGO INTERNO',
    'CÓDIGO PRODUTO',
    'CÓDIGO DO PRODUTO',
  ],
  quantity: ['SALDO INICIAL', 'QUANTIDADE', 'QTD', 'QTDE', 'CONTAGEM', 'SALDO'],
}

const normalizeHeader = (header: string) => {
  if (!header) return ''
  return header
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
}

export const importSaldoService = {
  async parseCSV(file: File): Promise<CsvRow[]> {
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

          // Detect delimiter (comma or semicolon)
          const firstLine = lines[0]
          const delimiter = firstLine.includes(';') ? ';' : ','

          // Parse Headers
          const headers = firstLine
            .split(delimiter)
            .map((h) => h.trim().replace(/^"|"$/g, ''))

          const result: CsvRow[] = []

          // Parse Rows
          for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i]
            // Regex to handle delimiters inside quotes
            const regex = new RegExp(
              `\\s*${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)\\s*`,
            )
            const values = currentLine
              .split(regex)
              .map((v) => v.trim().replace(/^"|"$/g, ''))

            if (values.length > 0) {
              const row: CsvRow = {}
              let hasData = false
              headers.forEach((header, index) => {
                // Ensure we don't access out of bounds and handle empty headers safely
                const key = header || `Column_${index}`
                const val = values[index] || ''
                row[key] = val
                if (val) hasData = true
              })
              if (hasData) {
                result.push(row)
              }
            }
          }
          resolve(result)
        } catch (err) {
          console.error('CSV Parse Error:', err)
          reject(
            new Error(
              'Falha ao processar arquivo CSV. Verifique a formatação.',
            ),
          )
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader Error:', error)
        reject(new Error('Erro ao ler o arquivo.'))
      }
      reader.readAsText(file)
    })
  },

  identifyColumns(sampleRow: CsvRow): {
    clientCol: string | null
    productCol: string | null
    qtyCol: string | null
  } {
    if (!sampleRow) return { clientCol: null, productCol: null, qtyCol: null }

    const headers = Object.keys(sampleRow)
    const normalizedHeaders = headers.map((h) => ({
      original: h,
      normalized: normalizeHeader(h),
    }))

    const findColumn = (synonyms: string[]) => {
      const normalizedSynonyms = synonyms.map(normalizeHeader)
      const match = normalizedHeaders.find((h) =>
        normalizedSynonyms.includes(h.normalized),
      )
      return match ? match.original : null
    }

    return {
      clientCol: findColumn(HEADER_SYNONYMS.clientCode),
      productCol: findColumn(HEADER_SYNONYMS.productCode),
      qtyCol: findColumn(HEADER_SYNONYMS.quantity),
    }
  },

  async processImport(
    csvData: CsvRow[],
    employeeId: number,
    employeeName: string,
  ): Promise<ImportResult> {
    const result: ImportResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
    }

    if (!csvData || csvData.length === 0) {
      result.errors.push('O arquivo CSV está vazio ou inválido.')
      return result
    }

    // 1. Identify Columns
    const { clientCol, productCol, qtyCol } = this.identifyColumns(csvData[0])

    if (!clientCol) {
      result.errors.push(
        `Coluna de CLIENTE não encontrada. (Esperado: ${HEADER_SYNONYMS.clientCode.join(', ')})`,
      )
    }
    if (!productCol) {
      result.errors.push(
        `Coluna de PRODUTO não encontrada. (Esperado: ${HEADER_SYNONYMS.productCode.join(', ')})`,
      )
    }
    if (!qtyCol) {
      result.errors.push(
        `Coluna de QUANTIDADE não encontrada. (Esperado: ${HEADER_SYNONYMS.quantity.join(', ')})`,
      )
    }

    if (!clientCol || !productCol || !qtyCol) {
      return result
    }

    // 2. Fetch Reference Data
    // We fetch ALL needed data to memory for robustness and speed
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('CODIGO, "NOME CLIENTE"')

    if (clientsError || !clients) {
      throw new Error('Falha ao carregar lista de clientes para validação.')
    }

    const clientMap = new Map<number, string>()
    clients.forEach((c) => clientMap.set(c.CODIGO, c['NOME CLIENTE']))

    const { data: products, error: productsError } = await supabase
      .from('PRODUTOS')
      .select('ID, codigo_interno, PRODUTO, CODIGO')

    if (productsError || !products) {
      throw new Error('Falha ao carregar lista de produtos para validação.')
    }

    // Maps for Product Lookup with Priority: codigo_interno > CODIGO > ID
    const mapCodigoInterno = new Map<string, ProductInfo>()
    const mapCodigoLegacy = new Map<number, ProductInfo>()
    const mapId = new Map<number, ProductInfo>()

    products.forEach((p) => {
      const info: ProductInfo = {
        id: p.ID,
        codigo_interno: p.codigo_interno || '',
        codigo_legacy: p.CODIGO,
        name: p.PRODUTO || '',
      }

      mapId.set(p.ID, info)
      if (p.CODIGO) mapCodigoLegacy.set(p.CODIGO, info)
      if (p.codigo_interno) {
        // Normalize internal code for map keys: trim and ensure string
        mapCodigoInterno.set(String(p.codigo_interno).trim(), info)
      }
    })

    // 3. Validate and Group Data
    // Grouping by Client allows for better transaction handling (Order Number Reservation)
    const validGroups = new Map<
      number,
      {
        clientName: string
        items: {
          productId: number
          productName: string
          quantity: number
          legacyCode: number | null
        }[]
      }
    >()

    let rowIndex = 1 // 1-based index for user display (skipping header)

    for (const row of csvData) {
      rowIndex++

      const clientValRaw = row[clientCol]?.trim() || ''
      const productValRaw = row[productCol]?.trim() || ''
      const qtyValRaw = row[qtyCol]?.trim() || ''

      if (!clientValRaw || !productValRaw || !qtyValRaw) {
        // Only count as failure if at least one field is present but others missing
        if (clientValRaw || productValRaw || qtyValRaw) {
          result.failureCount++
          result.errors.push(`Linha ${rowIndex}: Dados incompletos.`)
        }
        continue
      }

      // Client Lookup
      const clientCode = parseInt(clientValRaw)
      if (isNaN(clientCode) || !clientMap.has(clientCode)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Cliente com código '${clientValRaw}' não encontrado.`,
        )
        continue
      }
      const clientName = clientMap.get(clientCode)!

      // Product Lookup Priority
      let productInfo: ProductInfo | undefined

      // 1. Try codigo_interno (Exact String Match)
      // The requirement asks to use "código do produto" column value for lookup against `codigo_interno`.
      productInfo = mapCodigoInterno.get(productValRaw)

      // 2. Try CODIGO (Legacy Number)
      if (!productInfo) {
        const numericCode = parseInt(productValRaw)
        if (!isNaN(numericCode)) {
          productInfo = mapCodigoLegacy.get(numericCode)
        }
      }

      // 3. Try ID (PK Number)
      if (!productInfo) {
        const numericId = parseInt(productValRaw)
        if (!isNaN(numericId)) {
          productInfo = mapId.get(numericId)
        }
      }

      if (!productInfo) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Produto com identificador '${productValRaw}' não encontrado (Tentado: Código Interno, Código Antigo, ID).`,
        )
        continue
      }

      // Quantity Parsing
      const quantity = parseFloat(qtyValRaw.replace(',', '.'))
      if (isNaN(quantity)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Quantidade inválida '${qtyValRaw}'.`,
        )
        continue
      }

      // Add to Group
      if (!validGroups.has(clientCode)) {
        validGroups.set(clientCode, {
          clientName,
          items: [],
        })
      }
      validGroups.get(clientCode)!.items.push({
        productId: productInfo.id,
        productName: productInfo.name,
        quantity,
        legacyCode: productInfo.codigo_legacy,
      })
    }

    // 4. Batch Execution
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')
    const timeStr = format(today, 'HH:mm:ss')
    const isoStr = today.toISOString()

    const groups = Array.from(validGroups.entries())

    // Process clients in chunks to avoid overwhelming the database connection or exceeding limits
    const CLIENT_BATCH_SIZE = 10 // Process 10 clients concurrently

    for (let i = 0; i < groups.length; i += CLIENT_BATCH_SIZE) {
      const batch = groups.slice(i, i + CLIENT_BATCH_SIZE)

      await Promise.all(
        batch.map(async ([clientCode, groupData]) => {
          try {
            // Reserve One Order ID per Client Group for "Saldo Inicial" batch
            const orderId = await bancoDeDadosService.reserveNextOrderNumber()

            // If items are too many for one client, split inserts
            const ITEM_BATCH_SIZE = 500
            for (let j = 0; j < groupData.items.length; j += ITEM_BATCH_SIZE) {
              const chunk = groupData.items.slice(j, j + ITEM_BATCH_SIZE)

              const bancoInserts = chunk.map((item) => ({
                'NÚMERO DO PEDIDO': orderId,
                'CÓDIGO DO CLIENTE': clientCode,
                CLIENTE: groupData.clientName,
                'COD. PRODUTO': item.legacyCode, // Database often uses legacy code for historical reasons, or we could use ID
                MERCADORIA: item.productName,
                'SALDO FINAL': item.quantity,
                'SALDO INICIAL': 0,
                'QUANTIDADE VENDIDA': '0',
                TIPO: 'SALDO INICIAL',
                'DATA DO ACERTO': dateStr,
                'HORA DO ACERTO': timeStr,
                'DATA E HORA': isoStr,
                'CODIGO FUNCIONARIO': employeeId,
                FUNCIONÁRIO: employeeName,
                'VALOR VENDIDO': '0',
                'PREÇO VENDIDO': '0',
                'VALOR VENDA PRODUTO': '0',
                FORMA: 'IMPORTAÇÃO CSV',
                CONTAGEM: 0,
                'NOVAS CONSIGNAÇÕES': '0',
                RECOLHIDO: '0',
              }))

              const ajusteInserts = chunk.map((item) => ({
                cliente_id: clientCode,
                cliente_nome: groupData.clientName,
                produto_id: item.productId,
                quantidade_alterada: item.quantity,
                saldo_anterior: 0,
                saldo_novo: item.quantity,
                vendedor_id: employeeId,
                vendedor_nome: employeeName,
                data_acerto: isoStr,
                numero_pedido: orderId,
              }))

              const { error: err1 } = await supabase
                .from('BANCO_DE_DADOS')
                .insert(bancoInserts)
              if (err1) throw err1

              const { error: err2 } = await supabase
                .from('AJUSTE_SALDO_INICIAL')
                .insert(ajusteInserts)
              if (err2) throw err2
            }

            result.successCount += groupData.items.length
          } catch (error: any) {
            console.error(`Erro importação cliente ${clientCode}:`, error)
            result.failureCount += groupData.items.length
            result.errors.push(
              `Erro ao salvar dados do cliente ${clientCode}: ${error.message}`,
            )
          }
        }),
      )
    }

    return result
  },
}
