import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reportsService, DebitoReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function DebitosReportPage() {
  const [data, setData] = useState<DebitoReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  // Filters
  const [filters, setFilters] = useState({
    vendedor: 'todos',
    pedido: '',
    client: '',
    dateStart: '',
    dateEnd: '',
    debitoMin: '',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await reportsService.getDebtsReport()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar relatório de débitos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await reportsService.refreshDebtsReport()
      await loadData()
      toast({
        title: 'Atualizado',
        description: 'Dados recalculados com sucesso.',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (
        filters.vendedor !== 'todos' &&
        row.vendedor_nome !== filters.vendedor
      )
        return false
      if (filters.pedido && !row.pedido_id.toString().includes(filters.pedido))
        return false
      if (
        filters.client &&
        !row.cliente_nome
          ?.toLowerCase()
          .includes(filters.client.toLowerCase()) &&
        !row.cliente_codigo?.toString().includes(filters.client)
      )
        return false
      if (filters.dateStart && row.data_acerto < filters.dateStart) return false
      if (filters.dateEnd && row.data_acerto > filters.dateEnd) return false
      if (filters.debitoMin && row.debito < Number(filters.debitoMin))
        return false
      return true
    })
  }, [data, filters])

  // Unique sellers for filter
  const sellers = useMemo(
    () => Array.from(new Set(data.map((r) => r.vendedor_nome).filter(Boolean))),
    [data],
  )

  // Totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => ({
        venda: acc.venda + curr.valor_venda,
        desconto: acc.desconto + (curr.desconto || 0),
        saldo: acc.saldo + curr.saldo_a_pagar,
        pago: acc.pago + curr.valor_pago,
        debito: acc.debito + curr.debito,
      }),
      { venda: 0, desconto: 0, saldo: 0, pago: 0, debito: 0 },
    )
  }, [filteredData])

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/relatorio">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Relatório de Débitos
            </h1>
            <p className="text-muted-foreground">
              Acompanhamento detalhado de dívidas e pagamentos por pedido.
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing || loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Recalcular Dados
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vendedor</label>
              <Select
                value={filters.vendedor}
                onValueChange={(v) => setFilters({ ...filters, vendedor: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pedido</label>
              <Input
                placeholder="Nº Pedido"
                value={filters.pedido}
                onChange={(e) =>
                  setFilters({ ...filters, pedido: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente (Nome/Cód)</label>
              <Input
                placeholder="Buscar..."
                value={filters.client}
                onChange={(e) =>
                  setFilters({ ...filters, client: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={filters.dateStart}
                onChange={(e) =>
                  setFilters({ ...filters, dateStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={filters.dateEnd}
                onChange={(e) =>
                  setFilters({ ...filters, dateEnd: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Débito Maior Que</label>
              <Input
                type="number"
                placeholder="0.00"
                value={filters.debitoMin}
                onChange={(e) =>
                  setFilters({ ...filters, debitoMin: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Pedido</TableHead>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Cód. Cli</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right text-muted-foreground">
                    Desconto
                  </TableHead>
                  <TableHead className="text-right font-medium">
                    Saldo a Pagar
                  </TableHead>
                  <TableHead className="text-right text-green-600">
                    Valor Pago
                  </TableHead>
                  <TableHead className="text-right text-red-600 font-bold">
                    Débito
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredData.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        <TableCell className="font-mono">
                          #{row.pedido_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {safeFormatDate(row.data_acerto, 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-center">
                          {row.cliente_codigo || '-'}
                        </TableCell>
                        <TableCell>
                          <span
                            className="font-medium truncate block max-w-[200px]"
                            title={row.cliente_nome || ''}
                          >
                            {row.cliente_nome || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {row.rota ? (
                            <Badge variant="outline" className="font-normal">
                              {row.rota}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{row.vendedor_nome || '-'}</TableCell>
                        <TableCell className="text-right">
                          R$ {formatCurrency(row.valor_venda)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          R$ {formatCurrency(row.desconto || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {formatCurrency(row.saldo_a_pagar)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          R$ {formatCurrency(row.valor_pago)}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-bold">
                          R$ {formatCurrency(row.debito)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totalizer */}
                    <TableRow className="bg-muted font-bold border-t-2 text-sm">
                      <TableCell colSpan={6}>TOTAIS GERAIS</TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(totals.venda)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(totals.desconto)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(totals.saldo)}
                      </TableCell>
                      <TableCell className="text-right text-green-700">
                        R$ {formatCurrency(totals.pago)}
                      </TableCell>
                      <TableCell className="text-right text-red-700">
                        R$ {formatCurrency(totals.debito)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
