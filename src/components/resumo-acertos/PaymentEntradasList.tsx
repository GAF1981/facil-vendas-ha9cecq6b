import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wallet, Plus, Trash2 } from 'lucide-react'
import { PAYMENT_METHODS } from '@/types/payment'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Entrada {
  id: string
  method: string
  value: string
}

interface PaymentEntradasListProps {
  entradas: Entrada[]
  addEntrada: () => void
  updateEntrada: (id: string, field: string, value: string) => void
  removeEntrada: (id: string) => void
  entradaTotal: number
  hasValidAmount: boolean
}

export function PaymentEntradasList({
  entradas,
  addEntrada,
  updateEntrada,
  removeEntrada,
  entradaTotal,
  hasValidAmount,
}: PaymentEntradasListProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-green-50/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Detalhamento de Entrada
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={addEntrada}
          className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-100"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Entrada
        </Button>
      </div>

      {entradas.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma entrada imediata registrada.
        </p>
      ) : (
        <div className="space-y-3">
          {entradas.map((entrada, idx) => (
            <div
              key={entrada.id}
              className="flex flex-col gap-3 bg-white p-3 rounded border border-green-100 shadow-sm relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-green-800">
                  Entrada (Pagamento Imediato) {idx + 1}
                </span>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Valor da Entrada (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={entrada.value}
                    onChange={(e) =>
                      updateEntrada(entrada.id, 'value', e.target.value)
                    }
                    className="h-9 font-medium"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select
                    value={entrada.method}
                    onValueChange={(val) =>
                      updateEntrada(entrada.id, 'method', val)
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.filter((m) => m !== 'Boleto').map(
                        (m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEntrada(entrada.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entradaTotal > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-green-200/50">
          <span className="text-xs text-green-700 font-medium">
            Total de Entradas:
          </span>
          <span
            className={cn(
              'text-sm font-bold',
              !hasValidAmount ? 'text-red-600' : 'text-green-800',
            )}
          >
            R$ {formatCurrency(entradaTotal)}
          </span>
        </div>
      )}

      {!hasValidAmount && (
        <div className="text-xs text-red-600 font-medium">
          O valor total das entradas não pode ser maior que o valor devido do
          pedido.
        </div>
      )}
    </div>
  )
}
