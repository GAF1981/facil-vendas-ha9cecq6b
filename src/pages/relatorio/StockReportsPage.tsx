import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save, RefreshCw, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { stockReportService } from '@/services/stockReportService'
import { StockReportRow, StockReportFilters } from '@/types/stockReport'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function StockReportsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<StockReportRow[]>([])
  const [mode, setMode] = useState<'live' | 'history'>('live')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filters
  const [filters, setFilters] = useState<StockReportFilters>({
    mode: 'live',
    startDate: undefined,
    endDate: undefined,
  })

  // Debounced filters state for query
  const [debouncedFilters, setDebouncedFilters] =
    useState<StockReportFilters>(filters)

  // Auto-save on mount logic
  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (mode === 'live' && !lastUpdated) {
        await handleSaveSnapshot(true)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, []) // Empty dependency to run once on mount

  // Handle debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 500)
    return () => clearTimeout(timer)
  }, [filters])

  // Fetch data when filters change (History Mode)
  useEffect(() => {
    if (mode === 'history') {
      fetchHistory()
    }
  }, [debouncedFilters, mode])

  const handleSaveSnapshot = async (isAuto = false) => {
    setLoading(true)
    try {
      const result = await stockReportService.processAndSaveSnapshot()
      setData(result)
      setLastUpdated(new Date())
      if (!isAuto) {
        toast.success('Estoque gravado com sucesso!', {
          description: `${result.length} registros atualizados.`,
        })
      }
    } catch (error) {
      console.error('Error saving snapshot:', error)
      toast.error('Erro ao gravar estoque', {
        description: 'Não foi possível salvar o snapshot do estoque.',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const result = await stockReportService.getStockHistory(debouncedFilters)
      setData(result)
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Erro ao buscar histórico')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof StockReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleMode = (newMode: 'live' | 'history') => {
    setMode(newMode)
    setFilters((prev) => ({ ...prev, mode: newMode }))
    if (newMode === 'live') {
      // If switching back to live, generally we show the last fetched live data
      // or we could re-trigger save? Requirements say "view... current/latest snapshot".
      // If we already have data and it's fresh enough, we keep it.
      // If data is empty, we trigger save.
      if (data.length === 0) {
        handleSaveSnapshot()
      }
    } else {
      // Clear data to show loading state for history
      setData([])
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/relatorio')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Relatório de Estoque
            </h1>
            <p className="text-muted-foreground">
              {mode === 'live'
                ? 'Visualizando snapshot atual (Gravado Automaticamente)'
                : 'Histórico de snapshots gravados'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="flex bg-muted p-1 rounded-md">
            <Button
              variant={mode === 'live' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleMode('live')}
              className="w-1/2 sm:w-auto"
            >
              Atual (Live)
            </Button>
            <Button
              variant={mode === 'history' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => toggleMode('history')}
              className="w-1/2 sm:w-auto"
            >
              Histórico
            </Button>
          </div>

          {mode === 'live' && (
            <Button
              onClick={() => handleSaveSnapshot()}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Gravar Estoque e exibir último
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>Filtros</CardTitle>
            {lastUpdated && mode === 'live' && (
              <span className="text-xs text-muted-foreground flex items-center">
                <RefreshCw className="mr-1 h-3 w-3" />
                Atualizado em: {format(lastUpdated, 'dd/MM/yyyy HH:mm:ss')}
              </span>
            )}
          </div>
          <CardDescription>
            Utilize os campos abaixo para filtrar os resultados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pedido">Número do Pedido</Label>
              <Input
                id="pedido"
                placeholder="Ex: 12345"
                value={filters.numero_pedido || ''}
                onChange={(e) =>
                  handleFilterChange('numero_pedido', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código Cliente</Label>
              <Input
                id="codigo"
                placeholder="Ex: 100"
                value={filters.codigo_cliente || ''}
                onChange={(e) =>
                  handleFilterChange('codigo_cliente', e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Cliente</Label>
              <Input
                id="nome"
                placeholder="Buscar por nome..."
                value={filters.cliente_nome || ''}
                onChange={(e) =>
                  handleFilterChange('cliente_nome', e.target.value)
                }
              />
            </div>

            {mode === 'history' && (
              <div className="space-y-2">
                <Label htmlFor="date">Data do Snapshot</Label>
                <Input
                  id="date"
                  type="date"
                  value={
                    filters.startDate
                      ? format(filters.startDate, 'yyyy-MM-dd')
                      : ''
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value)
                      : undefined
                    // For simplicity, set both start and end to cover the whole day if needed,
                    // or just filter gte start. Let's just set start date.
                    handleFilterChange('startDate', date)
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot Data</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Data/Hora Acerto</TableHead>
              <TableHead>Cód. Cliente</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Saldo Final</TableHead>
              <TableHead className="text-right">Preço Vendido</TableHead>
              <TableHead className="text-right">Estoque Produto</TableHead>
              <TableHead className="text-right">
                Estoque Final (Pedido)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <span className="text-muted-foreground text-sm mt-2 block">
                    Carregando dados...
                  </span>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data
                .filter((row) => {
                  // Client-side filtering for 'live' mode since we fetch everything in the snapshot
                  // For 'history' mode, filtering is done server-side
                  if (mode === 'history') return true

                  const matchPedido =
                    !filters.numero_pedido ||
                    row.numero_pedido
                      ?.toString()
                      .includes(filters.numero_pedido)
                  const matchCode =
                    !filters.codigo_cliente ||
                    row.codigo_cliente
                      ?.toString()
                      .includes(filters.codigo_cliente)
                  const matchName =
                    !filters.cliente_nome ||
                    row.cliente_nome
                      ?.toLowerCase()
                      .includes(filters.cliente_nome.toLowerCase())

                  return matchPedido && matchCode && matchName
                })
                .map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {safeFormatDate(row.created_at, 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell>{row.numero_pedido}</TableCell>
                    <TableCell>
                      {safeFormatDate(row.data_hora_acerto)}
                    </TableCell>
                    <TableCell>{row.codigo_cliente}</TableCell>
                    <TableCell className="font-medium">
                      {row.cliente_nome}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={row.produto_nome || ''}
                    >
                      {row.produto_nome}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.saldo_final}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.preco_vendido || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(row.estoque_por_produto || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(row.estoque_final || 0)}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Exibindo {data.length} registros.{' '}
        {mode === 'live'
          ? 'Filtro aplicado localmente.'
          : 'Filtro aplicado no servidor.'}
      </div>
    </div>
  )
}
