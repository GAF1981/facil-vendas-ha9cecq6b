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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { productsService, CsvProductRow } from '@/services/productsService'

interface ProductImportDialogProps {
  onSuccess?: () => void
}

export function ProductImportDialog({ onSuccess }: ProductImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<CsvProductRow[]>([])
  const [stats, setStats] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setStats(null)
    setParsedData([])

    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV.',
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }

      setFile(selectedFile)
      setLoading(true)
      try {
        const data = await productsService.parseCSV(selectedFile)
        setParsedData(data)
        if (data.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'Não foram encontrados dados válidos no arquivo.',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao ler arquivo',
          description: 'Não foi possível processar o arquivo CSV.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const handleImport = async () => {
    if (!parsedData.length) return

    setLoading(true)
    try {
      const result = await productsService.bulkUpdateFromCsv(parsedData)
      setStats(result)

      if (result.errors.length === 0 && result.success > 0) {
        toast({
          title: 'Importação concluída',
          description: `${result.success} produtos atualizados com sucesso.`,
        })
        if (onSuccess) onSuccess()
        setTimeout(() => {
          setOpen(false)
          setFile(null)
          setParsedData([])
          setStats(null)
        }, 2000)
      } else if (result.success > 0) {
        toast({
          title: 'Importação parcial',
          description: `${result.success} atualizados, ${result.failed} não encontrados.`,
          variant: 'default',
        })
        if (onSuccess) onSuccess()
      } else {
        toast({
          title: 'Erro na importação',
          description: 'Nenhum produto foi atualizado.',
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
        setStats(null)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Atualização de Produtos</DialogTitle>
          <DialogDescription>
            Selecione um arquivo CSV para atualizar códigos internos e códigos
            de barras. Os campos são tratados como texto para preservar zeros à
            esquerda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Colunas esperadas: <code>produto</code>,{' '}
              <code>codigo_interno</code>, <code>codigo_barras</code>
            </p>
          </div>

          {parsedData.length > 0 && !stats && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span>
                {parsedData.length} linhas identificadas para processamento.
              </span>
            </div>
          )}

          {stats && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-sm border border-green-200 dark:border-green-800">
                <CheckCircle className="h-4 w-4" />
                <span>{stats.success} produtos atualizados com sucesso.</span>
              </div>

              {stats.failed > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md text-sm border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <span>
                    {stats.failed} produtos não encontrados ou ignorados.
                  </span>
                </div>
              )}

              {stats.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm border border-red-200 dark:border-red-800 max-h-[100px] overflow-y-auto">
                  <p className="font-semibold mb-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Erros:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    {stats.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {stats.errors.length > 5 && (
                      <li>...e mais {stats.errors.length - 5} erros.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || parsedData.length === 0 || loading || !!stats}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {stats ? 'Concluído' : 'Atualizar Produtos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
