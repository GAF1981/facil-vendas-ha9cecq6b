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

  // Helper to generate installments based on business rules
  const generateInstallments = (
    totalValue: number,
    count: number,
    method: PaymentMethodType,
    hasZeroDownPayment: boolean = false,
  ): PaymentInstallment[] => {
    // Logic for "Sem Entrada" on Pix/Dinheiro:
    // If checked, the first installment is a dummy 0 value entry,
    // and the total value is distributed among the remaining N-1 installments.
    let effectiveCount = count
    if (hasZeroDownPayment && (method === 'Pix' || method === 'Dinheiro')) {
      effectiveCount = count - 1
    }
    // Safety check for 1x Sem Entrada (effectively 0 value total for 1x?)
    // Requirements imply "Sem Entrada" sets Entry payment to 0.
    // For 1x, this would mean the whole payment is 0.
    // We assume effectiveCount min 1 to avoid division by zero, but logic below handles i=0 explicitly.
    if (effectiveCount < 1) effectiveCount = 1

    const installmentValue =
      effectiveCount > 0 ? Number((totalValue / effectiveCount).toFixed(2)) : 0

    // Calculate remainder to add to last installment to match total exactly
    const totalDistributed = installmentValue * effectiveCount
    const remainder = Number((totalValue - totalDistributed).toFixed(2))

    const today = new Date()
    return Array.from({ length: count }, (_, i) => {
      let dueDate = format(addDays(today, (i + 1) * 30), 'yyyy-MM-dd')
      let value = installmentValue
      let paidValue = 0

      // Logic for Entry Payment (First Installment)
      const isEntry = i === 0

      if (isEntry && (method === 'Pix' || method === 'Dinheiro')) {
        dueDate = format(today, 'yyyy-MM-dd')
        if (hasZeroDownPayment) {
          // Requirement 2: If "Sem ENTRADA", Valor Registrado and Valor Pago must be 0
          value = 0
          paidValue = 0
        } else {
          // Default behavior: Entry is paid immediately
          paidValue = value
        }
      } else {
        // Future installments
        if (hasZeroDownPayment && (method === 'Pix' || method === 'Dinheiro')) {
          // We skipped i=0, so distributing to i>0
          if (i === count - 1) value += remainder
        } else {
          // Standard distribution
          if (i === count - 1) value += remainder
        }
      }

      // Requirement 1 & 3: Boleto and Cheque always 0 Paid Value
      if (method === 'Boleto' || method === 'Cheque') {
        paidValue = 0
      }

      return {
        number: i + 1,
        value: Number(value.toFixed(2)),
        paidValue: Number(paidValue.toFixed(2)),
        dueDate: dueDate,
      }
    })
  }

  const handleToggleMethod = (method: PaymentMethodType, checked: boolean) => {
    if (disabled) return

    if (checked) {
      const defaultValue = Number(Math.max(0, remaining).toFixed(2))
      const today = new Date()
      const dueDateDate = method === 'Boleto' ? addDays(today, 10) : today
      const dueDate = format(dueDateDate, 'yyyy-MM-dd')

      // Initial Paid Value calculation
      let initialPaidValue = 0
      if (method === 'Pix' || method === 'Dinheiro') {
        initialPaidValue = defaultValue // Default to full payment for 1x
      }

      // Generate default 1x details to keep logic consistent
      const details = generateInstallments(defaultValue, 1, method, false)
      // Override paidValue based on generated detail (which handles rules)
      initialPaidValue = details[0].paidValue

      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        paidValue: initialPaidValue,
        installments: 1,
        dueDate: dueDate,
        hasZeroDownPayment: false,
        details: details, // Store details even for 1x for consistency
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
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

        // Block updating paidValue manually on the main object (it's calculated)
        if (field === 'paidValue') return p

        const updated = { ...p, [field]: value }

        // Recalculate details and derived values
        if (
          field === 'value' ||
          field === 'installments' ||
          field === 'hasZeroDownPayment'
        ) {
          const val = field === 'value' ? (value as number) : p.value
          const count =
            field === 'installments' ? (value as number) : p.installments
          const zeroDown =
            field === 'hasZeroDownPayment'
              ? (value as boolean)
              : p.hasZeroDownPayment

          const newDetails = generateInstallments(val, count, method, zeroDown)
          updated.details = newDetails

          // Update main paidValue sum from details
          updated.paidValue = Number(
            newDetails.reduce((acc, d) => acc + d.paidValue, 0).toFixed(2),
          )

          if (count === 1) {
            updated.dueDate = newDetails[0].dueDate
          }
        } else if (
          field === 'dueDate' &&
          p.installments === 1 &&
          updated.details
        ) {
          // Sync 1x detail due date
          updated.details[0].dueDate = value as string
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
        let newPaidValue = p.paidValue

        if (field === 'value') {
          // If installment value changes, update total registered
          newValue = Number(
            newDetails.reduce((acc, curr) => acc + curr.value, 0).toFixed(2),
          )
        }

        if (field === 'paidValue') {
          // If installment paid value changes, update total paid
          newPaidValue = Number(
            newDetails
              .reduce((acc, curr) => acc + curr.paidValue, 0)
              .toFixed(2),
          )
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

                const isPixOrDinheiro =
                  entry.method === 'Pix' || entry.method === 'Dinheiro'

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

                        {/* Requirement 2: Checkbox "Sem ENTRADA" for Pix/Dinheiro */}
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
                              className="text-[10px] cursor-pointer whitespace-nowrap"
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
                            Valor Pago (Total)
                          </Label>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                            R$
                          </span>
                          {/* Requirement 1 (Boleto) and 2 (Pix/Dinheiro): Summary Paid Value must be disabled */}
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className={cn(
                              'pl-9 font-bold text-lg h-10 border-gray-200 bg-gray-100 text-gray-500 opacity-75',
                            )}
                            value={entry.paidValue}
                            disabled={true}
                            readOnly
                          />
                        </div>
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

                    {/* Installments Breakdown - Show even for 1x to allow checking details or partial payment if enabled */}
                    {entry.installments >= 1 && entry.details && (
                      <div className="pl-4 border-l-2 border-muted space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                            Detalhamento de Parcelas
                          </h4>
                        </div>

                        <div className="grid gap-3">
                          {entry.details.map((inst, idx) => {
                            const isEntrada = idx === 0 && isPixOrDinheiro
                            // Requirement 1: Boleto Paid Value is 0 and Disabled
                            const isBoleto = entry.method === 'Boleto'
                            // Requirement 3: Cheque Paid Value is 0 and Disabled
                            const isCheque = entry.method === 'Cheque'

                            // Requirement 2: Pix/Dinheiro Paid Value rules
                            // If Sem Entrada (hasZeroDownPayment), 1st installment is 0 and disabled
                            const isZeroEntry =
                              isEntrada && entry.hasZeroDownPayment
                            // If NOT Sem Entrada, 1st installment (Entry) is editable
                            // Future installments (idx > 0) usually 0 paid now
                            const isEditableEntry =
                              isEntrada && !entry.hasZeroDownPayment

                            const isPaidDisabled =
                              disabled ||
                              isBoleto ||
                              isCheque ||
                              isZeroEntry ||
                              (!isEntrada && isPixOrDinheiro)

                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'flex flex-col sm:flex-row gap-3 items-center p-2 rounded-md',
                                  isEntrada
                                    ? 'bg-blue-50/50 border border-blue-100'
                                    : 'bg-muted/20',
                                )}
                              >
                                <div
                                  className={cn(
                                    'w-full sm:w-20 text-sm font-medium',
                                    isEntrada
                                      ? 'text-blue-700 font-bold'
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
                                      disabled || isZeroEntry // Value is also 0 and disabled if Sem Entrada
                                    }
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
                                      isPaidDisabled
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-white font-medium',
                                    )}
                                    value={inst.paidValue}
                                    disabled={isPaidDisabled}
                                    readOnly={isPaidDisabled}
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
