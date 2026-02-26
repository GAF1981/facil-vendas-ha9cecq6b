import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Loader2,
  Search,
  TrendingUp,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { reportsService, ProjectionReportRow } from '@/services/reportsService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

const ProjectionsPage = () => {
  const [data, setData] = useState<ProjectionReportRow[]>([])
  const [filteredData, setFilteredData] = useState<ProjectionReportRow[]>([])
  const [loading, setLoading] = useState(true)

  const [searchClient, setSearchClient] = useState('')
  const [searchOrder, setSearchOrder] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)

  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const result = await reportsService.getProjectionsReport()
        setData(result)
        setFilteredData(result)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar o relatório de projeções.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [toast])

  useEffect(() => {
    const lowerClient = searchClient.toLowerCase()
    const lowerOrder = searchOrder.toLowerCase()

    let filtered = data.filter((item) => {
      const matchClient =
        !lowerClient ||
        item.clientName.toLowerCase().includes(lowerClient) ||
        item.clientCode.toString().includes(lowerClient)

      const matchOrder =
        !lowerOrder || item.orderId.toString().includes(lowerOrder)

      return matchClient && matchOrder
    })

    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === 'asc') return a.orderId - b.orderId
        return b.orderId - a.orderId
      })
    }

    setFilteredData(filtered)
  }, [searchClient, searchOrder, sortOrder, data])

  const toggleSortOrder = () => {
    if (sortOrder === null) setSortOrder('asc')
    else if (sortOrder === 'asc') setSortOrder('desc')
    else setSortOrder(null)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/relatorio')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Projeções e Médias
          </h1>
          <p className="text-muted-foreground">
            Análise de frequência de vendas e desempenho financeiro.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Histórico de Pedidos e Projeções
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou código..."
                  className="pl-8"
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                />
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nº pedido..."
                  className="pl-8"
                  value={searchOrder}
                  onChange={(e) => setSearchOrder(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Cód.</TableHead>
                    <TableHead className="min-w-[200px]">
                      Nome do Cliente
                    </TableHead>
                    <TableHead
                      className="w-[120px] cursor-pointer hover:bg-muted transition-colors select-none group"
                      onClick={toggleSortOrder}
                    >
                      <div className="flex items-center gap-1">
                        Nº Pedido
                        <span className="text-muted-foreground group-hover:text-foreground">
                          {sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sortOrder === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead className="text-right whitespace-nowrap">
                      Valor Venda
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap bg-blue-50/50">
                      Dias entre
                      <br />
                      acertos
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap bg-blue-50/50">
                      Índice
                      <br />
                      (Meses)
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap bg-green-50/50">
                      Média
                      <br />
                      Mensal
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap bg-orange-50/50">
                      Dias para
                      <br />
                      Projeção
                    </TableHead>
                    <TableHead className="text-right whitespace-nowrap bg-orange-100/50 font-bold">
                      PROJEÇÃO
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row) => (
                      <TableRow key={row.orderId} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {row.clientName}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-xs">
                          #{row.orderId}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.orderDate
                            ? format(parseISO(row.orderDate), 'dd/MM/yy', {
                                locale: ptBR,
                              })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {formatCurrency(row.totalValue)}
                        </TableCell>

                        {/* New Calculated Columns */}
                        <TableCell className="text-center bg-blue-50/20">
                          {row.daysBetweenOrders !== null
                            ? row.daysBetweenOrders
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center bg-blue-50/20">
                          {row.indexDays !== null
                            ? row.indexDays.toFixed(2).replace('.', ',')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right bg-green-50/20 font-medium text-green-700">
                          {row.monthlyAverage !== null
                            ? `R$ ${formatCurrency(row.monthlyAverage)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center bg-orange-50/20 text-muted-foreground">
                          {row.daysSinceLastOrder !== null
                            ? row.daysSinceLastOrder
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right bg-orange-100/30 font-bold text-orange-700">
                          {row.projection !== null
                            ? `R$ ${formatCurrency(row.projection)}`
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

export default ProjectionsPage
