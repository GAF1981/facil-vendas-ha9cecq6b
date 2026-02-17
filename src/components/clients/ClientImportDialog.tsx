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
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { clientsService } from '@/services/clientsService'

interface ClientImportDialogProps {
  onSuccess?: () => void
}

export function ClientImportDialog({ onSuccess }: ClientImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [parsedData, setParsedData] = useState<any[]>([])
  const [preview, setPreview] = useState<{
    toCreate: number
    toUpdate: number
  } | null>(null)
  const [resultStats, setResultStats] = useState<{
    count: number
    errors: number
  } | null>(null)

  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setResultStats(null)
    setPreview(null)
    setParsedData([])
    setStep('upload')

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
      setAnalyzing(true)

      try {
        const data = await clientsService.parseCSV(selectedFile)
        setParsedData(data)

        if (data.length === 0) {
          toast({
            title: 'Arquivo vazio ou formato inválido',
            description: 'Não foram encontrados dados no arquivo.',
            variant: 'destructive',
          })
          setAnalyzing(false)
          return
        }

        const analysis = await clientsService.analyzeImport(data)
        setPreview(analysis)
        setStep('preview')
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao analisar',
          description: 'Não foi possível processar o arquivo CSV.',
          variant: 'destructive',
        })
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const handleImport = async () => {
    if (!parsedData.length) return

    setLoading(true)
    try {
      const result = await clientsService.importClients(parsedData)
      setResultStats({
        count: result.count,
        errors: result.errors,
      })
      setStep('result')

      if (result.success) {
        toast({
          title: 'Importação concluída',
          description: `${result.count} clientes processados com sucesso.`,
        })
        if (onSuccess) onSuccess()
      } else {
        toast({
          title: 'Importação com erros',
          description: `Ocorreram erros em ${result.errors} registros.`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro crítico',
        description: 'Falha ao comunicar com o servidor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetState = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTimeout(() => {
        setFile(null)
        setParsedData([])
        setPreview(null)
        setResultStats(null)
        setStep('upload')
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetState}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>
            Atualize dados ou crie novos clientes via CSV. O campo "CODIGO" será
            usado para identificar os clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'upload' && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="csv-file">Arquivo CSV</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={analyzing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Certifique-se que o arquivo contém a coluna <code>CODIGO</code>.
              </p>
              {analyzing && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Analisando arquivo...
                </div>
              )}
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <h4 className="font-semibold text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Resumo da Importação
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col p-3 bg-background rounded border shadow-sm">
                    <span className="text-xs text-muted-foreground">
                      Para Atualizar
                    </span>
                    <span className="text-xl font-bold text-blue-600 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {preview.toUpdate}
                    </span>
                  </div>
                  <div className="flex flex-col p-3 bg-background rounded border shadow-sm">
                    <span className="text-xs text-muted-foreground">
                      Para Criar
                    </span>
                    <span className="text-xl font-bold text-green-600 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {preview.toCreate}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-1">
                  Total de linhas processáveis: {parsedData.length}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  size="sm"
                >
                  Voltar
                </Button>
                <Button onClick={handleImport} disabled={loading} size="sm">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Importação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && resultStats && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="h-10 w-10 text-green-600 mb-2" />
                <h3 className="font-bold text-lg text-green-800 dark:text-green-300">
                  Processamento Finalizado
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  A importação foi concluída.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted rounded border text-center">
                  <div className="text-sm text-muted-foreground">Sucesso</div>
                  <div className="text-2xl font-bold text-green-600">
                    {resultStats.count}
                  </div>
                </div>
                <div className="p-3 bg-muted rounded border text-center">
                  <div className="text-sm text-muted-foreground">Erros</div>
                  <div className="text-2xl font-bold text-red-600">
                    {resultStats.errors}
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setOpen(false)}
                variant="default"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>

        {step === 'upload' && (
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
