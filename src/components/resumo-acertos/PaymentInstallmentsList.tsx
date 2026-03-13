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
import { CalendarDays, Plus, Trash2 } from 'lucide-react'
import { PAYMENT_METHODS } from '@/types/payment'

interface Installment {
  id: string
  method: string
  value: string
  dueDate: string
}

interface PaymentInstallmentsListProps {
  installments: Installment[]
  addInstallment: () => void
  updateInstallment: (index: number, field: string, value: string) => void
  removeInstallment: (index: number) => void
}

export function PaymentInstallmentsList({
  installments,
  addInstallment,
  updateInstallment,
  removeInstallment,
}: PaymentInstallmentsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          Detalhamento das Parcelas
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={addInstallment}
          className="h-8 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Parcela
        </Button>
      </div>

      {installments.map((inst, idx) => (
        <div
          key={inst.id}
          className="flex items-end gap-3 p-3 rounded-md border bg-card relative"
        >
          <div className="absolute -left-2 -top-2 bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
            {idx + 1}
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Forma</Label>
            <Select
              value={inst.method}
              onValueChange={(val) => updateInstallment(idx, 'method', val)}
            >
              <SelectTrigger className="h-8">
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
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Vencimento</Label>
            <Input
              type="date"
              value={inst.dueDate}
              onChange={(e) =>
                updateInstallment(idx, 'dueDate', e.target.value)
              }
              className="h-8"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={inst.value}
              onChange={(e) => updateInstallment(idx, 'value', e.target.value)}
              className="h-8 text-right font-medium"
              placeholder="0.00"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeInstallment(idx)}
            className="h-8 w-8 text-muted-foreground hover:text-red-600 mb-[1px]"
            disabled={installments.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
