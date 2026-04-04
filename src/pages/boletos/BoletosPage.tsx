import { useState, useEffect } from 'react'
import { boletoService } from '@/services/boletoService'
import { Boleto } from '@/types/boleto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Upload, RotateCcw, Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [filterConferido, setFilterConferido] = useState<string>('nao')
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await boletoService.getAll()
      setBoletos(data)
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar boletos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const parsed = await boletoService.parseCSV(file)
      const res = await boletoService.importBoletos(parsed)
      if (res.success) {
        toast({
          title: 'Sucesso',
          description: res.message,
          className: 'bg-green-600 text-white',
        })
        await loadData()
      } else {
        toast({
          title: 'Aviso',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao importar o arquivo CSV.',
        variant: 'destructive',
      })
    } finally {
      if (e.target) e.target.value = ''
      setLoading(false)
    }
  }

  const filteredBoletos = boletos.filter((b) => {
    if (filterConferido === 'todos') return true
    if (filterConferido === 'sim') return b.conferido === true
    if (filterConferido === 'nao') return b.conferido === false
    return true
  })

  const handleExport = () => {
    if (filteredBoletos.length === 0) return
    boletoService.generateCSV(
      filteredBoletos.map((b) => ({
        ...b,
        conferido: b.conferido ? 'SIM' : 'NÃO',
        originalConferido: b.conferido,
      })),
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Boletos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a importação e o status dos boletos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterConferido} onValueChange={setFilterConferido}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Conferido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sim">Conferido: SIM</SelectItem>
              <SelectItem value="nao">Conferido: NÃO</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button variant="outline" disabled={loading}>
              <Upload className="mr-2 h-4 w-4" /> Importar CSV
            </Button>
          </div>
          <Button
            onClick={handleExport}
            variant="secondary"
            disabled={loading || boletos.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button onClick={loadData} disabled={loading}>
            <RotateCcw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Conferido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum boleto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoletos.map((b) => (
                  <TableRow
                    key={b.id}
                    className={cn(
                      'hover:bg-muted/50',
                      b.is_divida_manual &&
                        'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10',
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {b.cliente_nome}
                        {b.is_divida_manual && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-blue-200 text-blue-700 bg-blue-50"
                          >
                            Dívida Manual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.cliente_codigo}
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(b.vencimento, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      R$ {formatCurrency(b.valor)}
                    </TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={b.conferido ? 'default' : 'destructive'}
                        className={cn(
                          b.conferido &&
                            'bg-green-600 hover:bg-green-700 text-white',
                        )}
                      >
                        {b.conferido ? 'SIM' : 'NÃO'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
