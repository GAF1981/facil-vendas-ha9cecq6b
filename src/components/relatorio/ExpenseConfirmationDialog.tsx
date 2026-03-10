import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExpenseReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Receipt, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpenseConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseReportRow | null
  onConfirm: (data: {
    status: string
    banco_pagamento: string
    banco_outro: string | null
    data_lancamento: string
  }) => void
}

export function ExpenseConfirmationDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
}: ExpenseConfirmationDialogProps) {
  const [banco, setBanco] = useState('')
  const [bancoOutro, setBancoOutro] = useState('')
  const [dataLancamento, setDataLancamento] = useState('')

  useEffect(() => {
    if (expense && open) {
      setBanco(expense.banco_pagamento || '')
      setBancoOutro(expense.banco_outro || '')
      setDataLancamento(
        expense.data_lancamento || new Date().toISOString().split('T')[0],
      )
    }
  }, [expense, open])

  const handleConfirm = () => {
    if (!expense) return
    onConfirm({
      status: 'Confirmado',
      banco_pagamento: banco,
      banco_outro: banco === 'Outros' ? bancoOutro : null,
      data_lancamento: dataLancamento,
    })
  }

  if (!expense) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirmação de Despesa</DialogTitle>
          <DialogDescription>
            Revise os detalhes da despesa e confirme o lançamento bancário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
            <div>
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Data
              </div>
              <div className="font-medium mt-0.5">
                {safeFormatDate(expense.data, 'dd/MM/yyyy')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Valor
              </div>
              <div className="font-mono font-semibold text-red-600 mt-0.5">
                R$ {formatCurrency(expense.valor)}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Funcionário
              </div>
              <div className="font-medium mt-0.5">
                {expense.funcionario_nome}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wider">
                Detalhes
              </div>
              <div className="font-medium mt-0.5">
                {expense.detalhamento} ({expense.grupo})
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-1.5">
                <Receipt className="h-4 w-4" />
                Reconciliação Bancária
              </h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-52">
                    Aqui você deve informar em qual banco e em qual data esta
                    despesa foi efetivamente descontada.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco de Pagamento</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BS2">BS2</SelectItem>
                    <SelectItem value="Cora">Cora</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Lançamento</Label>
                <Input
                  type="date"
                  value={dataLancamento}
                  onChange={(e) => setDataLancamento(e.target.value)}
                />
              </div>
            </div>

            {banco === 'Outros' && (
              <div className="space-y-2 animate-fade-in-down">
                <Label>Nome do Banco (Outros)</Label>
                <Input
                  value={bancoOutro}
                  onChange={(e) => setBancoOutro(e.target.value)}
                  placeholder="Especifique o banco"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              expense.status === 'Confirmado'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white',
            )}
          >
            {expense.status === 'Confirmado'
              ? 'Salvar Alterações'
              : 'Confirmar Lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
