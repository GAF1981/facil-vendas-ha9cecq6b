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
import {
  Wallet,
  CreditCard,
  Calendar,
  AlertTriangle,
  DollarSign,
} from 'lucide-react'
import {
  PaymentEntry,
  PaymentMethodType,
  PAYMENT_METHODS,
  PaymentInstallment,
} from '@/types/payment'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { addDays, format } from 'date-fns'

interface AcertoPaymentSummaryProps {
  saldoAPagar: number
  payments: PaymentEntry[]
  onPaymentsChange: (payments: PaymentEntry[]) => void
}

export function AcertoPaymentSummary({
  saldoAPagar,
  payments,
  onPaymentsChange,
}: AcertoPaymentSummaryProps) {
  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0)
  const remaining = saldoAPagar - totalPaid
  const isComplete = Math.abs(remaining) < 0.01

  // Update default payment if list is empty and there is balance
  useEffect(() => {
    // Optional: Only if user hasn't selected anything yet and there is a balance
  }, [])

  const handleToggleMethod = (method: PaymentMethodType, checked: boolean) => {
    if (checked) {
      // Add method
      // Default value is remaining balance (or 0 if negative)
      const defaultValue = Math.max(0, remaining)
      const today = new Date().toISOString().split('T')[0]
      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        installments: 1,
        dueDate: today,
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      // Remove method
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
  }

  const generateInstallments = (
    totalValue: number,
    count: number,
  ): PaymentInstallment[] => {
    const installmentValue = totalValue / count
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
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p

        const updated = { ...p, [field]: value }

        // If installments count changed, regenerate details
        if (field === 'installments') {
          const count = value as number
          if (count > 1) {
            updated.details = generateInstallments(p.value, count)
          } else {
            updated.details = undefined
            updated.dueDate = new Date().toISOString().split('T')[0]
          }
        }

        // If value changed and we have multiple installments, regenerate details proportionally
        if (field === 'value' && p.installments > 1) {
          updated.details = generateInstallments(
            value as number,
            p.installments,
          )
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
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method || !p.details) return p

        const newDetails = [...p.details]
        newDetails[index] = { ...newDetails[index], [field]: value }

        // When value changes, we update the total payment value to match sum of installments
        let newValue = p.value
        if (field === 'value') {
          newValue = newDetails.reduce((acc, curr) => acc + curr.value, 0)
        }

        return { ...p, details: newDetails, value: newValue }
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
          {/* Saldo a Pagar */}
          <div className="flex flex-col space-y-1 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Saldo a Pagar
            </span>
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              R$ {formatCurrency(saldoAPagar)}
            </span>
          </div>

          {/* Total Selecionado */}
          <div
            className={cn(
              'flex flex-col space-y-1 p-3 rounded-lg border shadow-sm',
              isComplete
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-yellow-50 border-yellow-200 text-yellow-900',
            )}
          >
            <span className="text-sm font-medium flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Total Selecionado
            </span>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">
                R$ {formatCurrency(totalPaid)}
              </span>
              {!isComplete && (
                <span className="text-sm font-medium mb-1">
                  (Restante: R$ {formatCurrency(remaining)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods Selection */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base font-semibold">Formas de Pagamento</Label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = payments.some((p) => p.method === method)
              return (
                <div
                  key={method}
                  className={cn(
                    'flex items-center space-x-2 border rounded-md p-3 transition-colors cursor-pointer hover:bg-muted',
                    isSelected
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-card',
                  )}
                  onClick={() => handleToggleMethod(method, !isSelected)}
                >
                  <Checkbox
                    id={`chk-${method}`}
                    checked={isSelected}
                    onCheckedChange={(c) =>
                      handleToggleMethod(method, c as boolean)
                    }
                  />
                  <Label
                    htmlFor={`chk-${method}`}
                    className="cursor-pointer font-medium text-sm"
                  >
                    {method}
                  </Label>
                </div>
              )
            })}
          </div>
        </div>

        {/* Active Payments Details */}
        {payments.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Detalhamento
            </h3>
            <div className="grid gap-4">
              {payments.map((entry) => (
                <div
                  key={entry.method}
                  className="bg-card border rounded-lg p-4 shadow-sm animate-slide-up space-y-4"
                >
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                    {/* Method Column - Decreased Width */}
                    <div className="w-full md:w-32 shrink-0">
                      <Label className="text-xs text-muted-foreground font-bold uppercase mb-1.5 block">
                        Método
                      </Label>
                      <div className="font-semibold text-primary flex items-center justify-center gap-2 h-10 px-2 bg-muted/50 rounded-md border text-sm text-center">
                        {entry.method}
                      </div>
                    </div>

                    {/* Value Column - Increased Width (flex-1) */}
                    <div className="w-full md:flex-1">
                      <Label className="text-xs font-medium mb-1.5 block">
                        Valor Total Pago
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
                          onChange={(e) =>
                            handleUpdateEntry(
                              entry.method,
                              'value',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-32">
                      <Label className="text-xs font-medium mb-1.5 block">
                        Parcelas
                      </Label>
                      <Select
                        value={entry.installments.toString()}
                        onValueChange={(val) =>
                          handleUpdateEntry(
                            entry.method,
                            'installments',
                            parseInt(val),
                          )
                        }
                      >
                        <SelectTrigger className="h-10">
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
                      <div className="w-full md:w-40">
                        <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Vencimento
                        </Label>
                        <Input
                          type="date"
                          className="h-10"
                          value={entry.dueDate}
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

                  {/* Granular Installment Details */}
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
                                onChange={(e) =>
                                  handleUpdateInstallment(
                                    entry.method,
                                    idx,
                                    'value',
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div className="w-full sm:w-40">
                              <Input
                                type="date"
                                className="h-8 text-sm"
                                value={inst.dueDate}
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
              ))}
            </div>
            {!isComplete && (
              <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Atenção: A soma dos pagamentos (R$ {formatCurrency(totalPaid)}
                  ) difere do saldo total (R$ {formatCurrency(saldoAPagar)}).
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
