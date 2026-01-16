import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { PaymentEntry, PaymentMethodType } from '@/types/payment'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { OrderDebt } from '@/types/cobranca'
import { cn } from '@/lib/utils'

interface RecebimentoPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: OrderDebt | null
  clientName: string
  onConfirm: (payments: PaymentEntry[]) => Promise<void>
}

const RESTRICTED_METHODS = ['Pix', 'Dinheiro', 'Boleto', 'Cheque']
const AVAILABLE_METHODS: PaymentMethodType[] = [
  'Pix',
  'Dinheiro',
  'Boleto',
  'Cheque',
]

export function RecebimentoPaymentDialog({
  open,
  onOpenChange,
  order,
  clientName,
  onConfirm,
}: RecebimentoPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentEntry[]>([])

  // Form State
  const [method, setMethod] = useState<PaymentMethodType | ''>('')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [installments, setInstallments] = useState(1)

  useEffect(() => {
    if (open) {
      setPayments([])
      setMethod('')
      setValue(order ? formatCurrency(order.remainingValue) : '') // Pre-fill with remaining amount for convenience
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setInstallments(1)
    }
  }, [open, order])

  useEffect(() => {
    if (method && RESTRICTED_METHODS.includes(method)) {
      setInstallments(1)
      const today = format(new Date(), 'yyyy-MM-dd')
      if (date > today) {
        setDate(today)
      }
    }
  }, [method, date])

  const handleAddPayment = () => {
    if (!method) return
    const numValue = parseCurrency(value)
    if (numValue <= 0) return

    const newPayment: PaymentEntry = {
      method: method as PaymentMethodType,
      value: numValue,
      paidValue: numValue, // For restricted methods, registered = paid
      dueDate: date,
      installments: installments,
    }

    setPayments([...payments, newPayment])

    // Reset form partially
    setMethod('')
    setValue('')
    setInstallments(1)
  }

  const handleRemovePayment = (index: number) => {
    const newPayments = [...payments]
    newPayments.splice(index, 1)
    setPayments(newPayments)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(payments)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!order) return null

  const totalEntered = payments.reduce((acc, p) => acc + p.value, 0)
  const balanceDue = order.remainingValue
  const diff = Math.abs(totalEntered - balanceDue)
  const isValid = diff < 0.05

  const isMethodRestricted = method && RESTRICTED_METHODS.includes(method)
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
          <DialogDescription>
            Pedido #{order.orderId} - {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Summary Card */}
          <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Saldo a Pagar</p>
              <p className="text-2xl font-bold">{formatCurrency(balanceDue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Selecionado</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isValid ? 'text-green-600' : 'text-red-500',
                )}
              >
                {formatCurrency(totalEntered)}
              </p>
            </div>
          </div>

          {/* Payment Entry Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Adicionar Pagamento</h4>

            <div className="space-y-3">
              <Label>Forma de Pagamento</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as PaymentMethodType)}
                className="flex flex-wrap gap-4"
              >
                {AVAILABLE_METHODS.map((m) => (
                  <div key={m} className="flex items-center space-x-2">
                    <RadioGroupItem value={m} id={m} />
                    <Label htmlFor={m} className="cursor-pointer">
                      {m}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={date}
                  max={isMethodRestricted ? today : undefined}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  value={installments}
                  disabled={!!isMethodRestricted}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                />
              </div>
            </div>

            <Button
              onClick={handleAddPayment}
              disabled={!method || !value || parseCurrency(value) <= 0}
              variant="secondary"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>

          {/* Payments List */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Pagamentos Adicionados
              </h4>
              <div className="border rounded-md divide-y">
                {payments.map((p, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 text-sm"
                  >
                    <div className="flex gap-4">
                      <span className="font-medium w-24">{p.method}</span>
                      <span>{formatCurrency(p.value)}</span>
                      <span className="text-muted-foreground">
                        {format(new Date(p.dueDate), 'dd/MM/yyyy')}
                        {p.installments > 1 && ` (${p.installments}x)`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePayment(i)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {!isValid && payments.length > 0 && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100 font-medium">
              O botão de confirmação só poderá ser acionado se o valor
              &apos;Saldo a Pagar&apos; for igual ao &apos;Total
              Selecionado&apos;.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || payments.length === 0 || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
