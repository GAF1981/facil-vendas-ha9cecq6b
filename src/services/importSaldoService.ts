import { supabase } from '@/lib/supabase/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { format, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

// Enhanced Synonyms for flexible matching including common typos
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
    'CODIGO DO CLIENE',
    'CÓDIGO DO CLIENE',
    'COD CLIENE',
    'CODIGO CLIENE',
    'COD. CLIENE',
  ],
  productCode: [
    'CODIGO DO PRODUTO',
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
  date: [
    'DATA DO ACERTO',
    'DATA ACERTO',
    'DATA',
    'DT ACERTO',
    'DATA IMPORTACAO',
    'DATA SALDO',
    'DT. ACERTO',
  ],
}

// Robust normalization: trim, uppercase, remove accents, collapse spaces
const normalizeHeader = (header: string) => {
  if (!header) return ''
  return header
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}

const parseDateStr = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const cleanStr = dateStr.trim()

  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'yyyy-MM-dd',
    'dd-MM-yyyy',
    'd-M-yyyy',
  ]

  for (const fmt of formats) {
    const d = parse(cleanStr, fmt, new Date(), { locale: ptBR })
    if (isValid(d)) return d
  }

  // Try standard JS date parser as fallback (e.g. for ISO strings)
  const d = new Date(cleanStr)
  if (isValid(d)) return d

  return null
}

// Helper function to fetch all rows from a table (handling pagination/limit)
async function fetchAllRows<T>(table: string, select: string): Promise<T[]> {
  let allData: T[] = []
  let from = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + limit - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allData = [...allData, ...data] as T[]

    if (data.length < limit) break
    from += limit
  }

  return allData
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

          const firstLine = lines[0]
          const delimiter = firstLine.includes(';') ? ';' : ','

          const headers = firstLine
            .split(delimiter)
            .map((h) => h.trim().replace(/^"|"$/g, ''))

          const result: CsvRow[] = []

          for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i]
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
    dateCol: string | null
  } {
    if (!sampleRow)
      return { clientCol: null, productCol: null, qtyCol: null, dateCol: null }

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
      dateCol: findColumn(HEADER_SYNONYMS.date),
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
    const { clientCol, productCol, qtyCol, dateCol } = this.identifyColumns(
      csvData[0],
    )

    if (!clientCol) {
      result.errors.push(
        `Coluna de CLIENTE não encontrada. (Esperado: ${HEADER_SYNONYMS.clientCode.slice(0, 3).join(', ')}...)`,
      )
    }
    if (!productCol) {
      result.errors.push(
        `Coluna de PRODUTO não encontrada. (Esperado: ${HEADER_SYNONYMS.productCode.slice(0, 3).join(', ')}...)`,
      )
    }
    if (!qtyCol) {
      result.errors.push(
        `Coluna de QUANTIDADE não encontrada. (Esperado: ${HEADER_SYNONYMS.quantity.slice(0, 3).join(', ')}...)`,
      )
    }

    if (!clientCol || !productCol || !qtyCol) {
      return result
    }

    // 2. Fetch Reference Data
    let clients: any[] = []
    try {
      clients = await fetchAllRows('CLIENTES', 'CODIGO, "NOME CLIENTE"')
    } catch (e: any) {
      throw new Error(`Falha ao carregar lista de clientes: ${e.message}`)
    }

    const clientMap = new Map<number, string>()
    clients.forEach((c) => clientMap.set(c.CODIGO, c['NOME CLIENTE']))

    let products: any[] = []
    try {
      products = await fetchAllRows(
        'PRODUTOS',
        'ID, codigo_interno, PRODUTO, CODIGO',
      )
    } catch (e: any) {
      throw new Error(`Falha ao carregar lista de produtos: ${e.message}`)
    }

    // Maps for Product Lookup
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
        mapCodigoInterno.set(String(p.codigo_interno).trim(), info)
      }
    })

    // 3. Validate and Group Data
    const validGroups = new Map<
      number,
      {
        clientName: string
        items: {
          productId: number
          productName: string
          quantity: number
          legacyCode: number | null
          date: Date
        }[]
      }
    >()

    let rowIndex = 1
    const defaultDate = new Date()

    for (const row of csvData) {
      rowIndex++

      const clientValRaw = row[clientCol]?.trim() || ''
      const productValRaw = row[productCol]?.trim() || ''
      const qtyValRaw = row[qtyCol]?.trim() || ''
      const dateValRaw = dateCol ? row[dateCol]?.trim() : ''

      if (!clientValRaw || !productValRaw || !qtyValRaw) {
        if (clientValRaw || productValRaw || qtyValRaw) {
          result.failureCount++
          result.errors.push(`Linha ${rowIndex}: Dados incompletos.`)
        }
        continue
      }

      // Date Parsing & Validation
      let finalDate = defaultDate
      if (dateCol) {
        if (!dateValRaw) {
          result.failureCount++
          result.errors.push(
            `Linha ${rowIndex}: Data do Acerto é obrigatória (coluna identificada mas vazia).`,
          )
          continue
        }
        const parsed = parseDateStr(dateValRaw)
        if (!parsed) {
          result.failureCount++
          result.errors.push(
            `Linha ${rowIndex}: Formato de data inválido '${dateValRaw}'. Use DD/MM/AAAA.`,
          )
          continue
        }
        finalDate = parsed
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

      // Product Lookup
      let productInfo: ProductInfo | undefined

      productInfo = mapCodigoInterno.get(productValRaw)

      if (!productInfo) {
        const numericCode = parseInt(productValRaw)
        if (!isNaN(numericCode)) {
          productInfo = mapCodigoLegacy.get(numericCode)
        }
      }

      if (!productInfo) {
        const numericId = parseInt(productValRaw)
        if (!isNaN(numericId)) {
          productInfo = mapId.get(numericId)
        }
      }

      if (!productInfo) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Produto com identificador '${productValRaw}' não encontrado.`,
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
        date: finalDate,
      })
    }

    // 4. Batch Execution
    const groups = Array.from(validGroups.entries())
    const CLIENT_BATCH_SIZE = 10

    for (let i = 0; i < groups.length; i += CLIENT_BATCH_SIZE) {
      const batch = groups.slice(i, i + CLIENT_BATCH_SIZE)

      await Promise.all(
        batch.map(async ([clientCode, groupData]) => {
          try {
            const orderId = await bancoDeDadosService.reserveNextOrderNumber()
            const ITEM_BATCH_SIZE = 500

            for (let j = 0; j < groupData.items.length; j += ITEM_BATCH_SIZE) {
              const chunk = groupData.items.slice(j, j + ITEM_BATCH_SIZE)

              const bancoInserts = chunk.map((item) => {
                const dateStr = format(item.date, 'yyyy-MM-dd')
                // For simplicity in imports, assume 12:00 PM if time is not relevant, or keep it consistent
                // If using date-fns parse, time is 00:00:00 usually.
                // We'll use 12:00:00 to be safe with timezone shifts or just existing time
                const timeStr = '12:00:00'
                const isoStr = item.date.toISOString()

                return {
                  'NÚMERO DO PEDIDO': orderId,
                  'CÓDIGO DO CLIENTE': clientCode,
                  CLIENTE: groupData.clientName,
                  'COD. PRODUTO': item.legacyCode,
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
                }
              })

              const ajusteInserts = chunk.map((item) => {
                const isoStr = item.date.toISOString()
                return {
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
                }
              })

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
