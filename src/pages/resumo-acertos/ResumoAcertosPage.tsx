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
import {
  resumoAcertosService,
  SettlementSummary,
} from '@/services/resumoAcertosService'
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
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Rota } from '@/types/rota'
import { Employee } from '@/types/employee'
import { employeesService } from '@/services/employeesService'
import { useUserStore } from '@/stores/useUserStore'
import { supabase } from '@/lib/supabase/client'
import { acertoService } from '@/services/acertoService'
import { format } from 'date-fns'
import { EditPaymentDialog } from '@/components/resumo-acertos/EditPaymentDialog'

export default function ResumoAcertosPage() {
  const { employee: loggedInUser } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [data, setData] = useState<SettlementSummary[]>([])

  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('todos')

  const [reprintingId, setReprintingId] = useState<number | null>(null)
  const [editingPaymentOrder, setEditingPaymentOrder] =
    useState<SettlementSummary | null>(null)

  const { toast } = useToast()
  const navigate = useNavigate()

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(allRoutes[0].id.toString())
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
    async (routeId: string, isBackground = false) => {
      if (!routeId) return
      if (!isBackground) setLoading(true)
      try {
        const route = routes.find((r) => r.id.toString() === routeId)
        if (route) {
          const settlements = await resumoAcertosService.getSettlements(route)
          setData(settlements)
        }
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
    [routes, toast],
  )

  useEffect(() => {
    if (!selectedRouteId) return

    const channel = supabase
      .channel('resumo-acertos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BANCO_DE_DADOS' },
        () => {
          fetchData(selectedRouteId, true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'RECEBIMENTOS' },
        () => {
          fetchData(selectedRouteId, true)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ROTA' },
        () => {
          fetchRoutes().then(() => fetchData(selectedRouteId, true))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRouteId, fetchData])

  useEffect(() => {
    fetchRoutes()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (loggedInUser && selectedEmployeeId === 'todos') {
      setSelectedEmployeeId(loggedInUser.id.toString())
    }
  }, [loggedInUser])

  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      fetchData(selectedRouteId)
    }
  }, [selectedRouteId, routes, fetchData])

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

  const filteredData = useMemo(() => {
    if (selectedEmployeeId === 'todos') return data
    return data.filter(
      (item) => item.employeeId?.toString() === selectedEmployeeId,
    )
  }, [data, selectedEmployeeId])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  const totalVendas = filteredData.reduce(
    (acc, curr) => acc + curr.totalSalesValue,
    0,
  )
  const totalDescontos = filteredData.reduce(
    (acc, curr) => acc + curr.totalDiscount,
    0,
  )
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
              Monitoramento consolidado e controle de rotas em tempo real.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <MapIcon className="h-5 w-5 text-blue-600" />
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

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-blue-600" />
                Filtrar por Funcionário
              </div>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
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
          </div>
        </CardHeader>
        <CardContent>
          {selectedRoute ? (
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
          ) : (
            <div className="text-amber-600 font-medium">
              Nenhuma rota encontrada.
            </div>
          )}
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
              {formatCurrency(totalVendas)}
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
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDescontos)}
            </div>
            <p className="text-xs text-muted-foreground">Descontos aplicados</p>
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
              {formatCurrency(totalPago)}
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
              {formatCurrency(totalReceber)}
            </div>
            <p className="text-xs text-blue-600/80">Pendências da rota</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-purple-200 bg-purple-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">
              Total de Acertos Realizados
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhamento de Acertos
            </CardTitle>
            <Badge variant="secondary">{filteredData.length} Registros</Badge>
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
                  <TableHead className="text-center w-[120px]">Ações</TableHead>
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
                      Nenhum acerto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.orderId} className="hover:bg-muted/30">
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

      {editingPaymentOrder && (
        <EditPaymentDialog
          open={!!editingPaymentOrder}
          onOpenChange={(open) => !open && setEditingPaymentOrder(null)}
          order={editingPaymentOrder}
          onSuccess={() => fetchData(selectedRouteId)}
        />
      )}
    </div>
  )
}
