import { ExpenseDetail } from '@/services/caixaService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import { formatDateTimeBR } from '@/lib/dateUtils'
import { ArrowUpCircle, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useState } from 'react'
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
import { caixaService } from '@/services/caixaService'
import { useToast } from '@/hooks/use-toast'

interface ExpenseGalleryProps {
  items: ExpenseDetail[]
}

export function ExpenseGallery({ items: initialItems }: ExpenseGalleryProps) {
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { toast } = useToast()

  const items = initialItems.filter((item) => !deletedIds.has(item.id))

  const total = items.reduce(
    (acc, item) => (item.saiuDoCaixa ? acc + item.valor : acc),
    0,
  )

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await caixaService.deleteDespesa(deleteId)
      setDeletedIds((prev) => new Set(prev).add(deleteId))
      toast({
        title: 'Sucesso',
        description: 'Despesa excluída com sucesso.',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao excluir despesa.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4 px-6 border-b bg-red-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-700">
            <ArrowUpCircle className="h-5 w-5" />
            Galeria de Saídas
          </CardTitle>
          <span className="text-sm font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">
            {items.length} registros
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-[400px] overflow-auto">
          <div className="min-w-[500px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead>Detalhamento</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Saiu do Caixa?</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-24 text-muted-foreground"
                    >
                      Nenhuma despesa registrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap font-mono text-muted-foreground">
                        {formatDateTimeBR(item.data)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {item.detalhamento}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded w-fit border">
                            {item.grupo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.funcionarioNome
                          ? item.funcionarioNome.split(' ')[0]
                          : 'N/D'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          {item.saiuDoCaixa ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-300" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-bold',
                          item.saiuDoCaixa
                            ? 'text-red-700'
                            : 'text-muted-foreground line-through decoration-red-700/30',
                        )}
                      >
                        R$ {formatCurrency(item.valor)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(item.id)}
                          title="Excluir Despesa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <div className="p-4 bg-muted/20 border-t mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-muted-foreground">
            Total Saídas (Caixa)
          </span>
          <span className="text-lg font-bold text-red-700">
            R$ {formatCurrency(total)}
          </span>
        </div>
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir esta despesa? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
