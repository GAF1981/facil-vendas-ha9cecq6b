import { useEffect, useState } from 'react'
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
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { Rota } from '@/types/rota'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ResumoAcertosPage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [data, setData] = useState<SettlementSummary[]>([])
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const { toast } = useToast()

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        // Select latest by default
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

  const fetchData = async (routeId: string) => {
    if (!routeId) return
    setLoading(true)
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
      setLoading(false)
    }
  }

  // Initial Load
  useEffect(() => {
    fetchRoutes()
  }, [])

  // Fetch data when selection changes
  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      fetchData(selectedRouteId)
    }
  }, [selectedRouteId, routes])

  const handleFinishRoute = async () => {
    setFinishing(true)
    try {
      const currentRoute = routes.find(
        (r) => r.id.toString() === selectedRouteId,
      )
      if (!currentRoute) return

      const newRoute = await resumoAcertosService.finishAndStartNewRoute(
        currentRoute.id,
      )

      toast({
        title: 'Rota Finalizada',
        description: `Rota #${currentRoute.id} fechada. Nova rota #${newRoute.id} iniciada.`,
        className: 'bg-green-600 text-white',
      })

      // Refresh everything
      const updatedRoutes = await fetchRoutes()
      if (updatedRoutes.length > 0) {
        setSelectedRouteId(updatedRoutes[0].id.toString())
      }
      setShowFinishDialog(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a rota.',
        variant: 'destructive',
      })
    } finally {
      setFinishing(false)
    }
  }

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)
  const isLatestRoute = routes.length > 0 && selectedRoute?.id === routes[0].id
  const isRouteOpen = selectedRoute && !selectedRoute.data_fim

  // Financial Totals
  const totalVendas = data.reduce((acc, curr) => acc + curr.totalSalesValue, 0)
  const totalDescontos = data.reduce((acc, curr) => acc + curr.totalDiscount, 0)
  const totalPago = data.reduce((acc, curr) => acc + curr.totalPaid, 0)
  const totalReceber = data.reduce((acc, curr) => acc + curr.valorDevido, 0)

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
              Monitoramento consolidado e controle de rotas.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchData(selectedRouteId)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          {isLatestRoute && isRouteOpen && (
            <Button
              variant="destructive"
              onClick={() => setShowFinishDialog(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Finalizar Rota
            </Button>
          )}
        </div>
      </div>

      {/* Header & Route Selector */}
      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-blue-600" />
                Seletor de Rota
              </CardTitle>
              <CardDescription>
                Selecione uma rota para visualizar o histórico financeiro.
              </CardDescription>
            </div>
            <div className="w-full md:w-[300px]">
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
          </div>
        </CardHeader>
        <CardContent>
          {selectedRoute ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground block">
                  ID Rota
                </span>
                <span className="text-2xl font-bold font-mono">
                  #{selectedRoute.id}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block mb-1">
                  Data de Início
                </span>
                <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 w-fit">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {safeFormatDate(selectedRoute.data_inicio)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block mb-1">
                  Data de Fim
                </span>
                <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 w-fit">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="font-medium">
                    {selectedRoute.data_fim
                      ? safeFormatDate(selectedRoute.data_fim)
                      : 'Em andamento'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-amber-600 font-medium">
              Nenhuma rota encontrada.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Totalizers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhamento de Acertos
            </CardTitle>
            <Badge variant="secondary">{data.length} Registros</Badge>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-muted-foreground"
                    >
                      Nenhum acerto encontrado para esta rota.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Rota Atual?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá fechar a rota atual #{selectedRoute?.id} e iniciar
              automaticamente uma nova rota.
              <br />
              <br />
              Certifique-se de que todos os acertos do período foram lançados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFinishRoute}
              disabled={finishing}
              className="bg-red-600 hover:bg-red-700"
            >
              {finishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                  Finalizando...
                </>
              ) : (
                'Sim, Finalizar e Iniciar Nova'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
