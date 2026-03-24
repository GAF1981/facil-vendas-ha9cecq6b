import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowDownCircle,
  ArrowLeft,
} from 'lucide-react'
import {
  confirmationService,
  ConfirmationRow,
} from '@/services/confirmationService'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'

export default function ConfirmacaoRecebimentosPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConfirmationRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await confirmationService.getConfirmationData()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar as confirmações pendentes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const lower = searchTerm.toLowerCase()
    return data.filter(
      (row) =>
        row.orderId.toString().includes(lower) ||
        row.clientCode.toString().includes(lower) ||
        row.employee.toLowerCase().includes(lower) ||
        row.pixDescription.toLowerCase().includes(lower),
    )
  }, [data, searchTerm])

  const handleConfirm = async (orderId: number) => {
    try {
      await confirmationService.confirmPayment(orderId, { pix: true })
      toast({
        title: 'Confirmado',
        description: `Recebimentos do pedido #${orderId} confirmados com sucesso.`,
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar os recebimentos.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Confirmação de Recebimentos
            </h1>
            <p className="text-muted-foreground">
              Pedidos com saldo restante e pagamentos em Pix aguardando
              confirmação.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pendentes de Confirmação</CardTitle>
          <CardDescription>
            Confirme os valores pagos nos pedidos listados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, funcionário..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cód. Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">A Pagar</TableHead>
                    <TableHead className="text-right">Registrado</TableHead>
                    <TableHead className="text-right">
                      Pago (Confirmado)
                    </TableHead>
                    <TableHead className="text-right text-red-600">
                      Restante
                    </TableHead>
                    <TableHead>Desc. Pix</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum pedido aguardando confirmação.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row) => (
                      <TableRow key={row.orderId} className="hover:bg-muted/30">
                        <TableCell className="text-sm">
                          {safeFormatDate(row.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          #{row.orderId}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.employee}
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {formatCurrency(row.amountToPay)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {formatCurrency(row.registeredAmount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          R$ {formatCurrency(row.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          R$ {formatCurrency(row.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          {row.pixDescription ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {row.pixDescription}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleConfirm(row.orderId)}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Confirmar Pagto
                          </Button>
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
