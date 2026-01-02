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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  resumoAcertosService,
  SettlementSummary,
} from '@/services/resumoAcertosService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Loader2,
  RefreshCw,
  Map as MapIcon,
  Calendar,
  DollarSign,
  ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export default function ResumoAcertosPage() {
  const [loading, setLoading] = useState(true)
  const [routeInfo, setRouteInfo] = useState<any>(null)
  const [data, setData] = useState<SettlementSummary[]>([])
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const route = await resumoAcertosService.getLatestRoute()
      setRouteInfo(route)

      if (route && route.data_inicio) {
        // Pass data_fim if available to filter properly
        const settlements = await resumoAcertosService.getSettlements(
          route.data_inicio,
          route.data_fim,
        )
        setData(settlements)
      } else {
        setData([])
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

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const formatSimpleDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

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
              Monitoramento consolidado da rota atual.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapIcon className="h-5 w-5 text-blue-600" />
            Informações da Rota Atual (ID Máximo)
          </CardTitle>
          <CardDescription>
            Detalhes da rota mais recente registrada no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !routeInfo ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando rota...
            </div>
          ) : routeInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-sm font-medium text-muted-foreground block">
                  ID Rota
                </span>
                <span className="text-2xl font-bold font-mono">
                  #{routeInfo.id}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground block mb-1">
                  Data de Início
                </span>
                <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5 w-fit">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium">
                    {formatDate(routeInfo.data_inicio)}
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
                    {routeInfo.data_fim
                      ? formatDate(routeInfo.data_fim)
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Acertos e Recebimentos</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {data.length} Registros
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Pedido</TableHead>
                  <TableHead className="w-[100px]">Data Acerto</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="w-[80px]">Cód. Cli</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Vl. Venda Prod.</TableHead>
                  <TableHead>Forma de Pagamento</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      Carregando dados...
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                        {formatSimpleDate(row.acertoDate)}
                        <span className="block text-[10px] text-muted-foreground">
                          {row.acertoTime}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{row.employee}</TableCell>
                      <TableCell className="font-mono text-xs text-center">
                        {row.clientCode}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {row.clientName}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {formatCurrency(row.totalSalesValue)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.payments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {row.payments.map((p, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded border border-muted bg-muted/50 whitespace-nowrap"
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
                        <div className="flex items-center justify-end gap-1">
                          {row.totalPaid > 0 && (
                            <DollarSign className="h-3 w-3" />
                          )}
                          R$ {formatCurrency(row.totalPaid)}
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
    </div>
  )
}
