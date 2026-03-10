import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { reportsService, ExpenseReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { Loader2, ArrowLeft, Search, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/dashboard/MetricCard'

export default function ExpensesReportPage() {
  const [data, setData] = useState<ExpenseReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await reportsService.getExpensesReport(startDate, endDate)
      setData(result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const totalExpenses = data.reduce((acc, row) => acc + row.valor, 0)
  const countExpenses = data.length

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link to="/relatorio">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground">
            Relatório de despesas por período.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o período para visualizar as despesas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button
              onClick={fetchData}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Despesas do Período"
          value={`R$ ${formatCurrency(totalExpenses)}`}
          icon={Receipt}
          description="Soma do valor de todas as despesas filtradas"
          className="border-red-200 bg-red-50/30"
          iconClassName="text-red-600"
        />
        <MetricCard
          title="Quantidade de Lançamentos"
          value={countExpenses}
          icon={Receipt}
          description="Total de despesas registradas no período"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[150px]">Data</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Detalhamento</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Saiu do Caixa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma despesa encontrada para este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {safeFormatDate(item.data, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{item.grupo}</TableCell>
                      <TableCell>{item.detalhamento}</TableCell>
                      <TableCell>{item.funcionario_nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={item.saiu_do_caixa ? 'default' : 'secondary'}
                        >
                          {item.saiu_do_caixa ? 'SIM' : 'NÃO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-red-600">
                        R$ {formatCurrency(item.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
