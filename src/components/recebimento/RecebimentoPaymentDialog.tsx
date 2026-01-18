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
import { ConsolidatedRecebimento } from '@/types/recebimento'
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
  installment: ConsolidatedRecebimento | null
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
  const [method, setMethod] = useState<string>('')

  // Pix State
  const [pixName, setPixName] = useState('')
  const [pixBank, setPixBank] = useState('BS2')

  useEffect(() => {
    if (open && installment) {
      // Use the specific installment saldo
      const remaining = Math.max(0, installment.saldo)
      setAmount(formatCurrency(remaining))
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'))
      // Preserve original method or default
      setMethod(installment.forma_pagamento || 'Dinheiro')
      setPixName('')
      setPixBank('BS2')
    }
  }, [open, installment])

  const remainingBalance = installment ? Math.max(0, installment.saldo) : 0

  const handleConfirm = async () => {
    if (!installment) return
    const numAmount = parseCurrency(amount)

    // Validation
    if (numAmount <= 0) return
    if (!method) return

    // Strict Overpayment Validation
    if (numAmount > remainingBalance + 0.05) {
      alert(
        `O valor do pagamento (R$ ${formatCurrency(numAmount)}) não pode exceder o saldo devedor desta parcela (R$ ${formatCurrency(remainingBalance)}).`,
      )
      return
    }

    // Pix Validation
    if (method === 'Pix') {
      if (!pixName.trim() || !pixBank) return
    }

    setLoading(true)
    try {
      await onConfirm(
        installment.id,
        numAmount,
        paymentDate,
        method,
        method === 'Pix' ? { nome: pixName, banco: pixBank } : undefined,
      )
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  if (!installment) return null

  const isAmountValid = parseCurrency(amount) > 0
  const isPixValid = method !== 'Pix' || (!!pixName.trim() && !!pixBank)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Processar Pagamento de Parcela</DialogTitle>
          <DialogDescription>
            Parcela #{installment.id} - Pedido #{installment.venda_id}
            <br />
            Cliente: {installment.cliente_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-muted p-4 rounded-lg border flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Saldo da Parcela
            </span>
            <span className="text-2xl font-bold mt-1 text-blue-600">
              R$ {formatCurrency(remainingBalance)}
            </span>
          </div>

          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
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
                  placeholder="Nome do pagador"
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
            <Label>Valor a Pagar</Label>
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
            disabled={loading || !isAmountValid || !isPixValid || !method}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="mr-2 h-4 w-4" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
