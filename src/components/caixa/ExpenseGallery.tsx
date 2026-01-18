import { ExpenseDetail } from '@/services/caixaService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/formatters'
import { formatDateTimeBR } from '@/lib/dateUtils'
import { ArrowUpCircle, CheckCircle2, XCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ExpenseGalleryProps {
  items: ExpenseDetail[]
}

export function ExpenseGallery({ items }: ExpenseGalleryProps) {
  const total = items.reduce(
    (acc, item) => (item.saiuDoCaixa ? acc + item.valor : acc),
    0,
  )

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
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Detalhamento</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead className="text-center">Saiu do Caixa?</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
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
    </Card>
  )
}
