import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { QuitarDividaItem } from '@/services/quitarDividaService'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: QuitarDividaItem | null
  onConfirm: (
    id: number,
    amount: number,
    date: string,
    method: string,
  ) => Promise<void>
}

export function QuitarDividaPaymentDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && item) {
      setAmount(item.saldo_devedor.toString())
      setMethod(item.forma_pagamento || 'Pix')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [open, item])

  const handleConfirm = async () => {
    if (!item) return
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Aviso',
        description: 'Informe um valor válido.',
        variant: 'destructive',
      })
      return
    }
    // Variação de tolerância (1 centavo) para precisões financeiras e imprecisão float
    if (numAmount > item.saldo_devedor + 0.01) {
      toast({
        title: 'Aviso',
        description: 'O valor não pode ser maior que o saldo devedor.',
        variant: 'destructive',
      })
      return
    }
    if (!method) {
      toast({
        title: 'Aviso',
        description: 'Informe a forma de pagamento.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await onConfirm(item.id, numAmount, date, method)
      onOpenChange(false)
    } catch (e) {
      // erro propagado tratado pelo pai
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Processar Pagamento - Dívida C{item.cobranca_seq}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>
              Valor a Pagar (Saldo Devedor: R${' '}
              {item.saldo_devedor.toFixed(2).replace('.', ',')})
            </Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={item.saldo_devedor}
            />
          </div>
          <div className="grid gap-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Cartão de Crédito">
                  Cartão de Crédito
                </SelectItem>
                <SelectItem value="Cartão de Débito">
                  Cartão de Débito
                </SelectItem>
                <SelectItem value="Transferência Bancária">
                  Transferência Bancária
                </SelectItem>
              </SelectContent>
            </Select>
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
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
