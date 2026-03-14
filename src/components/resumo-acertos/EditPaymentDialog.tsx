import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import {
  SettlementSummary,
  resumoAcertosService,
} from '@/services/resumoAcertosService'
import { addDays, format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { PaymentEntradasList } from './PaymentEntradasList'
import { PaymentInstallmentsList } from './PaymentInstallmentsList'

interface EditPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: SettlementSummary | null
  onSuccess: () => void
}

export function EditPaymentDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: EditPaymentDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [installments, setInstallments] = useState<
    { id: string; method: string; value: string; dueDate: string }[]
  >([])
  const [splitCount, setSplitCount] = useState<string>('1')

  const [entradas, setEntradas] = useState<
    { id: string; method: string; value: string }[]
  >([])

  useEffect(() => {
    if (open && order) {
      const netValue = order.totalSalesValue - order.totalDiscount
      setInstallments([
        {
          id: Math.random().toString(),
          method: 'Dinheiro',
          value: netValue.toFixed(2),
          dueDate: format(new Date(), 'yyyy-MM-dd'),
        },
      ])
      setSplitCount('1')
      setEntradas([])
    }
  }, [open, order])

  const netValue = order ? order.totalSalesValue - order.totalDiscount : 0
  const entradaTotal = entradas.reduce(
    (acc, curr) => acc + (parseFloat(curr.value) || 0),
    0,
  )
  const remainingNetValue = Math.max(0, netValue - entradaTotal)

  const currentTotal = installments.reduce(
    (acc, curr) => acc + (parseFloat(curr.value) || 0),
    0,
  )
  const diff = remainingNetValue - currentTotal
  const hasValidAmount = entradaTotal <= netValue

  const handleSplit = (val: string) => {
    setSplitCount(val)
    const count = parseInt(val)
    if (isNaN(count) || count <= 0) return

    const splitValue = remainingNetValue / count
    const newInsts = Array.from({ length: count }).map((_, i) => ({
      id: Math.random().toString(),
      method: count > 1 ? 'Boleto' : 'Dinheiro',
      value: splitValue.toFixed(2),
      dueDate: format(addDays(new Date(), (i + 1) * 30), 'yyyy-MM-dd'),
    }))

    const sum = newInsts.reduce((a, b) => a + parseFloat(b.value), 0)
    if (sum !== remainingNetValue && newInsts.length > 0) {
      const lastVal = parseFloat(newInsts[newInsts.length - 1].value)
      newInsts[newInsts.length - 1].value = (
        lastVal +
        (remainingNetValue - sum)
      ).toFixed(2)
    }

    setInstallments(newInsts)
  }

  // Recalculate installments whenever entradas changes
  useEffect(() => {
    if (open && order) {
      handleSplit(splitCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entradas])

  const handleSave = async () => {
    if (!order) return

    if (entradaTotal > netValue) {
      toast({
        title: 'Valor inválido',
        description: `O valor das entradas não pode exceder o valor do pedido.`,
        variant: 'destructive',
      })
      return
    }

    if (Math.abs(diff) > 0.05) {
      toast({
        title: 'Valores não conferem',
        description: `A soma das parcelas deve ser igual ao valor restante.`,
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload: {
        method: string
        value: number
        dueDate: string
        paidValue?: number
      }[] = []

      entradas.forEach((e) => {
        const val = parseFloat(e.value) || 0
        if (val > 0) {
          payload.push({
            method: e.method,
            value: val,
            dueDate: format(new Date(), 'yyyy-MM-dd'),
            paidValue: val,
          })
        }
      })

      installments.forEach((i) => {
        payload.push({
          method: i.method,
          value: parseFloat(i.value) || 0,
          dueDate: i.dueDate,
          paidValue: 0,
        })
      })

      // The backend logic respects the original employee assigned to the order to maintain cash flow integrity.
      await resumoAcertosService.updateOrderPaymentTerms(order.orderId, payload)

      toast({
        title: 'Sucesso',
        description: 'Termos de pagamento atualizados com sucesso.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao atualizar pagamento',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhamento de Entrada</DialogTitle>
          <DialogDescription>
            Pedido #{order.orderId} • Total Devido:{' '}
            <strong className="text-foreground">
              R$ {formatCurrency(netValue)}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <PaymentEntradasList
            entradas={entradas}
            addEntrada={() =>
              setEntradas([
                ...entradas,
                { id: Math.random().toString(), method: 'Dinheiro', value: '' },
              ])
            }
            updateEntrada={(id, field, value) =>
              setEntradas(
                entradas.map((e) =>
                  e.id === id ? { ...e, [field]: value } : e,
                ),
              )
            }
            removeEntrada={(id) =>
              setEntradas(entradas.filter((e) => e.id !== id))
            }
            entradaTotal={entradaTotal}
            hasValidAmount={hasValidAmount}
          />

          <div className="flex items-center gap-4 border p-4 rounded-lg bg-muted/30">
            <div className="flex-1">
              <Label>Quantidade de Parcelas</Label>
              <Select value={splitCount} onValueChange={handleSplit}>
                <SelectTrigger className="mt-1.5 bg-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1x (Pagamento Único)</SelectItem>
                  <SelectItem value="2">2x Parcelas</SelectItem>
                  <SelectItem value="3">3x Parcelas</SelectItem>
                  <SelectItem value="4">4x Parcelas</SelectItem>
                  <SelectItem value="5">5x Parcelas</SelectItem>
                  <SelectItem value="6">6x Parcelas</SelectItem>
                  <SelectItem value="10">10x Parcelas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-none pt-6 text-sm text-muted-foreground text-right">
              Valor a Parcelar:
              <br />
              <strong className="text-foreground">
                R$ {formatCurrency(remainingNetValue)}
              </strong>
            </div>
          </div>

          <PaymentInstallmentsList
            installments={installments}
            addInstallment={() =>
              setInstallments([
                ...installments,
                {
                  id: Math.random().toString(),
                  method: 'Boleto',
                  value: '0.00',
                  dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                },
              ])
            }
            updateInstallment={(index, field, value) => {
              const newInsts = [...installments]
              newInsts[index] = { ...newInsts[index], [field]: value }
              setInstallments(newInsts)
            }}
            removeInstallment={(index) => {
              const newInsts = [...installments]
              newInsts.splice(index, 1)
              setInstallments(newInsts)
            }}
          />

          <div
            className={cn(
              'p-4 rounded-lg flex items-center justify-between border transition-colors',
              Math.abs(diff) <= 0.05
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-red-50 border-red-200 text-red-900',
            )}
          >
            <span className="font-semibold text-sm">Soma das Parcelas:</span>
            <div className="text-right">
              <div className="text-lg font-bold">
                R$ {formatCurrency(currentTotal)}
              </div>
              {Math.abs(diff) > 0.05 && (
                <div className="text-xs font-medium mt-0.5">
                  Diferença: R$ {formatCurrency(diff)}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || Math.abs(diff) > 0.05 || !hasValidAmount}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
