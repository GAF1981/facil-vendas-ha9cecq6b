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
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface PixTableProps {
  data: PixReceiptRow[]
  onConfer: (receipt: PixReceiptRow) => void
}

export function PixTable({ data, onConfer }: PixTableProps) {
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[100px]">Número do Pedido</TableHead>
            <TableHead className="w-[80px]">Código Cliente</TableHead>
            <TableHead>Nome Cliente</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Forma Pagamento</TableHead>
            <TableHead>Nome no Pix</TableHead>
            <TableHead>Banco Pix</TableHead>
            <TableHead>Data do Pix Realizado</TableHead>
            <TableHead>Conferido por</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum recebimento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="font-mono font-medium text-blue-600">
                  #{row.id_da_femea || row.venda_id}
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
                <TableCell className="text-sm">{row.forma_pagamento}</TableCell>
                <TableCell className="text-sm">
                  {row.nome_no_pix || (
                    <span className="text-muted-foreground italic">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {row.banco_pix ? (
                    <Badge variant="outline">{row.banco_pix}</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>

                {/* Data do Pix Realizado - Displays confirmado_por */}
                <TableCell className="text-sm">
                  {row.confirmado_por || '-'}
                </TableCell>

                {/* Conferido por - Displays data_pix_realizado */}
                <TableCell className="text-sm text-muted-foreground">
                  {row.data_pix_realizado
                    ? format(parseISO(row.data_pix_realizado), 'dd/MM/yyyy')
                    : '-'}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={row.confirmado_por ? 'outline' : 'default'}
                    className={
                      row.confirmado_por
                        ? 'border-green-200 text-green-700 hover:text-green-800 hover:bg-green-50'
                        : ''
                    }
                    onClick={() => onConfer(row)}
                  >
                    {row.confirmado_por ? (
                      <>
                        <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-3.5 w-3.5" />
                        Registrar Conferência
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
