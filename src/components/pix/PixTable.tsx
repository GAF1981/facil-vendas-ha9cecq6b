import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PixReceiptRow } from '@/types/pix'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import {
  CheckCircle2,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/useUserStore'

interface PixTableProps {
  data: PixReceiptRow[]
  onConfer: (receipt: PixReceiptRow) => void
  onSort: (key: string) => void
  sortConfig: {
    key: string
    direction: 'asc' | 'desc'
  }
}

export function PixTable({
  data,
  onConfer,
  onSort,
  sortConfig,
}: PixTableProps) {
  const { employee } = useUserStore()

  // Access Control Logic
  const canConfer = (() => {
    if (!employee || !employee.setor) return false
    const allowedSectors = ['Administrador', 'Financeiro', 'Gerente']
    const sectors = Array.isArray(employee.setor)
      ? employee.setor
      : [employee.setor]
    return sectors.some((s) => allowedSectors.includes(s))
  })()

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    )
  }

  const renderSortableHead = (
    label: string,
    key: string,
    className?: string,
  ) => (
    <TableHead
      className={cn(
        'cursor-pointer hover:bg-muted/80 transition-colors select-none',
        className,
      )}
      onClick={() => onSort(key)}
    >
      <div
        className={cn(
          'flex items-center',
          className?.includes('text-right') && 'justify-end',
        )}
      >
        {label}
        <SortIcon columnKey={key} />
      </div>
    </TableHead>
  )

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[60px] text-center">Rota</TableHead>
            {renderSortableHead('Número do Pedido', 'id_da_femea', 'w-[140px]')}
            {renderSortableHead('Data Acerto', 'data_acerto')}
            {renderSortableHead('Data Pagto', 'data_pagamento')}
            <TableHead>Vendedor</TableHead>
            <TableHead className="w-[80px]">Código Cliente</TableHead>
            <TableHead>Nome Cliente</TableHead>
            {renderSortableHead('Valor', 'valor_pago', 'text-right')}
            <TableHead>Forma Pagamento</TableHead>
            <TableHead>Nome no Pix</TableHead>
            <TableHead>Banco Pix</TableHead>
            {renderSortableHead('Data Pix Realizado', 'data_pix_realizado')}
            <TableHead>Conferido por</TableHead>
            <TableHead className="text-center">Conferido</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={15}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum recebimento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="text-center font-mono text-xs">
                  {row.rota_id ? `#${row.rota_id}` : '-'}
                </TableCell>
                <TableCell className="font-mono font-medium text-blue-600">
                  #{row.id_da_femea || row.venda_id}
                </TableCell>
                <TableCell className="text-sm">
                  {row.data_acerto
                    ? format(parseISO(row.data_acerto), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {row.data_pagamento
                    ? format(parseISO(row.data_pagamento), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>
                <TableCell className="text-sm truncate max-w-[120px]">
                  {row.vendedor_pedido || '-'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.cliente_id}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{row.cliente_nome}</span>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  R$ {formatCurrency(row.valor_pago || 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.forma_pagamento}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {row.nome_no_pix || '-'}
                </TableCell>
                <TableCell>
                  {row.banco_pix ? (
                    <Badge variant="outline">{row.banco_pix}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>

                <TableCell className="text-sm">
                  {row.data_pix_realizado
                    ? format(parseISO(row.data_pix_realizado), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {row.confirmado_por || '-'}
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    variant={row.confirmado_por ? 'default' : 'secondary'}
                    className={cn(
                      row.confirmado_por
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
                        : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200',
                    )}
                  >
                    {row.confirmado_por ? 'SIM' : 'NÃO'}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={row.confirmado_por ? 'ghost' : 'default'}
                    disabled={!canConfer}
                    className={cn(
                      row.confirmado_por
                        ? 'text-muted-foreground hover:text-foreground'
                        : 'bg-blue-600 hover:bg-blue-700',
                      !canConfer && 'opacity-50 cursor-not-allowed',
                    )}
                    onClick={() => onConfer(row)}
                    title={
                      !canConfer ? 'Você não tem permissão para conferir.' : ''
                    }
                  >
                    {row.confirmado_por ? (
                      <>
                        <Edit2 className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </>
                    ) : canConfer ? (
                      <>
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Conferir
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-3.5 w-3.5" />
                        Bloqueado
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
