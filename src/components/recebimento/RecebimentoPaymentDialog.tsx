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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

const BANKS = [
  'Banco do Brasil',
  'Bradesco',
  'Caixa',
  'Itaú',
  'Santander',
  'Nubank',
  'Inter',
  'C6 Bank',
  'Outros',
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

  // Pix Specific State
  const [pixName, setPixName] = useState('')
  const [pixBank, setPixBank] = useState('')

  useEffect(() => {
    if (open) {
      setPayments([])
      setMethod('')
      // Set default value to remaining amount
      setValue(order ? formatCurrency(order.remainingValue) : '')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setInstallments(1)
      setPixName('')
      setPixBank('')
    }
  }, [open, order])

  const isMethodRestricted = method && RESTRICTED_METHODS.includes(method)

  useEffect(() => {
    // Enforcement: If restricted method, force today as max date and 1 installment
    if (isMethodRestricted) {
      setInstallments(1)
      const today = format(new Date(), 'yyyy-MM-dd')
      if (date > today) {
        setDate(today)
      }
    }
  }, [method, date, isMethodRestricted])

  const handleAddPayment = () => {
    if (!method) return
    const numValue = parseCurrency(value)
    if (numValue <= 0) return

    // Validate Pix Data
    if (method === 'Pix' && (!pixName || !pixBank)) {
      return // Should show error or disable button
    }

    const newPayment: PaymentEntry = {
      method: method as PaymentMethodType,
      value: numValue,
      paidValue: numValue, // Validated: Registered == Paid for these methods in this context
      dueDate: date,
      installments: installments,
      pixDetails:
        method === 'Pix'
          ? { nome: pixName, banco: pixBank, dataPagamento: date }
          : undefined,
    }

    setPayments([...payments, newPayment])

    // Reset Form
    setMethod('')
    setValue('')
    setInstallments(1)
    setPixName('')
    setPixBank('')
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

  // Validation Rule Change: allow partial payments, so we just check if any payment is added
  const canConfirm = payments.length > 0

  const today = format(new Date(), 'yyyy-MM-dd')

  const canAdd =
    !!method &&
    !!value &&
    parseCurrency(value) > 0 &&
    (method !== 'Pix' || (!!pixName && !!pixBank))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento - {clientName}</DialogTitle>
          <DialogDescription>
            Pedido #{order.orderId} - {format(new Date(), 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Validation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted p-6 rounded-lg border flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground uppercase font-semibold">
                Saldo a Pagar
              </span>
              <span className="text-3xl font-bold mt-2">
                {formatCurrency(balanceDue)}
              </span>
            </div>
            <div
              className={cn(
                'p-6 rounded-lg border flex flex-col items-center justify-center transition-colors',
                'bg-blue-50 border-blue-200 text-blue-700',
              )}
            >
              <span className="text-sm uppercase font-semibold opacity-80">
                Total a Registrar
              </span>
              <span className="text-3xl font-bold mt-2">
                {formatCurrency(totalEntered)}
              </span>
              <span className="text-xs mt-1 font-medium">
                Novo Saldo:{' '}
                {formatCurrency(Math.max(0, balanceDue - totalEntered))}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Payment Entry Form - Left Side */}
            <div className="flex-1 space-y-4 border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar Pagamento
              </h4>

              <div className="space-y-3">
                <Label>Forma de Pagamento</Label>
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as PaymentMethodType)}
                  className="grid grid-cols-2 gap-2"
                >
                  {AVAILABLE_METHODS.map((m) => (
                    <div
                      key={m}
                      className={cn(
                        'flex items-center space-x-2 border rounded-md p-2 cursor-pointer transition-colors',
                        method === m
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted',
                      )}
                    >
                      <RadioGroupItem value={m} id={m} />
                      <Label htmlFor={m} className="cursor-pointer w-full">
                        {m}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0,00"
                    className="text-right font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={date}
                    max={isMethodRestricted ? today : undefined}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  {isMethodRestricted && (
                    <p className="text-[10px] text-muted-foreground">
                      Limitado à data atual.
                    </p>
                  )}
                </div>
              </div>

              {/* Installments - Disabled for restricted methods */}
              {!isMethodRestricted && (
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Select
                    value={installments.toString()}
                    onValueChange={(v) => setInstallments(Number(v))}
                    disabled={true} // Generally simplified for single payments in this context, or enable if needed
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x (À vista)</SelectItem>
                      {/* Add more if needed later */}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pix Specific Fields */}
              {method === 'Pix' && (
                <div className="space-y-4 pt-2 border-t mt-2">
                  <h5 className="text-sm font-semibold text-blue-600">
                    Detalhes do Pix
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome no Pix</Label>
                      <Input
                        value={pixName}
                        onChange={(e) => setPixName(e.target.value)}
                        placeholder="Nome do pagador"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Banco</Label>
                      <Select value={pixBank} onValueChange={setPixBank}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {BANKS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddPayment}
                disabled={!canAdd}
                className="w-full mt-4"
              >
                Adicionar Valor
              </Button>
            </div>

            {/* Payments List - Right Side */}
            <div className="flex-1 space-y-4 border rounded-lg p-4 bg-muted/10">
              <h4 className="font-medium text-sm text-muted-foreground">
                Pagamentos Lançados
              </h4>
              <div className="space-y-2">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum pagamento adicionado.
                  </div>
                ) : (
                  payments.map((p, i) => (
                    <div
                      key={i}
                      className="bg-card border rounded-md p-3 text-sm shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold block">{p.method}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(p.dueDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">
                            {formatCurrency(p.value)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemovePayment(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {p.method === 'Pix' && p.pixDetails && (
                        <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded-sm mt-1">
                          <p>
                            <strong>Nome:</strong> {p.pixDetails.nome}
                          </p>
                          <p>
                            <strong>Banco:</strong> {p.pixDetails.banco}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
