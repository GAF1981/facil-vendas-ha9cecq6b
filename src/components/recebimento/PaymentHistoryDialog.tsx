import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { recebimentoService } from '@/services/recebimentoService'
import { useUserStore } from '@/stores/useUserStore'
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

interface PaymentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number | null
  onUpdate: () => void
}

interface PaymentRecord {
  id: number
  method: string
  value: number // Valor Pago
  registeredValue: number
  date: string
  employeeName: string
  createdAt: string
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  orderId,
  onUpdate,
}: PaymentHistoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [paymentToReverse, setPaymentToReverse] =
    useState<PaymentRecord | null>(null)
  const [reversing, setReversing] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  useEffect(() => {
    if (open && orderId) {
      loadPayments(orderId)
    }
  }, [open, orderId])

  const loadPayments = async (id: number) => {
    setLoading(true)
    try {
      const data = await recebimentoService.getPaymentsForOrder(id)
      setPayments(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de pagamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReverseClick = (payment: PaymentRecord) => {
    setPaymentToReverse(payment)
  }

  const confirmReverse = async () => {
    if (!paymentToReverse || !orderId || !employee) return

    setReversing(true)
    try {
      await recebimentoService.reversePayment(
        paymentToReverse.id,
        orderId,
        employee.id,
        employee.nome_completo,
      )
      toast({
        title: 'Sucesso',
        description: 'Pagamento estornado com sucesso.',
        className: 'bg-green-600 text-white',
      })
      setPaymentToReverse(null)
      await loadPayments(orderId)
      onUpdate() // Refresh parent data
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao estornar pagamento.',
        variant: 'destructive',
      })
    } finally {
      setReversing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
            <DialogDescription>
              Pedido #{orderId} - Visualize e gerencie os pagamentos realizados.
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-md overflow-hidden mt-4">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right">Valor Registrado</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum pagamento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {safeFormatDate(p.date, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{p.method}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.employeeName}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(p.registeredValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-green-600">
                        {formatCurrency(p.value)}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.value > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleReverseClick(p)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Estornar
                          </Button>
                        )}
                        {p.value === 0 && (
                          <span className="text-xs text-muted-foreground italic">
                            Estornado
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!paymentToReverse}
        onOpenChange={(open) => !open && setPaymentToReverse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Estorno
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja estornar o pagamento de{' '}
              <span className="font-bold text-foreground">
                {paymentToReverse && formatCurrency(paymentToReverse.value)}
              </span>
              ?
              <br />
              Esta ação removerá o valor pago e retornará a dívida para o
              cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReverse}
              disabled={reversing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {reversing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
