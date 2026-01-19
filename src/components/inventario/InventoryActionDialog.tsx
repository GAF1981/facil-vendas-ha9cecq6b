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
import { parseCurrency } from '@/lib/formatters'
import { ProductRow } from '@/types/product'
import { Loader2 } from 'lucide-react'

interface InventoryActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductRow | null
  type: 'COMPRA' | 'PERDA' | 'ROUBO' | 'OUTROS' | null
  onConfirm: (quantity: number, value: number, reason?: string) => Promise<void>
}

export function InventoryActionDialog({
  open,
  onOpenChange,
  product,
  type,
  onConfirm,
}: InventoryActionDialogProps) {
  const [quantity, setQuantity] = useState('')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setQuantity('')
      setReason('')
      // Automated Cost Calculation Logic
      if (type === 'COMPRA' && product && product.PREÇO) {
        const sellingPrice = parseCurrency(product.PREÇO)
        const suggestedCost = sellingPrice * 0.3 // 30% of selling price
        setValue(suggestedCost.toFixed(2))
      } else {
        setValue('')
      }
    }
  }, [open, product, type])

  const handleConfirm = async () => {
    const qty = Number(quantity)
    const val = parseCurrency(value)

    if (qty <= 0) return

    setLoading(true)
    try {
      await onConfirm(qty, val, reason)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const title =
    type === 'COMPRA'
      ? 'Registrar Compra'
      : type === 'PERDA'
        ? 'Registrar Perda'
        : type === 'ROUBO'
          ? 'Registrar Roubo'
          : 'Registrar Movimento'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <div className="font-medium text-sm">
              {product?.PRODUTO || 'Produto não selecionado'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>
                {type === 'COMPRA' ? 'Valor Unit. (Custo)' : 'Valor Estimado'}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
              />
              {type === 'COMPRA' && (
                <p className="text-[10px] text-muted-foreground">
                  Sugerido: 30% do preço de venda
                </p>
              )}
            </div>
          </div>

          {(type === 'PERDA' || type === 'ROUBO' || type === 'OUTROS') && (
            <div className="space-y-2">
              <Label>Motivo / Observação</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !quantity}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
