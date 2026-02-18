import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { employeesService } from '@/services/employeesService'
import { rotaService } from '@/services/rotaService'
import { Rota } from '@/types/rota'

interface RotaImportDialogProps {
  activeRota: Rota | null
  onSuccess?: () => void
}

export function RotaImportDialog({
  activeRota,
  onSuccess,
}: RotaImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [previewStats, setPreviewStats] = useState<{
    totalRows: number
    matched: number
    unmatchedSellers: number
  } | null>(null)
  const [assignments, setAssignments] = useState<
    { clientId: number; sellerId: number }[]
  >([])
  const [resultCount, setResultCount] = useState(0)

  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setFile(null)
    setAssignments([])
    setPreviewStats(null)

    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV.',
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }

      setFile(selectedFile)
      await analyzeFile(selectedFile)
    }
  }

  const analyzeFile = async (file: File) => {
    setAnalyzing(true)
    try {
      // 1. Fetch Employees for matching
      const { data: employees } = await employeesService.getEmployees(1, 1000)
      const employeeMap = new Map<string, number>()

      // Normalize helper
      const normalize = (str: string) =>
        str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()

      employees.forEach((emp) => {
        employeeMap.set(normalize(emp.nome_completo), emp.id)
      })

      // 2. Read CSV
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')

      if (lines.length < 2) {
        throw new Error('Arquivo vazio ou sem cabeçalho.')
      }

      // 3. Parse Headers
      const delimiter = lines[0].includes(';') ? ';' : ','
      const headers = lines[0]
        .split(delimiter)
        .map((h) => normalize(h.replace(/^"|"$/g, '')))

      const sellerIdx = headers.findIndex((h) => h === 'vendedor')
      const clientIdx = headers.findIndex(
        (h) => h === 'cliente' || h === 'codigo' || h === 'codigo cliente',
      )

      if (sellerIdx === -1 || clientIdx === -1) {
        throw new Error(
          "Colunas 'vendedor' e 'cliente' não encontradas. Verifique o cabeçalho do CSV.",
        )
      }

      // 4. Parse Rows
      const foundAssignments: { clientId: number; sellerId: number }[] = []
      let unmatchedCount = 0

      for (let i = 1; i < lines.length; i++) {
        // Handle CSV split with simple logic
        const regex = new RegExp(
          `\\s*${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)\\s*`,
        )
        const cols = lines[i]
          .split(regex)
          .map((v) => v.trim().replace(/^"|"$/g, ''))

        if (cols.length <= Math.max(sellerIdx, clientIdx)) continue

        const sellerName = cols[sellerIdx]
        const clientCodeStr = cols[clientIdx]

        if (!sellerName || !clientCodeStr) continue

        const clientId = parseInt(clientCodeStr)
        if (isNaN(clientId)) continue

        const normalizedSellerName = normalize(sellerName)
        const sellerId = employeeMap.get(normalizedSellerName)

        if (sellerId) {
          foundAssignments.push({ clientId, sellerId })
        } else {
          unmatchedCount++
        }
      }

      setAssignments(foundAssignments)
      setPreviewStats({
        totalRows: lines.length - 1,
        matched: foundAssignments.length,
        unmatchedSellers: unmatchedCount,
      })
      setStep('preview')
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro na análise',
        description: error.message || 'Falha ao processar o arquivo.',
        variant: 'destructive',
      })
      setFile(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImport = async () => {
    if (!activeRota) {
      toast({
        title: 'Erro',
        description: 'Nenhuma rota ativa.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const result = await rotaService.importSellerAssignments(
        activeRota.id,
        assignments,
      )
      setResultCount(result.count)
      setStep('result')
      if (onSuccess) onSuccess()

      toast({
        title: 'Sucesso',
        description: `${result.count} registros atualizados.`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na importação',
        description: 'Não foi possível atualizar os vendedores.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const reset = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(() => {
        setStep('upload')
        setFile(null)
        setAssignments([])
        setPreviewStats(null)
      }, 300)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Dialog open={open} onOpenChange={reset}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Vendedores</DialogTitle>
            <DialogDescription>
              Atualize os vendedores da rota atual enviando um arquivo CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {step === 'upload' && (
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="csv-upload">Arquivo CSV</Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    disabled={analyzing}
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    O arquivo deve conter as colunas <strong>vendedor</strong> e{' '}
                    <strong>cliente</strong>.
                  </p>
                </div>

                {analyzing && (
                  <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analisando arquivo...
                  </div>
                )}
              </div>
            )}

            {step === 'preview' && previewStats && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                  <h4 className="font-semibold text-sm flex items-center">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Resultado da Análise
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col p-2 bg-background rounded border">
                      <span className="text-muted-foreground text-xs">
                        Linhas Totais
                      </span>
                      <span className="font-bold">
                        {previewStats.totalRows}
                      </span>
                    </div>
                    <div className="flex flex-col p-2 bg-background rounded border">
                      <span className="text-muted-foreground text-xs">
                        Correspondências
                      </span>
                      <span className="font-bold text-green-600">
                        {previewStats.matched}
                      </span>
                    </div>
                  </div>
                  {previewStats.unmatchedSellers > 0 && (
                    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                      <AlertCircle className="h-4 w-4" />
                      {previewStats.unmatchedSellers} vendedores não
                      encontrados.
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep('upload')}
                  >
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={loading || previewStats.matched === 0}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmar Importação
                  </Button>
                </div>
              </div>
            )}

            {step === 'result' && (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center animate-fade-in">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-green-700">
                    Importação Concluída
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Foram atualizados {resultCount} clientes com sucesso.
                  </p>
                </div>
                <Button onClick={() => setOpen(false)} className="mt-2">
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <span className="text-[10px] text-muted-foreground mt-1 text-center max-w-[150px] leading-tight">
        O arquivo CSV deve conter as colunas 'vendedor' e 'cliente'
      </span>
    </div>
  )
}
