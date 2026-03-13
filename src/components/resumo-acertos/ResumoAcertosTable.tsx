import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Edit3, Printer, Trash2 } from 'lucide-react'
import { SettlementSummary } from '@/services/resumoAcertosService'
import { useNavigate } from 'react-router-dom'

interface ResumoAcertosTableProps {
  loading: boolean
  data: SettlementSummary[]
  onEditPayment: (order: SettlementSummary) => void
  onReprint: (orderId: number) => void
  onDelete: (orderId: number) => void
  reprintingId: number | null
}

export function ResumoAcertosTable({
  loading,
  data,
  onEditPayment,
  onReprint,
  onDelete,
  reprintingId,
}: ResumoAcertosTableProps) {
  const navigate = useNavigate()

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">Pedido</TableHead>
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead className="w-[80px]">Cód. Cli</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Vl. Venda</TableHead>
            <TableHead>Pagto (BD)</TableHead>
            <TableHead>Pagto (Receb.)</TableHead>
            <TableHead className="text-right">Valor Pago</TableHead>
            <TableHead className="text-center w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-32 text-center text-muted-foreground"
              >
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                Carregando dados...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-32 text-center text-muted-foreground"
              >
                Nenhum acerto encontrado para o filtro atual.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.orderId} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  #{row.orderId}
                </TableCell>
                <TableCell className="text-xs">
                  {safeFormatDate(row.acertoDate, 'dd/MM/yy')}
                  <span className="block text-[10px] text-muted-foreground">
                    {row.acertoTime.substring(0, 5)}
                  </span>
                </TableCell>
                <TableCell
                  className="text-sm truncate max-w-[150px]"
                  title={row.employee}
                >
                  {row.employee}
                </TableCell>
                <TableCell className="font-mono text-xs text-center">
                  {row.clientCode}
                </TableCell>
                <TableCell
                  className="font-medium text-sm truncate max-w-[200px]"
                  title={row.clientName}
                >
                  {row.clientName}
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {formatCurrency(row.totalSalesValue)}
                </TableCell>
                <TableCell
                  className="text-xs text-muted-foreground truncate max-w-[120px]"
                  title={row.paymentFormsBD}
                >
                  {row.paymentFormsBD || '-'}
                </TableCell>
                <TableCell className="text-xs">
                  {row.payments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {row.payments.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 rounded border border-muted bg-muted/50 whitespace-nowrap w-fit"
                        >
                          {p.method}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">
                  R$ {formatCurrency(row.totalPaid)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                      onClick={() =>
                        navigate(`/acerto?editOrderId=${row.orderId}`)
                      }
                      title="Editar Pedido"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                      onClick={() => onEditPayment(row)}
                      title="Editar Pagamento"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => onReprint(row.orderId)}
                      disabled={reprintingId === row.orderId}
                      title="Reimprimir Pedido (80mm)"
                    >
                      {reprintingId === row.orderId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => onDelete(row.orderId)}
                      title="Excluir Pedido Permanentemente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
