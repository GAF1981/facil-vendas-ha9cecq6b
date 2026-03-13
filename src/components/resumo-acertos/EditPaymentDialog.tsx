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
import { Input } from '@/components/ui/input'
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
import { PAYMENT_METHODS } from '@/types/payment'
import { addDays, format } from 'date-fns'
import { Loader2, Plus, Trash2, CalendarDays } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/useUserStore'

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
  const { employee: loggedInUser } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [installments, setInstallments] = useState<
    { id: string; method: string; value: string; dueDate: string }[]
  >([])
  const [splitCount, setSplitCount] = useState<string>('1')

  const [entradaValue, setEntradaValue] = useState<string>('')
  const [entradaMethod, setEntradaMethod] = useState<string>('Dinheiro')

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
      setEntradaValue('')
      setEntradaMethod('Dinheiro')
    }
  }, [open, order])

  const netValue = order ? order.totalSalesValue - order.totalDiscount : 0
  const entrada = parseFloat(entradaValue) || 0
  const remainingNetValue = Math.max(0, netValue - entrada)

  const currentTotal = installments.reduce(
    (acc, curr) => acc + (parseFloat(curr.value) || 0),
    0,
  )
  const diff = remainingNetValue - currentTotal

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

  useEffect(() => {
    if (open && order) {
      handleSplit(splitCount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entradaValue])

  const updateInstallment = (index: number, field: string, value: string) => {
    const newInsts = [...installments]
    newInsts[index] = { ...newInsts[index], [field]: value }
    setInstallments(newInsts)
  }

  const addInstallment = () => {
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

  const removeInstallment = (index: number) => {
    const newInsts = [...installments]
    newInsts.splice(index, 1)
    setInstallments(newInsts)
  }

  const handleSave = async () => {
    if (!order) return
    if (Math.abs(diff) > 0.05) {
      toast({
        title: 'Valores não conferem',
        description: `A soma das parcelas (R$ ${formatCurrency(currentTotal)}) deve ser igual ao valor restante a parcelar (R$ ${formatCurrency(remainingNetValue)}).`,
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

      if (entrada > 0) {
        payload.push({
          method: entradaMethod,
          value: entrada,
          dueDate: format(new Date(), 'yyyy-MM-dd'),
          paidValue: entrada,
        })
      }

      installments.forEach((i) => {
        payload.push({
          method: i.method,
          value: parseFloat(i.value) || 0,
          dueDate: i.dueDate,
          paidValue: 0,
        })
      })

      await resumoAcertosService.updateOrderPaymentTerms(
        order.orderId,
        payload,
        loggedInUser?.id,
      )

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
          <DialogTitle>Editar Forma de Pagamento</DialogTitle>
          <DialogDescription>
            Pedido #{order.orderId} • Total Devido:{' '}
            <strong className="text-foreground">
              R$ {formatCurrency(netValue)}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4 p-4 border rounded-lg bg-green-50/30">
            <h4 className="text-sm font-semibold text-green-800">
              Entrada (Pagamento Imediato)
            </h4>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Valor da Entrada (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={entradaValue}
                  onChange={(e) => setEntradaValue(e.target.value)}
                  className="h-9 font-medium"
                  placeholder="0.00"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={entradaMethod} onValueChange={setEntradaMethod}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.filter((m) => m !== 'Boleto').map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {entrada > 0 && (
              <p className="text-xs text-green-700">
                Este valor será registrado como pago no caixa atual e deduzido
                do saldo a parcelar.
              </p>
            )}
          </div>

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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Detalhamento das Parcelas
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addInstallment}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Parcela
              </Button>
            </div>

            {installments.map((inst, idx) => (
              <div
                key={inst.id}
                className="flex items-end gap-3 p-3 rounded-md border bg-card relative"
              >
                <div className="absolute -left-2 -top-2 bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Forma</Label>
                  <Select
                    value={inst.method}
                    onValueChange={(val) =>
                      updateInstallment(idx, 'method', val)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={inst.dueDate}
                    onChange={(e) =>
                      updateInstallment(idx, 'dueDate', e.target.value)
                    }
                    className="h-8"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inst.value}
                    onChange={(e) =>
                      updateInstallment(idx, 'value', e.target.value)
                    }
                    className="h-8 text-right font-medium"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstallment(idx)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 mb-[1px]"
                  disabled={installments.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

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
            disabled={loading || Math.abs(diff) > 0.05}
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
