import { format, parseISO } from 'date-fns'
import { CollectionAction } from '@/types/cobranca'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2 } from 'lucide-react'

interface GlobalActionsTableProps {
  actions: CollectionAction[]
  loading: boolean
}

export function GlobalActionsTable({
  actions,
  loading,
}: GlobalActionsTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 border rounded-md bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[100px]">Data</TableHead>
              <TableHead className="min-w-[120px]">Funcionário</TableHead>
              <TableHead className="min-w-[150px]">Cliente</TableHead>
              <TableHead className="min-w-[80px]">Pedido</TableHead>
              <TableHead className="min-w-[200px]">Ação</TableHead>
              <TableHead className="min-w-[120px]">Alvo (Parcela)</TableHead>
              <TableHead className="min-w-[150px]">
                Nova Previsão / Acordo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center h-24 text-muted-foreground"
                >
                  Nenhuma ação registrada.
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action) => (
                <TableRow
                  key={action.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="text-xs whitespace-nowrap">
                    {safeFormatDate(action.dataAcao, 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {action.funcionarioNome || 'Sistema'}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {action.clienteNome}{' '}
                    <span className="text-muted-foreground font-normal">
                      (#{action.clienteId})
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {action.pedidoId}
                  </TableCell>
                  <TableCell className="text-xs max-w-[300px] whitespace-pre-wrap">
                    {action.acao}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {action.targetFormaPagamento || '-'}
                    {action.targetVencimento
                      ? ` (${safeFormatDate(action.targetVencimento, 'dd/MM/yy')})`
                      : ''}
                  </TableCell>
                  <TableCell className="text-xs">
                    {action.installments && action.installments.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {action.installments.map((inst, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] font-normal w-fit"
                          >
                            {safeFormatDate(inst.vencimento, 'dd/MM')} - R${' '}
                            {formatCurrency(inst.valor)}
                          </Badge>
                        ))}
                      </div>
                    ) : action.novaDataCombinada ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {safeFormatDate(action.novaDataCombinada, 'dd/MM/yyyy')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
