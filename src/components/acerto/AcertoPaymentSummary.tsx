import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { Wallet, CreditCard, Calendar, DollarSign, Check } from 'lucide-react'
import {
  PaymentEntry,
  PaymentMethodType,
  PAYMENT_METHODS,
  PaymentInstallment,
} from '@/types/payment'
import { cn } from '@/lib/utils'
import { addDays, format } from 'date-fns'

interface AcertoPaymentSummaryProps {
  saldoAPagar: number
  payments: PaymentEntry[]
  onPaymentsChange: (payments: PaymentEntry[]) => void
  disabled?: boolean
}

export function AcertoPaymentSummary({
  saldoAPagar,
  payments,
  onPaymentsChange,
  disabled = false,
}: AcertoPaymentSummaryProps) {
  const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)
  const remaining = saldoAPagar - totalRegistered
  const isComplete = Math.abs(remaining) < 0.01

  const handleToggleMethod = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return

    if (checked) {
      const defaultValue = Number(Math.max(0, remaining).toFixed(2))
      const today = new Date()
      const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
      const dueDate = format(dueDateDate, 'yyyy-MM-dd')

      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        paidValue: 0, // Initial paid value is 0
        installments: 1,
        dueDate: dueDate,
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
  }

  const generateInstallments = (
    totalValue: number,
    count: number,
  ): PaymentInstallment[] => {
    const installmentValue = Number((totalValue / count).toFixed(2))
    const today = new Date()
    return Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      value: installmentValue,
      dueDate: format(addDays(today, (i + 1) * 30), 'yyyy-MM-dd'),
    }))
  }

  const handleUpdateEntry = (
    method: PaymentMethodType,
    field: keyof PaymentEntry,
    value: any,
  ) => {
    if (disabled) return

    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p

        const updated = { ...p, [field]: value }

        if (field === 'value') {
          if (updated.installments > 1) {
            updated.details = generateInstallments(
              value as number,
              updated.installments,
            )
          }
        }

        if (field === 'installments') {
          const count = value as number
          if (count > 1) {
            updated.details = generateInstallments(p.value, count)
          } else {
            updated.details = undefined
            const today = new Date()
            const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
            updated.dueDate = format(dueDateDate, 'yyyy-MM-dd')
          }
        }

        return updated
      }),
    )
  }

  const handleUpdateInstallment = (
    method: PaymentMethodType,
    index: number,
    field: keyof PaymentInstallment,
    value: any,
  ) => {
    if (disabled) return

    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method || !p.details) return p
        const newDetails = [...p.details]
        newDetails[index] = { ...newDetails[index], [field]: value }
        let newValue = p.value
        if (field === 'value') {
          newValue = Number(
            newDetails.reduce((acc, curr) => acc + curr.value, 0).toFixed(2),
          )
        }
        return { ...p, details: newDetails, value: newValue }
      }),
    )
  }

  const handleBlur = (
    method: PaymentMethodType,
    field: 'value' | 'paidValue',
  ) => {
    if (disabled) return
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p
        return {
          ...p,
          [field]: Number(p[field].toFixed(2)),
        }
      }),
    )
  }

  const handleAutoFill = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p
        return {
          ...p,
          paidValue: checked ? p.value : p.paidValue,
        }
      }),
    )
  }

  return (
    <Card className="border-muted bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Resumos de Recebimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Saldo a Pagar
            </span>
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              R$ {formatCurrency(saldoAPagar)}
            </span>
          </div>

          <div
            className={cn(
              'flex flex-col space-y-1 p-3 rounded-lg border shadow-sm',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 opacity-70'
                : isComplete
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-900',
            )}
          >
            <span className="text-sm font-medium flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Total Selecionado
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">
                R$ {formatCurrency(totalRegistered)}
              </span>
              {!isComplete && !disabled && (
                <span className="text-sm font-medium mb-1">
                  (Restante: R$ {formatCurrency(remaining)})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Formas de Pagamento</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = payments.some((p) => p.method === method)
              return (
                <div
                  key={method}
                  className={cn(
                    'flex items-center space-x-2 border rounded-md p-3 transition-colors',
                    disabled
                      ? 'cursor-not-allowed opacity-50 bg-muted/50'
                      : 'cursor-pointer hover:bg-muted',
                    isSelected && !disabled
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-card',
                  )}
                  onClick={() => handleToggleMethod(method, !isSelected)}
                >
                  <Checkbox
                    id={`chk-${method}`}
                    checked={isSelected}
                    disabled={disabled}
                    onCheckedChange={(c) =>
                      handleToggleMethod(method, c as boolean)
                    }
                  />
                  <Label
                    htmlFor={`chk-${method}`}
                    className={cn(
                      'font-medium text-sm',
                      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    {method}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>

        {payments.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Detalhamento
            </h3>
            <div className="grid gap-4">
              {payments.map((entry) => {
                const isOverpaid = entry.paidValue > entry.value + 0.01
                const isFullyPaid =
                  Math.abs(entry.paidValue - entry.value) < 0.01 &&
                  entry.value > 0

                return (
                  <div
                    key={entry.method}
                    className="bg-card border rounded-lg p-4 shadow-sm animate-slide-up space-y-4"
                  >
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                      <div className="w-full md:w-24 shrink-0">
                        <Label className="text-xs text-muted-foreground font-bold uppercase mb-1.5 block">
                          Método
                        </Label>
                        <div className="font-semibold text-primary flex items-center justify-center gap-2 h-10 px-2 bg-muted/50 rounded-md border text-sm text-center truncate">
                          {entry.method}
                        </div>
                      </div>

                      <div className="w-full md:flex-1">
                        <Label className="text-xs font-medium mb-1.5 block">
                          Valor Registrado
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-9 font-bold text-lg h-10"
                            value={entry.value}
                            disabled={disabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'value',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onBlur={() => handleBlur(entry.method, 'value')}
                          />
                        </div>
                      </div>

                      <div className="w-full md:flex-1 space-y-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <Label
                            className={cn(
                              'text-xs font-medium block',
                              isOverpaid ? 'text-red-600' : 'text-green-700',
                            )}
                          >
                            Valor Pago
                          </Label>
                          {!disabled && (
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`auto-${entry.method}`}
                                checked={isFullyPaid}
                                onCheckedChange={(c) =>
                                  handleAutoFill(entry.method, c as boolean)
                                }
                                className="h-3.5 w-3.5 data-[state=checked]:bg-green-600 border-green-600"
                              />
                              <Label
                                htmlFor={`auto-${entry.method}`}
                                className="text-[10px] text-muted-foreground cursor-pointer font-normal"
                              >
                                Preencher
                              </Label>
                            </div>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                            R$
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className={cn(
                              'pl-9 font-bold text-lg h-10',
                              isOverpaid
                                ? 'border-red-300 bg-red-50 text-red-700 focus-visible:ring-red-200'
                                : 'border-green-200 bg-green-50/20 text-green-700',
                            )}
                            value={entry.paidValue}
                            disabled={disabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'paidValue',
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            onBlur={() => handleBlur(entry.method, 'paidValue')}
                          />
                        </div>
                        {isOverpaid && (
                          <span className="text-[10px] text-red-600 font-medium block mt-1 animate-fade-in">
                            Erro: Valor pago excede o registrado.
                          </span>
                        )}
                      </div>

                      <div className="w-full md:w-20">
                        <Label className="text-xs font-medium mb-1.5 block">
                          Parcelas
                        </Label>
                        <Select
                          value={entry.installments.toString()}
                          disabled={disabled}
                          onValueChange={(val) =>
                            handleUpdateEntry(
                              entry.method,
                              'installments',
                              parseInt(val),
                            )
                          }
                        >
                          <SelectTrigger className="h-10 px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                              (n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}x
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.installments === 1 && (
                        <div className="w-full md:w-32">
                          <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Vencimento
                          </Label>
                          <Input
                            type="date"
                            className="h-10 px-2 text-xs"
                            value={entry.dueDate}
                            disabled={disabled}
                            onChange={(e) =>
                              handleUpdateEntry(
                                entry.method,
                                'dueDate',
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    {entry.installments > 1 && entry.details && (
                      <div className="pl-4 border-l-2 border-muted space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                          Parcelas
                        </h4>
                        <div className="grid gap-3">
                          {entry.details.map((inst, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row gap-3 items-center bg-muted/20 p-2 rounded-md"
                            >
                              <div className="w-full sm:w-20 text-sm font-medium text-muted-foreground">
                                {idx + 1}ª Parcela
                              </div>
                              <div className="w-full sm:flex-1 relative">
                                <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">
                                  R$
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 pl-7 text-sm"
                                  value={inst.value}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    handleUpdateInstallment(
                                      entry.method,
                                      idx,
                                      'value',
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUpdateInstallment(
                                      entry.method,
                                      idx,
                                      'value',
                                      Number(inst.value.toFixed(2)),
                                    )
                                  }
                                />
                              </div>
                              <div className="w-full sm:w-32">
                                <Input
                                  type="date"
                                  className="h-8 text-sm px-2"
                                  value={inst.dueDate}
                                  disabled={disabled}
                                  onChange={(e) =>
                                    handleUpdateInstallment(
                                      entry.method,
                                      idx,
                                      'dueDate',
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
