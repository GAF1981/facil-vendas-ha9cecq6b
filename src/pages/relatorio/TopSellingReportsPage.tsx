import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { reportsService, TopSellingItemV5 } from '@/services/reportsService'
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
  const [data, setData] = useState<TopSellingItemV5[]>([])
  const [grupos, setGrupos] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos')

  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  useEffect(() => {
    reportsService.getUniqueProductGroups().then(setGrupos).catch(console.error)
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await reportsService.getTopSellingItemsV5(
        startDate,
        endDate,
        undefined,
        selectedGrupo !== 'todos' ? selectedGrupo : undefined,
      )
      setData(result)
    } catch (error) {
      console.error('Failed to fetch top selling items', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedGrupo])

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
  }, [fetchData])

  const filteredData = useMemo(() => {
    let filtered = data

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          (item.produto_nome &&
            item.produto_nome.toLowerCase().includes(lower)) ||
          (item.produto_codigo && String(item.produto_codigo).includes(lower)),
      )
    }

    return filtered
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
            Selecione o mês, grupo de produto ou busque itens específicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-auto space-y-2">
                <Label>Mês de Referência</Label>
                <Input
                  type="month"
                  className="w-full sm:w-[160px]"
                  onChange={handleMonthChange}
                  defaultValue={format(new Date(), 'yyyy-MM')}
                />
              </div>
              <div className="w-full sm:w-[200px] space-y-2">
                <Label>Grupo de Produto</Label>
                <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {grupos.map((grupo) => (
                      <SelectItem key={grupo} value={grupo}>
                        {grupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          description="Soma do valor total vendido (filtrado)"
        />
        <MetricCard
          title="Quantidade de Itens"
          value={totalQuantity.toLocaleString('pt-BR')}
          icon={Package}
          description="Soma da quantidade de produtos (filtrado)"
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
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Qtd. Vendida</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <span className="text-muted-foreground mt-2 block">
                        Calculando...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum dado encontrado para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado para a busca ou filtro
                      selecionado.
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
                      <TableCell className="text-muted-foreground">
                        {item.grupo || '-'}
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
