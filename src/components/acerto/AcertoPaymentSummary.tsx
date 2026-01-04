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
import { Wallet, CreditCard, Calendar, DollarSign } from 'lucide-react'
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

      // Auto-fill logic for Cheque (Value = Paid Value) -> No, requirement 3 says PaidValue = 0 for Cheque
      // Logic for PIX/Dinheiro: PaidValue = Value initially, unless Sem Entrada is checked (but defaults to false)
      const initialPaidValue = method === 'Cheque' ? 0 : defaultValue

      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        paidValue: initialPaidValue,
        installments: 1,
        dueDate: dueDate,
        hasZeroDownPayment: false,
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
  }

  const generateInstallments = (
    totalValue: number,
    count: number,
    method: PaymentMethodType,
    hasZeroDownPayment: boolean = false,
  ): PaymentInstallment[] => {
    // Redistribution Logic:
    // If hasZeroDownPayment (for Pix/Dinheiro), the entry installment (idx 0) is forced to 0.
    // The total value is then redistributed among the remaining installments.
    let effectiveCount = count
    if (hasZeroDownPayment && (method === 'Pix' || method === 'Dinheiro')) {
      effectiveCount = count - 1
    }
    if (effectiveCount < 1) effectiveCount = 1

    const installmentValue =
      effectiveCount > 0
        ? Number((totalValue / effectiveCount).toFixed(2))
        : totalValue

    // Simple remainder handling could be added here, but simple division is standard for now.

    const today = new Date()
    return Array.from({ length: count }, (_, i) => {
      let dueDate = format(addDays(today, (i + 1) * 30), 'yyyy-MM-dd')
      let paidValue = 0
      let value = installmentValue

      // Logic for ENTRADA (Index 0 for PIX/Dinheiro)
      if (i === 0 && (method === 'Pix' || method === 'Dinheiro')) {
        dueDate = format(today, 'yyyy-MM-dd')

        if (hasZeroDownPayment) {
          // Requirement 2: Force 0
          value = 0
          paidValue = 0
        } else {
          // Normal entry: fully paid by default
          // Wait, if not zero down payment, value is installmentValue.
          // Is it automatically paid? Usually yes for Entry.
          paidValue = value
        }
      }

      // Logic for Cheque installments (Paid Value = 0 per requirement 3)
      if (method === 'Cheque') {
        paidValue = 0
      }

      return {
        number: i + 1,
        value: value,
        paidValue: paidValue,
        dueDate: dueDate,
      }
    })
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
          // For Cheque, paidValue stays 0.
          // For Pix/Dinheiro, if installments=1, paidValue = value (unless hasZeroDownPayment, handled by re-gen?)
          // Actually if installments=1, details might be undefined.
          // But if hasZeroDownPayment is allowed, we might need details even for 1x to show the 0 entry?
          // Let's assume user behavior: Type value -> Update Details if they exist.
          if (updated.installments > 1) {
            updated.details = generateInstallments(
              value as number,
              updated.installments,
              method,
              updated.hasZeroDownPayment,
            )
          } else {
            // 1x Logic
            if (method === 'Cheque') {
              updated.paidValue = 0
            } else {
              // Pix/Dinheiro
              if (updated.hasZeroDownPayment) {
                updated.paidValue = 0
                // If 1x and Sem Entrada, effectively value should be 0? Or just paidValue?
                // If value is 100, 1x, Sem Entrada. Entry is 0. Total paid 0.
                // It means debt is 100.
              } else {
                updated.paidValue = value as number
              }
            }
          }
        }

        if (field === 'installments') {
          const count = value as number
          if (count > 1) {
            updated.details = generateInstallments(
              p.value,
              count,
              method,
              p.hasZeroDownPayment,
            )
          } else {
            updated.details = undefined
            const today = new Date()
            const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
            updated.dueDate = format(dueDateDate, 'yyyy-MM-dd')

            // Re-apply single payment logic
            if (method === 'Cheque') {
              updated.paidValue = 0
            } else {
              // Pix/Dinheiro
              if (p.hasZeroDownPayment) {
                updated.paidValue = 0
              } else {
                updated.paidValue = p.value
              }
            }
          }
        }

        if (field === 'hasZeroDownPayment') {
          // Regenerate details if they exist or if we switch to/from 1x logic
          const hasZero = value as boolean
          if (updated.installments > 1) {
            updated.details = generateInstallments(
              p.value,
              updated.installments,
              method,
              hasZero,
            )
          } else {
            // 1x logic update
            if (hasZero && (method === 'Pix' || method === 'Dinheiro')) {
              updated.paidValue = 0
            } else if (
              !hasZero &&
              (method === 'Pix' || method === 'Dinheiro')
            ) {
              updated.paidValue = updated.value
            }
          }
        }

        // Recalculate main paidValue for Pix/Dinheiro from details if they exist
        if ((method === 'Pix' || method === 'Dinheiro') && updated.details) {
          updated.paidValue = updated.details.reduce(
            (acc, d) => acc + d.paidValue,
            0,
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
    if (disabled) return

    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method || !p.details) return p
        const newDetails = [...p.details]
        newDetails[index] = { ...newDetails[index], [field]: value }

        // Enforce Cheque paidValue = 0 constraint (Requirement 3)
        if (method === 'Cheque' && field === 'paidValue') {
          newDetails[index].paidValue = 0
        }

        // Enforce Sem Entrada constraint (Requirement 2)
        if (
          p.hasZeroDownPayment &&
          (method === 'Pix' || method === 'Dinheiro') &&
          index === 0
        ) {
          if (field === 'value' || field === 'paidValue') {
            newDetails[index].value = 0
            newDetails[index].paidValue = 0
          }
        }

        // Recalculate parent value from sum of installments
        let newValue = p.value
        if (field === 'value') {
          newValue = Number(
            newDetails.reduce((acc, curr) => acc + curr.value, 0).toFixed(2),
          )
        }

        // Recalculate parent paidValue (Requirement 4)
        let newPaidValue = p.paidValue
        if (method === 'Pix' || method === 'Dinheiro') {
          newPaidValue = Number(
            newDetails
              .reduce((acc, curr) => acc + curr.paidValue, 0)
              .toFixed(2),
          )
        } else if (method === 'Cheque') {
          newPaidValue = 0
        }

        return {
          ...p,
          details: newDetails,
          value: newValue,
          paidValue: newPaidValue,
        }
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
        return { ...p, [field]: Number(p[field].toFixed(2)) }
      }),
    )
  }

  const handleAutoFill = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return
    onPaymentsChange(
      payments.map((p) => {
        if (p.method !== method) return p
        // If Cheque, never auto-fill paid value
        if (method === 'Cheque') return { ...p, paidValue: 0 }

        return {
          ...p,
          paidValue: checked ? p.value : 0,
        }
      }),
    )
  }

  return (
    <Card className="border-muted bg-muted/10 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          Resumos de Recebimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-1 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 shadow-sm">
            <span className="text-sm text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Saldo a Pagar
            </span>
            <span className="text-4xl font-bold text-blue-700 dark:text-blue-400">
              R$ {formatCurrency(saldoAPagar)}
            </span>
          </div>

          <div
            className={cn(
              'flex flex-col space-y-1 p-4 rounded-lg border shadow-sm',
              disabled
                ? 'bg-gray-100 border-gray-200 text-gray-500 opacity-70'
                : isComplete
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-900',
            )}
          >
            <span className="text-sm font-medium flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Total Selecionado
            </span>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold">
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
          <Label className="text-lg font-semibold">Formas de Pagamento</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = payments.some((p) => p.method === method)
              return (
                <div
                  key={method}
                  className={cn(
                    'flex items-center space-x-3 border rounded-md p-4 transition-colors',
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
                    className="h-5 w-5"
                  />
                  <Label
                    htmlFor={`chk-${method}`}
                    className={cn(
                      'font-medium text-base',
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

                const isCheque = entry.method === 'Cheque'
                const isPixOrDinheiro =
                  entry.method === 'Pix' || entry.method === 'Dinheiro'

                const isPaidDisabled =
                  entry.method === 'Boleto' ||
                  isCheque ||
                  (isPixOrDinheiro &&
                    entry.installments > 1 &&
                    !!entry.details) ||
                  (isPixOrDinheiro && entry.hasZeroDownPayment)

                return (
                  <div
                    key={entry.method}
                    className="bg-card border rounded-lg p-4 shadow-sm animate-slide-up space-y-4"
                  >
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
                      <div className="w-full md:w-24 shrink-0 space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground font-bold uppercase mb-1.5 block">
                            Método
                          </Label>
                          <div className="font-semibold text-primary flex items-center justify-center gap-2 h-10 px-2 bg-muted/50 rounded-md border text-sm text-center truncate">
                            {entry.method}
                          </div>
                        </div>

                        {/* Sem ENTRADA Checkbox for Pix/Dinheiro (Requirement 2) */}
                        {isPixOrDinheiro && (
                          <div className="flex items-center gap-2 pt-1">
                            <Checkbox
                              id={`no-entry-${entry.method}`}
                              checked={!!entry.hasZeroDownPayment}
                              disabled={disabled}
                              onCheckedChange={(c) =>
                                handleUpdateEntry(
                                  entry.method,
                                  'hasZeroDownPayment',
                                  c as boolean,
                                )
                              }
                              className="h-3.5 w-3.5"
                            />
                            <Label
                              htmlFor={`no-entry-${entry.method}`}
                              className="text-[10px] cursor-pointer"
                            >
                              Sem ENTRADA
                            </Label>
                          </div>
                        )}
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
                          {!disabled && !isPaidDisabled && (
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
                              disabled || isPaidDisabled ? 'bg-muted' : '',
                            )}
                            value={entry.paidValue}
                            disabled={disabled || isPaidDisabled}
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
                            Aviso: Valor pago maior que registrado.
                          </span>
                        )}
                        {entry.method === 'Boleto' && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                            Boleto não permite entrada de valor pago imediato.
                          </span>
                        )}
                        {isCheque && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                            Cheque: Valor pago sempre zero.
                          </span>
                        )}
                        {isPixOrDinheiro && entry.hasZeroDownPayment && (
                          <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                            Sem ENTRADA: Valor pago bloqueado.
                          </span>
                        )}
                        {isPixOrDinheiro &&
                          entry.installments > 1 &&
                          !entry.hasZeroDownPayment && (
                            <span className="text-[10px] text-muted-foreground font-medium block mt-1">
                              Valor pago: Soma das parcelas.
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
                          {entry.details.map((inst, idx) => {
                            // Check for ENTRADA logic
                            const isEntrada =
                              idx === 0 &&
                              (entry.method === 'Pix' ||
                                entry.method === 'Dinheiro')

                            const isReadOnlyInstallment =
                              (isEntrada && entry.hasZeroDownPayment) ||
                              isCheque ||
                              entry.method === 'Boleto'

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'flex flex-col sm:flex-row gap-3 items-center p-2 rounded-md',
                                  isEntrada
                                    ? 'bg-red-50 border border-red-100'
                                    : 'bg-muted/20',
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-full sm:w-20 text-sm font-medium',
                                    isEntrada
                                      ? 'text-red-600 font-bold'
                                      : 'text-muted-foreground',
                                  )}
                                >
                                  {isEntrada
                                    ? 'ENTRADA'
                                    : `${idx + 1}ª Parcela`}
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
                                    disabled={
                                      disabled ||
                                      (isEntrada && !!entry.hasZeroDownPayment)
                                    }
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

                                {/* Paid Value per Installment */}
                                <div className="w-full sm:flex-1 relative">
                                  <span className="absolute left-2.5 top-2 text-muted-foreground text-xs">
                                    Pago: R$
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className={cn(
                                      'h-8 pl-16 text-sm',
                                      isCheque ||
                                        (isEntrada && entry.hasZeroDownPayment)
                                        ? 'bg-muted'
                                        : '',
                                    )}
                                    value={inst.paidValue}
                                    disabled={disabled || isReadOnlyInstallment}
                                    onChange={(e) =>
                                      handleUpdateInstallment(
                                        entry.method,
                                        idx,
                                        'paidValue',
                                        parseFloat(e.target.value) || 0,
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
                            )
                          })}
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
