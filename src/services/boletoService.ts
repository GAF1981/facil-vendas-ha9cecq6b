import { supabase } from '@/lib/supabase/client'
import { Boleto, BoletoInsert, BoletoUpdate } from '@/types/boleto'
import { parseCurrency } from '@/lib/formatters'
import { parseDateSafe, getBrazilDateString } from '@/lib/dateUtils'
import { format } from 'date-fns'

export const boletoService = {
  async getAll(): Promise<Boleto[]> {
    const { data, error } = await supabase
      .from('boletos')
      .select('*')
      .order('vencimento', { ascending: false })

    if (error) throw error
    return data as Boleto[]
  },

  async create(boleto: BoletoInsert): Promise<Boleto> {
    const { data, error } = await supabase
      .from('boletos')
      .insert(boleto as any)
      .select()
      .single()

    if (error) throw error
    return data as Boleto
  },

  async update(id: number, boleto: BoletoUpdate): Promise<Boleto> {
    const { data, error } = await supabase
      .from('boletos')
      .update(boleto as any)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Boleto
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from('boletos').delete().eq('id', id)
    if (error) throw error
  },

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

          const firstLine = lines[0]
          const delimiter = firstLine.includes(';') ? ';' : ','

          const headers = lines[0]
            .split(delimiter)
            .map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())

          const result: any[] = []

          for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i]
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

  async importBoletos(parsedData: any[]) {
    const findKey = (row: any, options: string[]) => {
      const keys = Object.keys(row)
      for (const opt of options) {
        const found = keys.find((k) => k === opt || k.includes(opt))
        if (found) return found
      }
      return null
    }

    const mappedBoletos: BoletoInsert[] = []

    for (const row of parsedData) {
      const clientNameKey = findKey(row, ['cliente', 'nome'])
      const clientCodeKey = findKey(row, ['código do cliente', 'codigo'])
      const statusKey = findKey(row, ['status'])
      const vencimentoKey = findKey(row, ['vencimento', 'data'])
      const valorKey = findKey(row, ['valor'])

      if (clientNameKey && clientCodeKey && vencimentoKey && valorKey) {
        const codigo = parseInt(row[clientCodeKey])
        if (isNaN(codigo)) continue

        const dateObj = parseDateSafe(row[vencimentoKey])
        if (!dateObj) continue

        mappedBoletos.push({
          cliente_nome: row[clientNameKey],
          cliente_codigo: codigo,
          status: row[statusKey] || 'A Receber',
          vencimento: format(dateObj, 'yyyy-MM-dd'),
          valor: parseCurrency(row[valorKey]),
        })
      }
    }

    if (mappedBoletos.length === 0) {
      return { success: false, count: 0, errors: 0 }
    }

    let successCount = 0
    let errorCount = 0

    const chunkSize = 100
    for (let i = 0; i < mappedBoletos.length; i += chunkSize) {
      const chunk = mappedBoletos.slice(i, i + chunkSize)
      const { error } = await supabase.from('boletos').insert(chunk as any)

      if (error) {
        console.error('Import error chunk', error)
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

  generateCSV(boletos: BoletoWithConferido[]) {
    const headers = [
      'Cliente',
      'Código do Cliente',
      'Status',
      'Vencimento',
      'Valor',
      'Pedido ID',
      'Boleto Conferido',
    ]

    const rows = boletos.map((b) => {
      return [
        `"${b.cliente_nome}"`,
        b.cliente_codigo,
        `"${b.status}"`,
        format(parseDateSafe(b.vencimento) || new Date(), 'dd/MM/yyyy'),
        b.valor.toString().replace('.', ','),
        b.pedido_id || '',
        b.conferido,
      ].join(';')
    })

    const csvContent = [headers.join(';'), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `boletos_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  },
}
