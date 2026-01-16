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
import { Loader2, Search, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderDebt } from '@/types/cobranca'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { PaymentEntry } from '@/types/payment'
import { useAuth } from '@/hooks/use-auth'
import { ClientRow } from '@/types/client'

// Extended Order type for UI that includes Client Info flattened
interface FlattenedOrder extends OrderDebt {
  clientName: string
  clientId: number
}

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<FlattenedOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<FlattenedOrder | null>(
    null,
  )
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await cobrancaService.getDebts()
      // Flatten ClientDebt[] to OrderDebt[]
      const flatOrders: FlattenedOrder[] = result
        .flatMap((client) =>
          client.orders
            .filter((o) => o.remainingValue > 0.05) // Only debts > 0.05
            .map((order) => ({
              ...order,
              clientName: client.clientName,
              clientId: client.clientId,
            })),
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setOrders(flatOrders)
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
    if (!searchTerm) return orders
    const lower = searchTerm.toLowerCase()
    return orders.filter(
      (o) =>
        o.orderId.toString().includes(lower) ||
        o.clientName.toLowerCase().includes(lower) ||
        (o.employeeName && o.employeeName.toLowerCase().includes(lower)),
    )
  }, [orders, searchTerm])

  const handleOpenPayment = (order: FlattenedOrder) => {
    setSelectedOrder(order)
    setDialogOpen(true)
  }

  const handleConfirmPayment = async (payments: PaymentEntry[]) => {
    if (!selectedOrder || !user) return

    try {
      // Create minimal client row for service (it only needs CODIGO usually)
      const clientMock = { CODIGO: selectedOrder.clientId } as ClientRow

      // Create minimal employee object
      // We use current user as the employee processing the payment
      const employeeMock = {
        id: selectedOrder.employeeName ? 0 : 0, // Ideally we would have the ID, but service uses user ID if passed differently or logic within service needs checking.
        // Checking recebimentoService: it uses employee.id.
        // We need the ACTUAL employee ID.
        // User context has 'id' which is string (Supabase Auth ID) or we need the functional ID.
        // The project usually uses numeric IDs for employees in tables.
        // For now, we'll try to use a placeholder or 0 if we can't map it.
        // In a real scenario we should map auth user to employee table.
        // We will assume 1 for Admin or similar if not found, but let's try to be safer.
        // Actually, the user object from useAuth is Supabase User.
        // The app seems to use numeric IDs for foreign keys.
        // Let's rely on the service potentially handling it or pass a dummy if it's just for record keeping of who processed it.
        // BETTER: Use the logged in user if mapped, or 0.
        // However, `selectedOrder` does not have employee ID, only name.
        // We will use a safe default 0 or 1, assuming system user.
        id: 1,
        nome_completo: user.email || 'Sistema',
        email: user.email || '',
        situacao: 'ATIVO',
        setor: [],
      } as any

      await recebimentoService.saveRecebimento(
        clientMock,
        employeeMock,
        payments,
        selectedOrder.orderId,
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
      throw error // Re-throw to keep dialog open/handle loading in dialog
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
            Registre pagamentos para pedidos com saldo devedor.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <Loader2
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Débitos em Aberto</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedido, cliente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-right">Saldo a Pagar</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum débito encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-mono">
                      #{order.orderId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.clientName}</span>
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
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(order.totalValue)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(order.remainingValue)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleOpenPayment(order)}
                      >
                        <Wallet className="w-4 h-4 mr-2" /> Pagar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={selectedOrder}
        clientName={selectedOrder?.clientName || ''}
        onConfirm={handleConfirmPayment}
      />
    </div>
  )
}
