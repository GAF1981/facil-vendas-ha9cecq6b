import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ImportDividasModal({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const parseCSV = (text: string) => {
    let cleanedText = text.replace(/^\uFEFF/, '').trim()
    const lines = cleanedText.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (lines.length < 2)
      throw new Error('Arquivo vazio ou sem dados suficientes.')

    const headerLine = lines[0]
    let delimiter: string | RegExp = ','
    if (headerLine.includes('\t')) delimiter = '\t'
    else if (headerLine.includes(';')) delimiter = ';'
    else if (/\s{2,}/.test(headerLine)) delimiter = /\s{2,}/

    const getCols = (line: string) => {
      if (typeof delimiter === 'string') {
        const cols = []
        let inQuotes = false
        let curr = ''
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') inQuotes = !inQuotes
          else if (char === delimiter && !inQuotes) {
            cols.push(curr)
            curr = ''
          } else {
            curr += char
          }
        }
        cols.push(curr)
        return cols.map((c) => c.trim().replace(/^"|"$/g, ''))
      } else {
        return line.split(delimiter).map((c) => c.trim())
      }
    }

    const headers = getCols(headerLine)
    let clientIdx = -1,
      valueIdx = -1,
      acertoIdx = -1,
      vencIdx = -1,
      formaIdx = -1,
      motivoIdx = -1

    headers.forEach((h, i) => {
      const norm = h
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
      if (
        norm.includes('codigocliente') ||
        norm === 'codigo' ||
        norm === 'cliente' ||
        norm === 'codcliente' ||
        norm === 'id'
      )
        clientIdx = i
      else if (
        norm.includes('valor') ||
        norm.includes('parcela') ||
        norm.includes('preco')
      )
        valueIdx = i
      else if (
        norm.includes('dataacerto') ||
        norm.includes('acerto') ||
        norm === 'data' ||
        norm.includes('emissao')
      )
        acertoIdx = i
      else if (
        norm.includes('vencimento') ||
        norm === 'venc' ||
        norm.includes('datavenc')
      )
        vencIdx = i
      else if (
        norm.includes('forma') ||
        norm.includes('pagamento') ||
        norm === 'tipo'
      )
        formaIdx = i
      else if (
        norm.includes('motivo') ||
        norm.includes('obs') ||
        norm.includes('descricao')
      )
        motivoIdx = i
    })

    if (clientIdx === -1 || valueIdx === -1) {
      throw new Error(
        'Não foi possível encontrar as colunas obrigatórias ("Código Cliente" e "Valor Parcela"). Verifique os cabeçalhos do seu arquivo.',
      )
    }

    const parsedData = []
    for (let i = 1; i < lines.length; i++) {
      const cols = getCols(lines[i])
      if (cols.length < 2) continue

      const cliente_id = parseInt(cols[clientIdx], 10)
      let valorStr = cols[valueIdx] || '0'
      valorStr = valorStr.replace(/[^0-9.,-]/g, '')
      if (valorStr.includes(',') && valorStr.includes('.'))
        valorStr = valorStr.replace(/\./g, '').replace(',', '.')
      else if (valorStr.includes(',')) valorStr = valorStr.replace(',', '.')
      const valor_parcela = parseFloat(valorStr)

      if (isNaN(cliente_id) || isNaN(valor_parcela)) continue

      const parseDateStr = (dStr: string) => {
        if (!dStr) return null
        if (dStr.includes('/')) {
          const parts = dStr.split('/')
          if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        if (dStr.match(/^\d{4}-\d{2}-\d{2}/)) return dStr.substring(0, 10)
        return null
      }

      parsedData.push({
        cliente_id,
        valor_parcela,
        data_acerto:
          (acertoIdx !== -1 ? parseDateStr(cols[acertoIdx]) : null) ||
          new Date().toISOString().substring(0, 10),
        vencimento:
          (vencIdx !== -1 ? parseDateStr(cols[vencIdx]) : null) ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .substring(0, 10),
        forma_pagamento:
          formaIdx !== -1 && cols[formaIdx] ? cols[formaIdx] : 'Dinheiro',
        motivo: motivoIdx !== -1 ? cols[motivoIdx] : 'Importação via Planilha',
        valor_pago: 0,
        cobranca_seq: 1,
      })
    }
    return parsedData
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccessCount(null)

    try {
      const text = await file.text()
      const parsedData = parseCSV(text)

      if (parsedData.length === 0)
        throw new Error('Nenhum dado válido encontrado no arquivo.')

      const { data: maxSeqs } = await supabase
        .from('dividas_manuais')
        .select('cliente_id, cobranca_seq')
      const seqMap = new Map<number, number>()
      if (maxSeqs) {
        maxSeqs.forEach((row: any) => {
          const current = seqMap.get(row.cliente_id) || 0
          if (row.cobranca_seq > current)
            seqMap.set(row.cliente_id, row.cobranca_seq)
        })
      }

      parsedData.forEach((row) => {
        const currentSeq = seqMap.get(row.cliente_id) || 0
        row.cobranca_seq = currentSeq + 1
        seqMap.set(row.cliente_id, row.cobranca_seq)
      })

      const { error: insertError } = await supabase
        .from('dividas_manuais')
        .insert(parsedData)
      if (insertError) throw insertError

      setSuccessCount(parsedData.length)
      toast({
        title: 'Sucesso',
        description: `${parsedData.length} dívidas importadas com sucesso.`,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o arquivo.')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Débitos
          </DialogTitle>
          <DialogDescription>
            Faça o upload da sua planilha para registrar dívidas em lote. O
            sistema detecta automaticamente o formato e ignora caracteres
            ocultos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Importação</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successCount !== null && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle>Importação Concluída</AlertTitle>
              <AlertDescription>
                {successCount} registros importados com sucesso.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={loading}
            />
            <FileText className="h-10 w-10 text-muted-foreground mb-4" />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full max-w-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Selecionar Arquivo
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Formatos: CSV, TXT. Colunas: Código Cliente, Valor Parcela.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
