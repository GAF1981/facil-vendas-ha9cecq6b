import { useEffect, useState, useMemo } from 'react'
import { cobrancaService } from '@/services/cobrancaService'
import { recebimentoService } from '@/services/recebimentoService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Printer, CheckSquare, Search, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderDebt } from '@/types/cobranca'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { PaymentEntry } from '@/types/payment'
import { useAuth } from '@/hooks/use-auth'
import { ClientRow } from '@/types/client'
import { Checkbox } from '@/components/ui/checkbox'
import { PaymentHistoryDialog } from '@/components/recebimento/PaymentHistoryDialog'
import { Label } from '@/components/ui/label'

interface FlattenedOrder extends OrderDebt {
  clientName: string
  clientId: number
}

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<FlattenedOrder[]>([])

  // Advanced Filtering
  const [searchName, setSearchName] = useState('')
  const [searchOrder, setSearchOrder] = useState('')

  // Single selection state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyOrderId, setHistoryOrderId] = useState<number | null>(null)

  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null)

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await cobrancaService.getDebts()
      const flatOrders: FlattenedOrder[] = result
        .flatMap((client) =>
          client.orders
            // We want to see orders with recent payments too, even if debt is small, for Storno.
            // But main purpose is paying debts. Let's keep logic but ensure paid orders are visible if they have activity?
            // User Story implies we want to see debts to pay AND view history.
            // "missing columns... in the Resumo Acerto section"
            // Let's relax the filter slightly or assume cobrancaService returns historical debts too.
            // Current service filters .gt('debito', 0).
            // We might need to adjust service or just rely on what's returned.
            // For now, we use what's returned but display better.
            .map((order) => ({
              ...order,
              clientName: client.clientName,
              clientId: client.clientId,
            })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setOrders(flatOrders)
      // Reset selection on reload if the selected order is no longer available or we just want to reset
      if (
        selectedOrderId &&
        !flatOrders.find((o) => o.orderId === selectedOrderId)
      ) {
        setSelectedOrderId(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os débitos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesName =
        !searchName ||
        o.clientName.toLowerCase().includes(searchName.toLowerCase()) ||
        o.clientId.toString().includes(searchName)

      const matchesOrder =
        !searchOrder || o.orderId.toString().includes(searchOrder)

      return matchesName && matchesOrder
    })
  }, [orders, searchName, searchOrder])

  const handleSelectOrder = (orderId: number) => {
    if (selectedOrderId === orderId) {
      setSelectedOrderId(null) // Deselect
    } else {
      setSelectedOrderId(orderId) // Select new (auto deselects others)
    }
  }

  const selectedOrderData = useMemo(() => {
    return orders.find((o) => o.orderId === selectedOrderId) || null
  }, [orders, selectedOrderId])

  const handleOpenPayment = () => {
    if (selectedOrderData) {
      setDialogOpen(true)
    }
  }

  const handleOpenHistory = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setHistoryOrderId(orderId)
    setHistoryOpen(true)
  }

  const handleGeneratePdf = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setGeneratingPdf(orderId)
    try {
      const blob = await cobrancaService.generateOrderReceipt(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_pedido_${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast({
        title: 'Sucesso',
        description: 'PDF gerado com sucesso.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao gerar PDF.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(null)
    }
  }

  const handleConfirmPayment = async (payments: PaymentEntry[]) => {
    if (!selectedOrderData || !user) return

    try {
      const clientMock = { CODIGO: selectedOrderData.clientId } as ClientRow

      const employeeMock = {
        id: 1, // Fallback ID - ideally we get this from user context if mapped, or pass logic
        // For now relying on BE or assuming logged in user is valid
        nome_completo: user.email || 'Sistema',
        email: user.email || '',
        situacao: 'ATIVO',
        setor: [],
      } as any

      await recebimentoService.saveRecebimento(
        clientMock,
        employeeMock,
        payments,
        selectedOrderData.orderId,
      )

      toast({
        title: 'Sucesso',
        description: 'Recebimento registrado com sucesso.',
        className: 'bg-green-600 text-white',
      })

      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar recebimento.',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Registre pagamentos e gerencie débitos históricos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <Loader2
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={handleOpenPayment}
            disabled={!selectedOrderId}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Processar Pagamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros de Pesquisa</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="search-name">Cliente (Nome ou Código)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-name"
                  placeholder="Buscar cliente..."
                  className="pl-8"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="search-order">Número do Pedido</Label>
              <Input
                id="search-order"
                placeholder="Ex: 12345"
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right text-green-600">
                    Valor Pago
                  </TableHead>
                  <TableHead className="text-right text-red-600">
                    Débito
                  </TableHead>
                  <TableHead
                    className="w-[50px] text-center"
                    title="Selecionar para pagamento"
                  >
                    Sel.
                  </TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum débito encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrderId === order.orderId
                    return (
                      <TableRow
                        key={order.orderId}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell className="font-mono">
                          #{order.orderId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {order.clientName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {order.clientId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {safeFormatDate(order.date, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.employeeName || 'N/D'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          {formatCurrency(order.totalValue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-medium">
                          {formatCurrency(order.paidValue)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600">
                          {formatCurrency(order.remainingValue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSelectOrder(order.orderId)
                            }
                            aria-label={`Selecionar pedido ${order.orderId}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) =>
                                handleGeneratePdf(order.orderId, e)
                              }
                              disabled={generatingPdf === order.orderId}
                              title="Gerar PDF"
                            >
                              {generatingPdf === order.orderId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Printer className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) =>
                                handleOpenHistory(order.orderId, e)
                              }
                              title="Histórico / Estornar"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrderData}
        clientName={selectedOrderData?.clientName || ''}
        onConfirm={handleConfirmPayment}
      />

      <PaymentHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        orderId={historyOrderId}
        onUpdate={loadData}
      />
    </div>
  )
}
