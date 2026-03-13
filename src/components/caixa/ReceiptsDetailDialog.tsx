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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { caixaService, ReceiptDetail } from '@/services/caixaService'
import { Rota } from '@/types/rota'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Trash2 } from 'lucide-react'

interface ReceiptsDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: number | null
  employeeName: string
  route: Rota | undefined
  onDeleteReceipt?: (id: number) => void
}

export function ReceiptsDetailDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  route,
  onDeleteReceipt,
}: ReceiptsDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReceiptDetail[]>([])
  const [receiptToDelete, setReceiptToDelete] = useState<ReceiptDetail | null>(
    null,
  )

  useEffect(() => {
    if (open && employeeId && route) {
      setLoading(true)
      caixaService
        .getEmployeeReceipts(employeeId, route)
        .then(setData)
        .catch((err) => console.error(err))
        .finally(() => setLoading(false))
    } else {
      setData([])
    }
  }, [open, employeeId, route])

  const handleConfirmDelete = () => {
    if (receiptToDelete && onDeleteReceipt) {
      onDeleteReceipt(receiptToDelete.id)
      setData((prev) => prev.filter((r) => r.id !== receiptToDelete.id))
    }
    setReceiptToDelete(null)
  }

  const total = data.reduce((acc, row) => acc + row.valor, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Recebimentos: {employeeName}
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
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Forma</TableHead>
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
                    Nenhum recebimento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{safeFormatDate(row.data)}</TableCell>
                    <TableCell>{row.clienteNome}</TableCell>
                    <TableCell>{row.forma}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-green-700 font-medium">
                          R$ {formatCurrency(row.valor)}
                        </span>
                        {onDeleteReceipt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => setReceiptToDelete(row)}
                            title="Excluir Pagamento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <AlertDialog
        open={!!receiptToDelete}
        onOpenChange={(open) => !open && setReceiptToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pagamento de R${' '}
              {receiptToDelete ? formatCurrency(receiptToDelete.valor) : '0,00'}
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
