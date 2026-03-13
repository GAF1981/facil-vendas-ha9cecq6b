import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  resumoAcertosService,
  SettlementSummary,
} from '@/services/resumoAcertosService'
import { reportsService, ProjectionReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Loader2,
  RefreshCw,
  Map as MapIcon,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  User,
  FileText,
  Printer,
  Edit3,
  Trash2,
  Filter,
  CalendarDays,
  Search,
  Hash,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Rota } from '@/types/rota'
import { Employee } from '@/types/employee'
import { employeesService } from '@/services/employeesService'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { acertoService } from '@/services/acertoService'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { EditPaymentDialog } from '@/components/resumo-acertos/EditPaymentDialog'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'

export default function ResumoAcertosPage() {
  const { employee: loggedInUser } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [data, setData] = useState<SettlementSummary[]>([])

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('todos')
  const [clientSearchFilter, setClientSearchFilter] = useState<string>('')
  const [orderNumberFilter, setOrderNumberFilter] = useState<string>('')

  const [filterMode, setFilterMode] = useState<'periodo' | 'rota' | 'cliente'>(
    'rota',
  )
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  const [projectionsData, setProjectionsData] = useState<ProjectionReportRow[]>(
    [],
  )
  const [projectionsLoading, setProjectionsLoading] = useState(false)

  const [reprintingId, setReprintingId] = useState<number | null>(null)
  const [editingPaymentOrder, setEditingPaymentOrder] =
    useState<SettlementSummary | null>(null)
  const [pendingEditOrderId, setPendingEditOrderId] = useState<number | null>(
    null,
  )
  const [hasInitializedEmployee, setHasInitializedEmployee] = useState(false)

  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (filterMode === 'cliente') {
      setSelectedEmployeeId('todos')
    }
  }, [filterMode])

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        const activeRoute = allRoutes.find((r) => !r.data_fim) || allRoutes[0]
        setSelectedRouteId(activeRoute.id.toString())
      }
      return allRoutes
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar lista de rotas.',
        variant: 'destructive',
      })
      return []
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data } = await employeesService.getEmployees(1, 100)
      setEmployees(data)
    } catch (error) {
      console.error('Failed to fetch employees', error)
    }
  }

  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true)
      try {
        let settlements: SettlementSummary[] = []
        if (filterMode === 'rota' && selectedRouteId) {
          const route = routes.find((r) => r.id.toString() === selectedRouteId)
          if (route) {
            settlements = await resumoAcertosService.getSettlements({
              rota: route,
            })
          }
        } else if (
          filterMode === 'periodo' &&
          dateRange?.from &&
          dateRange?.to
        ) {
          settlements = await resumoAcertosService.getSettlements({
            startDate: format(dateRange.from, 'yyyy-MM-dd'),
            endDate: format(dateRange.to, 'yyyy-MM-dd'),
          })
        } else if (filterMode === 'cliente' && selectedClientId) {
          const parsedId = parseInt(selectedClientId)
          if (!isNaN(parsedId)) {
            settlements = await resumoAcertosService.getSettlements({
              clientId: parsedId,
            })
          }
        }
        setData(settlements)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar o resumo de acertos.',
          variant: 'destructive',
        })
      } finally {
        if (!isBackground) setLoading(false)
      }
    },
    [routes, selectedRouteId, filterMode, dateRange, selectedClientId, toast],
  )

  useEffect(() => {
    const channel = supabase
      .channel('resumo-acertos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BANCO_DE_DADOS' },
        () => {
          fetchData(true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'RECEBIMENTOS' },
        () => {
          fetchData(true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ROTA' },
        () => {
          fetchRoutes().then(() => fetchData(true))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  useEffect(() => {
    fetchRoutes()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (
      loggedInUser &&
      !hasInitializedEmployee &&
      selectedEmployeeId === 'todos' &&
      filterMode !== 'cliente'
    ) {
      const allowedSectors = ['Administrador', 'Gerente']
      const userSectors = Array.isArray(loggedInUser.setor)
        ? loggedInUser.setor
        : [loggedInUser.setor]
      if (!userSectors.some((s) => allowedSectors.includes(s || ''))) {
        setSelectedEmployeeId(loggedInUser.id.toString())
      }
      setHasInitializedEmployee(true)
    }
  }, [loggedInUser, filterMode, hasInitializedEmployee, selectedEmployeeId])

  useEffect(() => {
    if (filterMode === 'rota' && selectedRouteId && routes.length > 0) {
      fetchData()
    } else if (filterMode === 'periodo' && dateRange?.from && dateRange?.to) {
      fetchData()
    } else if (filterMode === 'cliente' && selectedClientId) {
      fetchData()
    }
  }, [filterMode, selectedRouteId, dateRange, routes, fetchData])

  useEffect(() => {
    const fetchProjections = async () => {
      if (data.length === 0) {
        setProjectionsData([])
        return
      }
      setProjectionsLoading(true)
      try {
        const uniqueClientIds = Array.from(
          new Set(data.map((d) => d.clientCode)),
        )
        if (uniqueClientIds.length > 0) {
          const projs =
            await reportsService.getProjectionsReport(uniqueClientIds)
          setProjectionsData(projs)
        } else {
          setProjectionsData([])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setProjectionsLoading(false)
      }
    }
    fetchProjections()
  }, [data])

  const handleLocateOrder = async () => {
    if (!orderNumberFilter) {
      toast({
        title: 'Atenção',
        description: 'Digite um número de pedido',
        variant: 'destructive',
      })
      return
    }
    const orderId = parseInt(orderNumberFilter, 10)
    if (isNaN(orderId)) return

    try {
      const routeId = await resumoAcertosService.getRouteIdForOrder(orderId)
      if (routeId) {
        setFilterMode('rota')
        setSelectedRouteId(routeId.toString())
        setSelectedEmployeeId('todos') // Auto reset employee filter
        setHasInitializedEmployee(true) // prevent override
        toast({
          title: 'Pedido localizado',
          description: `Pedido encontrado na Rota #${routeId}`,
        })
      } else {
        toast({
          title: 'Não encontrado',
          description: 'Não foi possível localizar a rota deste pedido',
          variant: 'destructive',
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const locateOrderId = params.get('locateOrder')
    const shouldEditPayment = params.get('editPayment') === 'true'

    if (locateOrderId) {
      setOrderNumberFilter(locateOrderId)
      resumoAcertosService
        .getRouteIdForOrder(parseInt(locateOrderId, 10))
        .then((routeId) => {
          if (routeId) {
            setFilterMode('rota')
            setSelectedRouteId(routeId.toString())
            setSelectedEmployeeId('todos') // Auto reset employee filter
            setHasInitializedEmployee(true) // prevent override
            if (shouldEditPayment) {
              setPendingEditOrderId(parseInt(locateOrderId, 10))
            }
            const newUrl =
              window.location.protocol +
              '//' +
              window.location.host +
              window.location.pathname
            window.history.replaceState({ path: newUrl }, '', newUrl)
          }
        })
    }
  }, [])

  useEffect(() => {
    if (pendingEditOrderId && data.length > 0) {
      const order = data.find((d) => d.orderId === pendingEditOrderId)
      if (order) {
        setEditingPaymentOrder(order)
        setPendingEditOrderId(null)
      }
    }
  }, [data, pendingEditOrderId])

  const handleReprint = async (orderId: number) => {
    setReprintingId(orderId)
    try {
      const pdfBlob = await acertoService.reprintOrder(
        orderId,
        loggedInUser?.nome_completo,
        '80mm',
      )

      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
      a.download = `Pedido_${orderId}_${timestamp}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({
        title: 'Download Iniciado',
        description: 'O arquivo PDF (80mm) está sendo baixado.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível reimprimir o documento.',
        variant: 'destructive',
      })
    } finally {
      setReprintingId(null)
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (
      !confirm(
        `Esta ação é irreversível e apagará todos os dados relacionados ao pedido. Deseja continuar?`,
      )
    ) {
      return
    }

    try {
      const { error } = await supabase.rpc('delete_full_order', {
        p_order_id: orderId,
      })
      if (error) throw error
      toast({
        title: 'Sucesso',
        description: 'Pedido excluído com sucesso.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      fetchData()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Erro inesperado.',
        variant: 'destructive',
      })
    }
  }

  const filteredData = useMemo(() => {
    let result = data
    if (selectedEmployeeId !== 'todos') {
      result = result.filter(
        (item) => item.employeeId?.toString() === selectedEmployeeId,
      )
    }
    if (clientSearchFilter) {
      const searchLower = clientSearchFilter.toLowerCase()
      result = result.filter(
        (item) =>
          item.clientName.toLowerCase().includes(searchLower) ||
          item.clientCode.toString().includes(searchLower),
      )
    }
    if (orderNumberFilter) {
      result = result.filter((item) =>
        item.orderId.toString().includes(orderNumberFilter),
      )
    }
    return result
  }, [data, selectedEmployeeId, clientSearchFilter, orderNumberFilter])

  const filteredProjections = useMemo(() => {
    const allowedClientIds = new Set(filteredData.map((d) => d.clientCode))
    return projectionsData.filter((p) => allowedClientIds.has(p.clientCode))
  }, [projectionsData, filteredData])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  const totalVendas = filteredData.reduce(
    (acc, curr) => acc + curr.totalSalesValue,
    0,
  )
  const totalDescontos = filteredData.reduce(
    (acc, curr) => acc + curr.totalDiscount,
    0,
  )
  const percentualDesconto =
    totalVendas > 0 ? (totalDescontos / totalVendas) * 100 : 0
  const totalPago = filteredData.reduce((acc, curr) => acc + curr.totalPaid, 0)
  const totalReceber = filteredData.reduce(
    (acc, curr) => acc + curr.valorDevido,
    0,
  )
  const totalAcertos = filteredData.length

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Resumo de Acertos
            </h1>
            <p className="text-muted-foreground">
              Monitoramento consolidado e controle de rotas e histórico em tempo
              real.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4 text-blue-600" />
                Modo de Filtro
              </div>
              <Select
                value={filterMode}
                onValueChange={(val: any) => setFilterMode(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rota">Por Rota</SelectItem>
                  <SelectItem value="periodo">Por Período</SelectItem>
                  <SelectItem value="cliente">
                    Por Cliente (Histórico)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterMode === 'rota' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapIcon className="h-4 w-4 text-blue-600" />
                  Seletor de Rota
                </div>
                <Select
                  value={selectedRouteId}
                  onValueChange={setSelectedRouteId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a rota" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id.toString()}>
                        Rota #{route.id} (
                        {safeFormatDate(route.data_inicio, 'dd/MM')}
                        {route.data_fim
                          ? ` - ${safeFormatDate(route.data_fim, 'dd/MM')}`
                          : ' - Atual'}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : filterMode === 'periodo' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  Período
                </div>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-blue-600" />
                  Código do Cliente
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 2874"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    className="w-full bg-background"
                  />
                  <Button onClick={() => fetchData()} variant="secondary">
                    Buscar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-blue-600" />
                Filtrar por Funcionário
              </div>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os funcionários</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4 text-blue-600" />
                Cliente (Nome ou Cód.)
              </div>
              <Input
                placeholder="Nome ou código..."
                value={clientSearchFilter}
                onChange={(e) => setClientSearchFilter(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Hash className="h-4 w-4 text-blue-600" />
                Filtrar por Pedido
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Número..."
                  value={orderNumberFilter}
                  onChange={(e) => setOrderNumberFilter(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLocateOrder()}
                  className="bg-background w-full"
                />
                <Button
                  onClick={handleLocateOrder}
                  variant="secondary"
                  title="Localizar Rota"
                >
                  Localizar
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filterMode === 'rota' && selectedRoute ? (
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Início:</span>
                <span className="font-medium">
                  {safeFormatDate(selectedRoute.data_inicio)}
                </span>
              </div>
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Fim:</span>
                <span className="font-medium">
                  {selectedRoute.data_fim
                    ? safeFormatDate(selectedRoute.data_fim)
                    : 'Em andamento'}
                </span>
              </div>
            </div>
          ) : filterMode === 'rota' && !selectedRoute ? (
            <div className="text-amber-600 font-medium">
              Nenhuma rota encontrada.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Venda Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalVendas)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor bruto de vendas
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Desconto Total
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">
                R$ {formatCurrency(totalDescontos)}
              </div>
              <div className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {percentualDesconto.toFixed(2)}%
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Descontos aplicados
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-green-200 bg-green-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Valor Pago Total
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalPago)}
            </div>
            <p className="text-xs text-green-600/80">
              Recebimentos confirmados
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Valor a Receber
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(totalReceber)}
            </div>
            <p className="text-xs text-blue-600/80">Pendências do filtro</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-purple-200 bg-purple-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total de Acertos
            </CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {totalAcertos}
            </div>
            <p className="text-xs text-purple-600/80">Acertos realizados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="acertos" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="acertos" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Detalhamento de Acertos
            </TabsTrigger>
            <TabsTrigger value="projecoes" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projeções e Média
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="acertos" className="mt-0 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Detalhamento de Acertos
                </CardTitle>
                <Badge variant="secondary">
                  {filteredData.length} Registros
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">Pedido</TableHead>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead className="w-[80px]">Cód. Cli</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Vl. Venda</TableHead>
                      <TableHead>Pagto (BD)</TableHead>
                      <TableHead>Pagto (Receb.)</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead className="text-center w-[120px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          Carregando dados...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-32 text-center text-muted-foreground"
                        >
                          Nenhum acerto encontrado para o filtro atual.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((row) => (
                        <TableRow
                          key={row.orderId}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="font-mono font-medium text-blue-600">
                            #{row.orderId}
                          </TableCell>
                          <TableCell className="text-xs">
                            {safeFormatDate(row.acertoDate, 'dd/MM/yy')}
                            <span className="block text-[10px] text-muted-foreground">
                              {row.acertoTime.substring(0, 5)}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-sm truncate max-w-[150px]"
                            title={row.employee}
                          >
                            {row.employee}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-center">
                            {row.clientCode}
                          </TableCell>
                          <TableCell
                            className="font-medium text-sm truncate max-w-[200px]"
                            title={row.clientName}
                          >
                            {row.clientName}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {formatCurrency(row.totalSalesValue)}
                          </TableCell>
                          <TableCell
                            className="text-xs text-muted-foreground truncate max-w-[120px]"
                            title={row.paymentFormsBD}
                          >
                            {row.paymentFormsBD || '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.payments.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {row.payments.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded border border-muted bg-muted/50 whitespace-nowrap w-fit"
                                  >
                                    {p.method}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            R$ {formatCurrency(row.totalPaid)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                onClick={() =>
                                  navigate(`/acerto?editOrderId=${row.orderId}`)
                                }
                                title="Editar Pedido"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                onClick={() => setEditingPaymentOrder(row)}
                                title="Editar Pagamento"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => handleReprint(row.orderId)}
                                disabled={reprintingId === row.orderId}
                                title="Reimprimir Pedido (80mm)"
                              >
                                {reprintingId === row.orderId ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Printer className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleDeleteOrder(row.orderId)}
                                title="Excluir Pedido Permanentemente"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projecoes" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Projeções e Média (Histórico Completo)
                </CardTitle>
                <Badge variant="secondary">
                  {filteredProjections.length} Registros Avaliados
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Este cálculo utiliza todo o histórico disponível do cliente para
                gerar uma projeção de compra mais precisa.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[100px]">Pedido</TableHead>
                      <TableHead className="w-[120px]">Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Vl. Venda</TableHead>
                      <TableHead className="text-center">
                        Int. entre Pedidos
                      </TableHead>
                      <TableHead className="text-center">
                        Int. Médio Global
                      </TableHead>
                      <TableHead className="text-right">
                        Média Mensal Global
                      </TableHead>
                      <TableHead className="text-right">
                        Projeção (Hoje)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectionsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          Calculando projeções e médias...
                        </TableCell>
                      </TableRow>
                    ) : filteredProjections.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-32 text-center text-muted-foreground"
                        >
                          Nenhum histórico encontrado para projeção com o filtro
                          atual.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProjections.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-medium text-blue-600">
                            {row.orderId < 0 ? 'Saldo Ini.' : `#${row.orderId}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {safeFormatDate(row.orderDate, 'dd/MM/yy')}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {row.clientName}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {formatCurrency(row.totalValue)}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {row.daysBetweenOrders !== null
                              ? `${row.daysBetweenOrders} dias`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {row.indexDays !== null
                              ? `${row.indexDays.toFixed(1)} dias`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            R$ {formatCurrency(row.monthlyAverage || 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            R$ {formatCurrency(row.projection || 0)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingPaymentOrder && (
        <EditPaymentDialog
          open={!!editingPaymentOrder}
          onOpenChange={(open) => !open && setEditingPaymentOrder(null)}
          order={editingPaymentOrder}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  )
}
