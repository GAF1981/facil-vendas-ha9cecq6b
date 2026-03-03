import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { reportsService, TopSellingItemV3 } from '@/services/reportsService'
import { formatCurrency } from '@/lib/formatters'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import {
  Search,
  Loader2,
  ArrowLeft,
  DollarSign,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/dashboard/MetricCard'

export default function TopSellingReportsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TopSellingItemV3[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await reportsService.getTopSellingItemsV3(
        startDate,
        endDate,
      )
      setData(result)
    } catch (error) {
      console.error('Failed to fetch top selling items', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      const date = new Date(`${val}-01T12:00:00`)
      setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'))
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredData = useMemo(() => {
    if (!debouncedSearch) return data
    const lower = debouncedSearch.toLowerCase()
    return data.filter(
      (item) =>
        (item.produto_nome &&
          item.produto_nome.toLowerCase().includes(lower)) ||
        (item.produto_codigo && String(item.produto_codigo).includes(lower)),
    )
  }, [data, debouncedSearch])

  const totalValue = filteredData.reduce(
    (acc, item) => acc + item.valor_total,
    0,
  )
  const totalQuantity = filteredData.reduce(
    (acc, item) => acc + item.quantidade_total,
    0,
  )
  const totalItems = filteredData.length

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link to="/relatorio">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Itens Mais Vendidos
          </h1>
          <p className="text-muted-foreground">
            Relatório de vendas por produto agrupado por período.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o mês ou busque por produtos específicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-auto space-y-2">
                <Label>Mês de Referência</Label>
                <Input
                  type="month"
                  className="w-full sm:w-[200px]"
                  onChange={handleMonthChange}
                  defaultValue={format(new Date(), 'yyyy-MM')}
                />
              </div>
              <div className="w-full sm:flex-1 max-w-md space-y-2">
                <Label>Buscar Produto</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end pt-2 border-t mt-2">
              <div className="space-y-2 w-full sm:w-auto">
                <Label htmlFor="start-date">Início (Personalizado)</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 w-full sm:w-auto">
                <Label htmlFor="end-date">Fim (Personalizado)</Label>
                <Input
                  id="end-date"
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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Venda Total do Período"
          value={`R$ ${formatCurrency(totalValue)}`}
          icon={DollarSign}
          description="Soma do valor total vendido"
        />
        <MetricCard
          title="Quantidade de Itens"
          value={totalQuantity.toLocaleString('pt-BR')}
          icon={Package}
          description="Soma da quantidade de produtos"
        />
        <MetricCard
          title="Produtos Diferentes"
          value={totalItems}
          icon={ShoppingCart}
          description="Contagem de SKUs exibidos"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de Vendas</CardTitle>
          <CardDescription>
            Período: {format(new Date(startDate), 'dd/MM/yyyy')} até{' '}
            {format(new Date(endDate), 'dd/MM/yyyy')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd. Vendida</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <span className="text-muted-foreground mt-2 block">
                        Calculando...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado para a busca realizada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => (
                    <TableRow
                      key={`${item.produto_codigo}-${index}`}
                      className="hover:bg-muted/30"
                    >
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}º
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.produto_codigo}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.produto_nome}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {item.quantidade_total.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {formatCurrency(item.valor_total)}
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
