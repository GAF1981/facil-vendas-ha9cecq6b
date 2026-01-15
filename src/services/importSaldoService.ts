import { supabase } from '@/lib/supabase/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { clientsService } from '@/services/clientsService'
import { productsService } from '@/services/productsService'
import { format } from 'date-fns'

export interface ImportResult {
  successCount: number
  failureCount: number
  errors: string[]
}

export interface CsvRow {
  codigo_cliente: string
  codigo_produto: string
  quantidade: string
}

export const importSaldoService = {
  async parseCSV(file: File): Promise<CsvRow[]> {
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

        // Detect delimiter (comma or semicolon)
        const firstLine = lines[0]
        const delimiter = firstLine.includes(';') ? ';' : ','

        const headers = lines[0]
          .split(delimiter)
          .map((h) => h.trim().toLowerCase().replace(/"/g, ''))

        const result: CsvRow[] = []

        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i]
          // Handle quotes if necessary, but simple split for now as per constraints
          const values = currentLine
            .split(delimiter)
            .map((v) => v.trim().replace(/"/g, ''))

          if (values.length === headers.length) {
            const row: any = {}
            headers.forEach((header, index) => {
              row[header] = values[index]
            })
            result.push(row as CsvRow)
          }
        }
        resolve(result)
      }
      reader.onerror = (error) => reject(error)
      reader.readAsText(file)
    })
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

    if (csvData.length === 0) {
      result.errors.push('O arquivo CSV está vazio ou inválido.')
      return result
    }

    // 1. Fetch Reference Data for Validation
    // Fetch all clients (Lightweight)
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('CODIGO, "NOME CLIENTE"')

    if (clientsError || !clients) {
      throw new Error('Falha ao carregar lista de clientes para validação.')
    }

    const clientMap = new Map<number, string>()
    clients.forEach((c) => clientMap.set(c.CODIGO, c['NOME CLIENTE']))

    // Fetch all products (Lightweight)
    const { data: products, error: productsError } = await supabase
      .from('PRODUTOS')
      .select('ID, CODIGO, PRODUTO')

    if (productsError || !products) {
      throw new Error('Falha ao carregar lista de produtos para validação.')
    }

    const productMap = new Map<number, { id: number; name: string }>()
    products.forEach((p) => {
      if (p.CODIGO)
        productMap.set(p.CODIGO, { id: p.ID, name: p.PRODUTO || '' })
    })

    // 2. Validate and Group Data
    // We group by Client to create efficient transactions (Acertos)
    const validGroups = new Map<
      number,
      {
        clientName: string
        items: {
          productCode: number
          productId: number
          productName: string
          quantity: number
        }[]
      }
    >()

    let rowIndex = 1 // 1-based index for user feedback (skipping header)

    for (const row of csvData) {
      rowIndex++
      const clientCode = parseInt(
        row['código do cliente'] ||
          row['codigo do cliente'] ||
          row['codigo_cliente'] ||
          '0',
      )
      const productCode = parseInt(
        row['código do produto'] ||
          row['codigo do produto'] ||
          row['codigo_produto'] ||
          '0',
      )
      const quantity = parseFloat((row['quantidade'] || '0').replace(',', '.'))

      // Validation
      if (!clientCode || !productCode) {
        result.failureCount++
        result.errors.push(`Linha ${rowIndex}: Códigos inválidos ou faltando.`)
        continue
      }

      if (!clientMap.has(clientCode)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Cliente código ${clientCode} não encontrado.`,
        )
        continue
      }

      if (!productMap.has(productCode)) {
        result.failureCount++
        result.errors.push(
          `Linha ${rowIndex}: Produto código ${productCode} não encontrado.`,
        )
        continue
      }

      if (isNaN(quantity)) {
        result.failureCount++
        result.errors.push(`Linha ${rowIndex}: Quantidade inválida.`)
        continue
      }

      // Add to valid groups
      if (!validGroups.has(clientCode)) {
        validGroups.set(clientCode, {
          clientName: clientMap.get(clientCode)!,
          items: [],
        })
      }

      validGroups.get(clientCode)!.items.push({
        productCode,
        productId: productMap.get(productCode)!.id,
        productName: productMap.get(productCode)!.name,
        quantity,
      })
    }

    // 3. Execute Insertions per Client Group
    const today = new Date()
    const dateStr = format(today, 'yyyy-MM-dd')
    const timeStr = format(today, 'HH:mm:ss')
    const isoStr = today.toISOString()

    for (const [clientCode, groupData] of validGroups) {
      try {
        // Reserve Order Number
        const orderId = await bancoDeDadosService.reserveNextOrderNumber()

        // Prepare BANCO_DE_DADOS inserts
        const bancoInserts = groupData.items.map((item) => ({
          'NÚMERO DO PEDIDO': orderId,
          'CÓDIGO DO CLIENTE': clientCode,
          CLIENTE: groupData.clientName,
          'COD. PRODUTO': item.productCode,
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
          FORMA: 'IMPORTAÇÃO',
          CONTAGEM: 0,
          'NOVAS CONSIGNAÇÕES': '0',
          RECOLHIDO: '0',
        }))

        // Prepare AJUSTE_SALDO_INICIAL inserts
        const ajusteInserts = groupData.items.map((item) => ({
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

        // Execute Batch Inserts
        const { error: bancoError } = await supabase
          .from('BANCO_DE_DADOS')
          .insert(bancoInserts)
        if (bancoError) throw bancoError

        const { error: ajusteError } = await supabase
          .from('AJUSTE_SALDO_INICIAL')
          .insert(ajusteInserts)
        if (ajusteError) throw ajusteError

        result.successCount += groupData.items.length
      } catch (error: any) {
        console.error(`Error importing for client ${clientCode}:`, error)
        result.failureCount += groupData.items.length
        result.errors.push(
          `Erro ao salvar dados do cliente ${clientCode}: ${error.message}`,
        )
      }
    }

    return result
  },
}
