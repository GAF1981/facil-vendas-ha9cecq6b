import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ControleReceipt } from '@/services/controleService'
import { formatCurrency } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'

interface ControleTableProps {
  data: ControleReceipt[]
}

export function ControleTable({ data }: ControleTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[180px]">Número do Controle</TableHead>
            <TableHead className="w-[150px]">Código Cliente</TableHead>
            <TableHead>Forma de pagamento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="font-medium">Nenhum registro encontrado</p>
                  <p className="text-xs">
                    Não há dados de recebimentos disponíveis no momento.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  {row.ID_da_femea ? `#${row.ID_da_femea}` : '-'}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {row.cliente_id}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {row.forma_pagamento}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  R$ {formatCurrency(row.valor_pago)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
