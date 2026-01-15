import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'
import {
  importSaldoService,
  ImportResult,
  CsvRow,
} from '@/services/importSaldoService'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ImportSaldoPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([])

  // Security Check: Only 'Administrador' sector allowed
  // Handling array of sectors for compatibility
  const userSectors = Array.isArray(employee?.setor)
    ? employee.setor
    : [employee?.setor]
  const isAdmin = userSectors.includes('Administrador')

  if (!employee) {
    return (
      <div className="flex justify-center items-center h-screen bg-muted/20">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in p-4">
        <ShieldAlert className="w-16 h-16 text-red-600" />
        <h1 className="text-2xl font-bold text-red-800">Acesso Negado</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Apenas administradores podem acessar a ferramenta de importação de
          saldo inicial.
        </p>
        <Button asChild variant="outline">
          <Link to="/relatorio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Relatórios
          </Link>
        </Button>
      </div>
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: 'Formato Inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)
    setResult(null)

    // Parse preview
    try {
      const parsed = await importSaldoService.parseCSV(selectedFile)
      setCsvPreview(parsed.slice(0, 5)) // Show first 5 rows
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo CSV.',
        variant: 'destructive',
      })
      setFile(null)
    }
  }

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const parsedData = await importSaldoService.parseCSV(file)
      const importResult = await importSaldoService.processImport(
        parsedData,
        employee.id,
        employee.nome_completo,
      )
      setResult(importResult)

      if (importResult.successCount > 0) {
        toast({
          title: 'Importação Concluída',
          description: `${importResult.successCount} registros importados com sucesso.`,
          className: 'bg-green-600 text-white',
        })
      }

      if (importResult.failureCount > 0) {
        toast({
          title: 'Erros na Importação',
          description: 'Alguns registros falharam. Verifique o relatório.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Falha Crítica',
        description: error.message || 'Erro desconhecido durante a importação.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setCsvPreview([])
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/relatorio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Importação de Saldo Inicial
          </h1>
          <p className="text-muted-foreground">
            Ferramenta para migração em massa de estoque inicial de clientes.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Carregar Arquivo CSV</CardTitle>
            <CardDescription>
              O arquivo deve conter as colunas: <code>código do cliente</code>,{' '}
              <code>código do produto</code>, <code>quantidade</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-colors ${
                file
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/20 hover:border-primary/50'
              }`}
            >
              {file ? (
                <div className="space-y-2">
                  <FileText className="h-12 w-12 text-primary mx-auto" />
                  <p className="font-medium text-lg">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Remover Arquivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="font-medium text-lg">
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-upload"
                    onChange={handleFileChange}
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      Selecionar Arquivo
                    </label>
                  </Button>
                </div>
              )}
            </div>

            {file && !result && (
              <div className="flex justify-end">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Processar
                      Importação
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {csvPreview.length > 0 && !result && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Pré-visualização (Primeiras 5 linhas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">Cliente (Cód)</th>
                      <th className="p-2 text-left">Produto (Cód)</th>
                      <th className="p-2 text-left">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">
                          {row['código do cliente'] || row['codigo do cliente']}
                        </td>
                        <td className="p-2">
                          {row['código do produto'] || row['codigo do produto']}
                        </td>
                        <td className="p-2">{row['quantidade']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card className="md:col-span-2 animate-fade-in border-l-4 border-l-blue-600">
            <CardHeader>
              <CardTitle>Resultado da Importação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm font-medium text-green-800 uppercase">
                    Sucesso
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {result.successCount}
                  </p>
                  <p className="text-xs text-green-700">Registros importados</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-sm font-medium text-red-800 uppercase">
                    Falhas
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {result.failureCount}
                  </p>
                  <p className="text-xs text-red-700">Registros inválidos</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Detalhes dos Erros
                  </h4>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-muted/20 text-sm font-mono text-red-600">
                    <ul className="space-y-1">
                      {result.errors.map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <Button
                onClick={handleClear}
                variant="outline"
                className="w-full"
              >
                Nova Importação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
