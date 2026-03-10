import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RotateCcw,
  Loader2,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { reportsService, AdjustmentReportRow } from '@/services/reportsService'
import { employeesService } from '@/services/employeesService'
import { format, parseISO } from 'date-fns'
import { formatCurrency } from '@/lib/formatters'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Employee } from '@/types/employee'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'

export default function AdjustmentReportsPage() {
  const [data, setData] = useState<AdjustmentReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sellers, setSellers] = useState<Employee[]>([])

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedSeller, setSelectedSeller] = useState<string>('all')

  useEffect(() => {
    // Fetch sellers for filter
    employeesService.getEmployees(1, 1000).then(({ data }) => {
      setSellers(
        data.filter(
          (e) =>
            e.situacao === 'ATIVO' &&
            Array.isArray(e.setor) &&
            e.setor.includes('Vendedor'),
        ),
      )
    })
  }, [])

  const fetchData = () => {
    setLoading(true)
    reportsService
      .getInitialBalanceAdjustments({
        sellerId: selectedSeller,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = () => {
    fetchData()
  }

  const totalAjuste = data.reduce(
    (acc, row) => acc + (row.valor_ajuste || 0),
    0,
  )
  const positivoAjuste = data.reduce(
    (acc, row) => acc + ((row.valor_ajuste || 0) > 0 ? row.valor_ajuste! : 0),
    0,
  )
  const negativoAjuste = data.reduce(
    (acc, row) => acc + ((row.valor_ajuste || 0) < 0 ? row.valor_ajuste! : 0),
    0,
  )

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-8 w-8 text-primary" />
          Ajustes de Saldo Inicial
        </h1>
        <p className="text-muted-foreground">
          Relatório de auditoria de alterações manuais no saldo inicial.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Ajuste Total de Saldo Inicial"
          value={`R$ ${formatCurrency(totalAjuste)}`}
          icon={DollarSign}
          iconClassName="text-primary"
        />
        <MetricCard
          title="Ajuste Positivo de Saldo Inicial"
          value={`R$ ${formatCurrency(positivoAjuste)}`}
          icon={TrendingUp}
          iconClassName="text-green-500"
        />
        <MetricCard
          title="Ajuste Negativo de Saldo Inicial"
          value={`R$ ${formatCurrency(Math.abs(negativoAjuste))}`}
          icon={TrendingDown}
          iconClassName="text-red-500"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <span className="text-sm font-medium">Período</span>
          <DateRangePicker date={dateRange} setDate={setDateRange} />
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-[200px]">
          <span className="text-sm font-medium">Vendedor</span>
          <Select value={selectedSeller} onValueChange={setSelectedSeller}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleFilter} className="w-full sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Filtrar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ajustes</CardTitle>
          <CardDescription>
            Exibindo os últimos {data.length > 0 ? data.length : 5000} ajustes
            realizados (filtrados).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Item (Produto)</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Saldo Anterior</TableHead>
                    <TableHead className="text-right">Saldo Novo</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead className="text-right">
                      Valor Ajuste (R$)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center h-24 text-muted-foreground"
                      >
                        Nenhum ajuste encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {format(
                            parseISO(row.data_acerto),
                            'dd/MM/yyyy HH:mm',
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">
                              {row.cliente_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Cod: {row.cliente_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={row.produto_nome}
                        >
                          {row.produto_nome || '-'}
                        </TableCell>
                        <TableCell>{row.vendedor_nome}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {row.saldo_anterior}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {row.saldo_novo}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            row.quantidade_alterada > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {row.quantidade_alterada > 0 ? '+' : ''}
                          {row.quantidade_alterada}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {row.valor_ajuste
                            ? `R$ ${formatCurrency(row.valor_ajuste)}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
