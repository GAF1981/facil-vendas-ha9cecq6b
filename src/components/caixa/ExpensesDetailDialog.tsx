import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { caixaService, ExpenseDetail } from '@/services/caixaService'
import { Rota } from '@/types/rota'
import { formatCurrency } from '@/lib/formatters'
import { formatDateTimeBR } from '@/lib/dateUtils'
import { Loader2 } from 'lucide-react'

interface ExpensesDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: number | null
  employeeName: string
  route: Rota | undefined
}

export function ExpensesDetailDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  route,
}: ExpensesDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExpenseDetail[]>([])

  useEffect(() => {
    if (open && employeeId && route) {
      setLoading(true)
      caixaService
        .getEmployeeExpenses(employeeId, route)
        .then(setData)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setData([])
    }
  }, [open, employeeId, route])

  const total = data.reduce((acc, row) => acc + row.valor, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Despesas: {employeeName}
            <br />
            <span className="text-sm font-normal text-muted-foreground">
              Total: R$ {formatCurrency(total)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Detalhamento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground h-24"
                  >
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTimeBR(row.data)}</TableCell>
                    <TableCell>{row.grupo}</TableCell>
                    <TableCell>{row.detalhamento}</TableCell>
                    <TableCell className="text-right text-red-700 font-medium">
                      R$ {formatCurrency(row.valor)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
