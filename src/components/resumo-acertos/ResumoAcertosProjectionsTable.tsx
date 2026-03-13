import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2 } from 'lucide-react'
import { ProjectionReportRow } from '@/services/reportsService'

interface ResumoAcertosProjectionsTableProps {
  loading: boolean
  data: ProjectionReportRow[]
}

export function ResumoAcertosProjectionsTable({
  loading,
  data,
}: ResumoAcertosProjectionsTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">Pedido</TableHead>
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Vl. Venda</TableHead>
            <TableHead className="text-center">Int. entre Pedidos</TableHead>
            <TableHead className="text-center">Int. Médio Global</TableHead>
            <TableHead className="text-right">Média Mensal Global</TableHead>
            <TableHead className="text-right">Projeção (Hoje)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Calculando projeções e médias...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="h-32 text-center text-muted-foreground"
              >
                Nenhum histórico encontrado para projeção com o filtro atual.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  {row.orderId < 0 ? 'Saldo Ini.' : `#${row.orderId}`}
                </TableCell>
                <TableCell className="text-xs">
                  {safeFormatDate(row.orderDate, 'dd/MM/yy')}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {row.clientName}
                </TableCell>
                <TableCell className="text-right">
                  R$ {formatCurrency(row.totalValue)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {row.daysBetweenOrders !== null
                    ? `${row.daysBetweenOrders} dias`
                    : '-'}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {row.indexDays !== null
                    ? `${row.indexDays.toFixed(1)} dias`
                    : '-'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  R$ {formatCurrency(row.monthlyAverage || 0)}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  R$ {formatCurrency(row.projection || 0)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
