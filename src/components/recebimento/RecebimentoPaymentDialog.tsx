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
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { Loader2, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { RecebimentoInstallment } from '@/types/recebimento'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHODS } from '@/types/payment'

interface RecebimentoPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installment: RecebimentoInstallment | null
  onConfirm: (
    installmentId: number,
    amount: number,
    date: string,
    method: string,
    pixDetails?: { nome: string; banco: string },
  ) => Promise<void>
}

// Banks List with BS2 and CORA
const BANKS = [
  'BS2',
  'CORA',
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
  installment,
  onConfirm,
}: RecebimentoPaymentDialogProps) {
  const [loading, setLoading] = useState(false)

  // Form State
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(
    format(new Date(), 'yyyy-MM-dd'),
  )
  const [registrationDate, setRegistrationDate] = useState(
    format(new Date(), 'dd/MM/yyyy'),
  )
  const [method, setMethod] = useState<string>('')

  // Pix State
  const [pixName, setPixName] = useState('')
  const [pixBank, setPixBank] = useState('BS2')

  useEffect(() => {
    if (open && installment) {
      const remaining = Math.max(
        0,
        (installment.valor_registrado || 0) - installment.valor_pago,
      )
      setAmount(formatCurrency(remaining))
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      setRegistrationDate(format(new Date(), 'dd/MM/yyyy'))
      setMethod(installment.forma_pagamento || 'Dinheiro')
      setPixName('')
      setPixBank('BS2')
    }
  }, [open, installment])

  const handleConfirm = async () => {
    if (!installment) return
    const numAmount = parseCurrency(amount)

    if (numAmount <= 0) return

    setLoading(true)
    try {
      await onConfirm(
        installment.id,
        numAmount,
        paymentDate,
        method,
        method === 'Pix' ? { nome: pixName, banco: pixBank } : undefined,
      )
      // Close modal ONLY on success (when onConfirm resolves without error)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      // Error is handled by parent (toast), modal stays open so user can retry
    } finally {
      setLoading(false)
    }
  }

  if (!installment) return null

  const remainingBalance = Math.max(
    0,
    (installment.valor_registrado || 0) - installment.valor_pago,
  )

  const isAmountValid = parseCurrency(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Processar Pagamento de Parcela</DialogTitle>
          <DialogDescription>
            Pedido #{installment.venda_id} - {installment.cliente_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-muted p-4 rounded-lg border flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Saldo a Pagar da Parcela
            </span>
            <span className="text-2xl font-bold mt-1 text-blue-600">
              R$ {formatCurrency(remainingBalance)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Registro</Label>
              <Input
                value={registrationDate}
                disabled
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Recebimento</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
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

          {method === 'Pix' && (
            <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-blue-50/50">
              <div className="space-y-2">
                <Label className="text-xs">Nome no Pix</Label>
                <Input
                  value={pixName}
                  onChange={(e) => setPixName(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Banco</Label>
                <Select value={pixBank} onValueChange={setPixBank}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
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
          )}

          <div className="space-y-2">
            <Label>Valor Recebido</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-right font-bold text-lg"
              placeholder="0,00"
            />
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
            onClick={handleConfirm}
            disabled={loading || !isAmountValid}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="mr-2 h-4 w-4" />
            )}
            Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
