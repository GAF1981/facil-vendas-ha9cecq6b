import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  resumoAcertosService,
  SettlementSummary,
} from '@/services/resumoAcertosService'
import { reportsService, ProjectionReportRow } from '@/services/reportsService'
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { Rota } from '@/types/rota'
import { Employee } from '@/types/employee'
import { employeesService } from '@/services/employeesService'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { acertoService } from '@/services/acertoService'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { EditPaymentDialog } from '@/components/resumo-acertos/EditPaymentDialog'
import { DateRange } from 'react-day-picker'
import { ResumoAcertosFilters } from '@/components/resumo-acertos/ResumoAcertosFilters'
import { ResumoAcertosCards } from '@/components/resumo-acertos/ResumoAcertosCards'
import { ResumoAcertosTable } from '@/components/resumo-acertos/ResumoAcertosTable'
import { ResumoAcertosProjectionsTable } from '@/components/resumo-acertos/ResumoAcertosProjectionsTable'

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
      setSelectedEmployeeId(loggedInUser.id.toString())
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
    if (
      data.length > 0 &&
      selectedEmployeeId !== 'todos' &&
      loggedInUser &&
      selectedEmployeeId === loggedInUser.id.toString()
    ) {
      const hasMine = data.some(
        (s) =>
          s.employeeId?.toString() === selectedEmployeeId ||
          s.employee === loggedInUser.nome_completo,
      )
      if (!hasMine) {
        setSelectedEmployeeId('todos')
      }
    }
  }, [data, selectedEmployeeId, loggedInUser])

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
        setSelectedEmployeeId('todos')
        setHasInitializedEmployee(true)
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
            setSelectedEmployeeId('todos')
            setHasInitializedEmployee(true)
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
        (item) =>
          item.employeeId?.toString() === selectedEmployeeId ||
          item.employee ===
            employees.find((e) => e.id.toString() === selectedEmployeeId)
              ?.nome_completo,
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
  }, [
    data,
    selectedEmployeeId,
    clientSearchFilter,
    orderNumberFilter,
    employees,
  ])

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
    <div className="animate-fade-in space-y-6 p-2 pb-20 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
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
            <div className="animate-pulse flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Atualizando...
            </div>
          )}
        </div>
      </div>

      <ResumoAcertosFilters
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        selectedRouteId={selectedRouteId}
        setSelectedRouteId={setSelectedRouteId}
        routes={routes}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedEmployeeId={selectedEmployeeId}
        setSelectedEmployeeId={setSelectedEmployeeId}
        employees={employees}
        clientSearchFilter={clientSearchFilter}
        setClientSearchFilter={setClientSearchFilter}
        orderNumberFilter={orderNumberFilter}
        setOrderNumberFilter={setOrderNumberFilter}
        handleLocateOrder={handleLocateOrder}
        fetchData={() => fetchData()}
        selectedRoute={selectedRoute}
      />

      <ResumoAcertosCards
        totalVendas={totalVendas}
        totalDescontos={totalDescontos}
        percentualDesconto={percentualDesconto}
        totalPago={totalPago}
        totalReceber={totalReceber}
        totalAcertos={totalAcertos}
      />

      <Tabs defaultValue="acertos" className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
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
              <div className="flex items-center justify-between">
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
              <ResumoAcertosTable
                loading={loading && data.length === 0}
                data={filteredData}
                onEditPayment={(order) => setEditingPaymentOrder(order)}
                onReprint={handleReprint}
                onDelete={handleDeleteOrder}
                reprintingId={reprintingId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projecoes" className="mt-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Projeções e Média (Histórico Completo)
                </CardTitle>
                <Badge variant="secondary">
                  {filteredProjections.length} Registros Avaliados
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Este cálculo utiliza todo o histórico disponível do cliente para
                gerar uma projeção de compra mais precisa.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <ResumoAcertosProjectionsTable
                loading={projectionsLoading}
                data={filteredProjections}
              />
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
