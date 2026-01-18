import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, DollarSign } from 'lucide-react'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { PAYMENT_METHODS } from '@/types/payment'
import { format } from 'date-fns'

interface MotoqueiroReceiptDialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  clientName: string
  clientId: number
  onConfirm: (amount: number, method: string, date: string) => Promise<void>
}

export function MotoqueiroReceiptDialog({
  open,
  onClose,
  orderId,
  clientName,
  clientId,
  onConfirm,
}: MotoqueiroReceiptDialogProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<string>('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (open) {
      setAmount('')
      setMethod('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [open])

  const handleConfirm = async () => {
    const numAmount = parseCurrency(amount)

    if (numAmount <= 0) return
    if (!method) return

    setLoading(true)
    try {
      await onConfirm(numAmount, method, date)
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const isAmountValid = parseCurrency(amount) > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Registrar Recebimento
          </DialogTitle>
          <DialogDescription>
            Registrando pagamento para <strong>{clientName}</strong> (Pedido #
            {orderId})
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Valor Recebido (R$)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold"
              placeholder="0,00"
              autoFocus
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

          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !isAmountValid || !method}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Confirmar Recebimento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
