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
import { addDays, format, isAfter, startOfDay, parseISO } from 'date-fns'

interface AcertoPaymentSummaryProps {
  saldoAPagar: number
  payments: PaymentEntry[]
  onPaymentsChange: (payments: PaymentEntry[]) => void
  disabled?: boolean
  isReceiptMode?: boolean // New prop to enable stricter receipt validation
}

export function AcertoPaymentSummary({
  saldoAPagar,
  payments,
  onPaymentsChange,
  disabled = false,
  isReceiptMode = false,
}: AcertoPaymentSummaryProps) {
  const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)
  const remaining = saldoAPagar - totalRegistered
  const isComplete = Math.abs(remaining) < 0.01

  // Helper to check if method is restricted in receipt mode
  const isRestrictedMethod = (method: string) => {
    return (
      isReceiptMode && ['Pix', 'Dinheiro', 'Boleto', 'Cheque'].includes(method)
    )
  }

  // Helper to calculate paid value based on rules
  const calculatePaidValue = (
    method: string,
    value: number,
    dueDateStr: string,
    isEntry: boolean,
    hasZeroDownPayment: boolean,
  ): number => {
    if (isReceiptMode) {
      // In receipt mode, restricted methods are strictly fully paid or strictly valid
      if (isRestrictedMethod(method)) return value
      return value // Default assumption for receipts
    } else {
      // Acerto (Sales) Mode
      if (method === 'Boleto') return 0

      // NEW LOGIC: Cheque is always treated as Paid Value regardless of date
      if (method === 'Cheque') return value

      // For Pix, Dinheiro
      // Check if Future Date
      const today = startOfDay(new Date())
      const due = parseISO(dueDateStr)
      // If due date is strictly after today, it is NOT paid immediately
      if (isAfter(due, today)) return 0

      // If Today or Past
      if (
        isEntry &&
        hasZeroDownPayment &&
        (method === 'Pix' || method === 'Dinheiro')
      ) {
        return 0
      }

      return value
    }
  }

  // Helper to generate installments based on business rules
  const generateInstallments = (
    totalValue: number,
    count: number,
    method: PaymentMethodType,
    hasZeroDownPayment: boolean = false,
    baseDate: string = format(new Date(), 'yyyy-MM-dd'),
  ): PaymentInstallment[] => {
    let effectiveCount = count

    // Logic for Sales (Acerto) - NOT Receipt Mode
    if (
      !isReceiptMode &&
      hasZeroDownPayment &&
      (method === 'Pix' || method === 'Dinheiro')
    ) {
      effectiveCount = count - 1
    }

    // In Receipt Mode for restricted methods, count is always 1 (enforced by caller/UI)
    if (isRestrictedMethod(method)) {
      effectiveCount = 1
    }

    if (effectiveCount < 1) effectiveCount = 1

    const installmentValue =
      effectiveCount > 0 ? Number((totalValue / effectiveCount).toFixed(2)) : 0

    const totalDistributed = installmentValue * effectiveCount
    const remainder = Number((totalValue - totalDistributed).toFixed(2))

    // Determine initial date logic
    // Ensure we use Noon to avoid timezone issues when converting to string
    const start = new Date(baseDate + 'T12:00:00')

    return Array.from({ length: count }, (_, i) => {
      let dueDateObj = i === 0 ? start : addDays(start, i * 30)
      let dueDate = format(dueDateObj, 'yyyy-MM-dd')
      let value = installmentValue

      const isEntry = i === 0

      if (isReceiptMode) {
        if (isRestrictedMethod(method)) {
          if (i === 0) value += remainder
        } else {
          if (i === count - 1) value += remainder
        }
      } else {
        // Sales (Acerto) Mode Logic
        if (isEntry && (method === 'Pix' || method === 'Dinheiro')) {
          if (hasZeroDownPayment) {
            value = 0
          }
        } else {
          if (
            hasZeroDownPayment &&
            (method === 'Pix' || method === 'Dinheiro')
          ) {
            // Distribute remainder on last
            if (i === count - 1) value += remainder
          } else {
            if (i === count - 1) value += remainder
          }
        }
      }

      // Special handling for Cheque distribution of remainder if not handled above
      // For Cheque, we just distribute normally (equal parts + remainder on last)
      if (method === 'Cheque' && !isReceiptMode) {
        if (i === count - 1) value += remainder
      }

      // Calculate Paid Value dynamically
      const paidValue = calculatePaidValue(
        method,
        Number(value.toFixed(2)),
        dueDate,
        isEntry,
        hasZeroDownPayment,
      )

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
      const dueDate = format(today, 'yyyy-MM-dd')

      // Receipt Mode Constraint: Force 1x
      const installments = isRestrictedMethod(method) ? 1 : 1

      const details = generateInstallments(
        defaultValue,
        installments,
        method,
        false,
        dueDate,
      )
      const initialPaidValue = details.reduce((acc, d) => acc + d.paidValue, 0)

      const newEntry: PaymentEntry = {
        method,
        value: defaultValue,
        paidValue: initialPaidValue,
        installments: installments,
        dueDate: dueDate,
        hasZeroDownPayment: false,
        details: details,
      }
      onPaymentsChange([...payments, newEntry])
    } else {
      onPaymentsChange(payments.filter((p) => p.method !== method))
    }
  }

  const validateDate = (dateStr: string, method: PaymentMethodType) => {
    if (!isRestrictedMethod(method)) return dateStr

    const inputDate = new Date(`${dateStr}T00:00:00`)
    const today = startOfDay(new Date())

    if (isAfter(inputDate, today)) {
      return format(today, 'yyyy-MM-dd')
    }
    return dateStr
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
        if (field === 'paidValue') return p // Paid value is calculated

        // Receipt Mode Constraint: Installments
        if (
          field === 'installments' &&
          isRestrictedMethod(method) &&
          value > 1
        ) {
          return p // Ignore attempts to increase installments
        }

        let updatedValue = value

        // Receipt Mode Constraint: Date
        if (field === 'dueDate' && isRestrictedMethod(method)) {
          updatedValue = validateDate(value as string, method)
        }

        const updated = { ...p, [field]: updatedValue }

        // Recalculate details if any structural field changes
        if (
          field === 'dueDate' ||
          field === 'value' ||
          field === 'installments' ||
          field === 'hasZeroDownPayment'
        ) {
          const val = field === 'value' ? (updatedValue as number) : p.value
          const count =
            field === 'installments' ? (updatedValue as number) : p.installments
          const zeroDown =
            field === 'hasZeroDownPayment'
              ? (updatedValue as boolean)
              : p.hasZeroDownPayment
          let baseDate =
            field === 'dueDate' ? (updatedValue as string) : p.dueDate

          if (field === 'hasZeroDownPayment' && zeroDown) {
            baseDate = format(new Date(), 'yyyy-MM-dd')
            updated.dueDate = baseDate
          }

          if (isRestrictedMethod(method)) {
            baseDate = validateDate(baseDate, method)
            updated.dueDate = baseDate
          }

          const newDetails = generateInstallments(
            val,
            count,
            method,
            zeroDown,
            baseDate,
          )
          updated.details = newDetails
          updated.paidValue = Number(
            newDetails.reduce((acc, d) => acc + d.paidValue, 0).toFixed(2),
          )

          // Sync first installment date to main date if applicable
          if ((count === 1 || zeroDown) && newDetails.length > 0) {
            updated.dueDate = newDetails[0].dueDate
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

        let updatedValue = value
        // Receipt Mode Constraint: Date
        if (field === 'dueDate' && isRestrictedMethod(method)) {
          updatedValue = validateDate(value as string, method)
        }

        // If updating main date via first installment (when synced)
        if (field === 'dueDate' && index === 0) {
          const shouldSyncMain =
            (method === 'Boleto' ||
              method === 'Cheque' ||
              isRestrictedMethod(method)) &&
            p.installments === 1
          const isSemEntrada = p.hasZeroDownPayment

          if (shouldSyncMain || isSemEntrada) {
            // Need to regenerate all to keep shifts correct if logic depended on start date
            // For simplicity, just update logic here
            const updated = { ...p, dueDate: updatedValue as string }
            // Let's regenerate to be safe and consistent with generateInstallments logic
            const newDetails = generateInstallments(
              p.value,
              p.installments,
              method,
              p.hasZeroDownPayment,
              updatedValue as string,
            )
            updated.details = newDetails
            updated.paidValue = Number(
              newDetails.reduce((acc, d) => acc + d.paidValue, 0).toFixed(2),
            )
            return updated
          }
        }

        const newDetails = [...p.details]
        const currentDetail = { ...newDetails[index], [field]: updatedValue }

        // Recalculate paidValue for this installment if date changed
        if (field === 'dueDate') {
          currentDetail.paidValue = calculatePaidValue(
            method,
            currentDetail.value,
            updatedValue as string,
            index === 0,
            p.hasZeroDownPayment || false,
          )
        }

        // If value changed, update paidValue too
        if (field === 'value') {
          currentDetail.paidValue = calculatePaidValue(
            method,
            updatedValue as number,
            currentDetail.dueDate,
            index === 0,
            p.hasZeroDownPayment || false,
          )
        }

        newDetails[index] = currentDetail

        let newValue = p.value
        let newPaidValue = p.paidValue

        if (field === 'value') {
          newValue = Number(
            newDetails.reduce((acc, curr) => acc + curr.value, 0).toFixed(2),
          )
        }

        newPaidValue = Number(
          newDetails.reduce((acc, curr) => acc + curr.paidValue, 0).toFixed(2),
        )

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
    <Card
      className={cn(
        'border-muted bg-muted/10 h-full',
        disabled && 'opacity-70',
      )}
    >
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
                const isPix = entry.method === 'Pix'
                const isDinheiro = entry.method === 'Dinheiro'
                const isRestricted = isRestrictedMethod(entry.method)

                // Update: Allow installments for Dinheiro by default (Requirement)
                // Installments are disabled only if:
                // 1. Global disabled is true
                // 2. It is Pix AND not marked as zero down payment
                // 3. It is a restricted method in receipt mode
                const isInstallmentsDisabled =
                  disabled ||
                  (isPix && !entry.hasZeroDownPayment) ||
                  isRestricted

                // Visual cue if payment is future dated (paidValue = 0 but value > 0)
                const isFuture = entry.value > 0 && entry.paidValue === 0

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

                        {/* Show 'Sem ENTRADA' for Pix OR Dinheiro */}
                        {(isPix || isDinheiro) && !isRestricted && (
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
                            Valor Pago (Hoje)
                          </Label>
                          {isFuture && (
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-200">
                              Agendado
                            </span>
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
                              'pl-9 font-bold text-lg h-10 border-gray-200 bg-gray-100 text-gray-500 opacity-75',
                            )}
                            value={entry.paidValue}
                            disabled={true}
                            readOnly
                          />
                        </div>
                      </div>

                      {!isRestricted && (
                        <div className="w-full md:w-20">
                          <Label className="text-xs font-medium mb-1.5 block">
                            Parcelas
                          </Label>
                          <Select
                            value={entry.installments.toString()}
                            disabled={isInstallmentsDisabled}
                            onValueChange={(val) =>
                              handleUpdateEntry(
                                entry.method,
                                'installments',
                                parseInt(val),
                              )
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                'h-10 px-2',
                                isInstallmentsDisabled &&
                                  'opacity-50 cursor-not-allowed bg-muted',
                              )}
                            >
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
                      )}

                      <div className="w-full md:w-32">
                        <Label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Vencimento
                        </Label>
                        <Input
                          type="date"
                          className="h-10 px-2 text-xs"
                          value={entry.dueDate}
                          max={
                            isRestricted
                              ? format(new Date(), 'yyyy-MM-dd')
                              : undefined
                          }
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
                    </div>

                    {entry.installments >= 1 &&
                      entry.details &&
                      !isRestricted && (
                        <div className="pl-4 border-l-2 border-muted space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                              Detalhamento de Parcelas
                            </h4>
                          </div>

                          <div className="grid gap-3">
                            {entry.details.map((inst, idx) => {
                              const isEntrada =
                                idx === 0 && (isPix || isDinheiro)
                              const isZeroEntry =
                                isEntrada && entry.hasZeroDownPayment
                              const isPaidDisabled = true // Paid value is calculated automatically now based on date

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
                                      disabled={disabled || isZeroEntry}
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
