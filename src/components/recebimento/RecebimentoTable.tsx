import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Printer } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { RecebimentoInstallment } from '@/types/recebimento'
import { cn } from '@/lib/utils'

interface RecebimentoTableProps {
  loading: boolean
  installments: RecebimentoInstallment[]
  selectedInstallmentId: number | null
  onSelectInstallment: (id: number) => void
  onGenerateReceipt: (inst: RecebimentoInstallment) => void
}

export function RecebimentoTable({
  loading,
  installments,
  selectedInstallmentId,
  onSelectInstallment,
  onGenerateReceipt,
}: RecebimentoTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Método Orig.</TableHead>
            <TableHead className="text-right">Valor Parcela</TableHead>
            <TableHead className="text-right text-green-600">
              Valor Pago
            </TableHead>
            <TableHead className="text-right text-red-600 font-bold">
              Débito
            </TableHead>
            <TableHead className="w-[50px] text-center">Sel.</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : installments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma parcela encontrada.
              </TableCell>
            </TableRow>
          ) : (
            installments.map((inst) => {
              const isSelected = selectedInstallmentId === inst.id
              const saldo = Math.max(
                0,
                (inst.valor_registrado || 0) - inst.valor_pago,
              )
              const valReg = inst.valor_registrado || 0
              const valPago = inst.valor_pago || 0

              let statusBadge
              if (valPago >= valReg && valReg > 0) {
                statusBadge = (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">
                    Pago
                  </Badge>
                )
              } else if (valPago > 0) {
                statusBadge = (
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
                    Parcial
                  </Badge>
                )
              } else {
                statusBadge = (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    Pendente
                  </Badge>
                )
              }

              return (
                <TableRow
                  key={inst.id}
                  className={isSelected ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    {safeFormatDate(inst.vencimento, 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{inst.cliente_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        #{inst.cliente_codigo}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">#{inst.venda_id}</TableCell>
                  <TableCell>{inst.forma_pagamento}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(inst.valor_registrado || 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {formatCurrency(inst.valor_pago)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">
                    {formatCurrency(saldo)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectInstallment(inst.id)}
                    />
                  </TableCell>
                  <TableCell className="text-center">{statusBadge}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onGenerateReceipt(inst)}
                      title="Gerar Comprovante"
                    >
                      <Printer className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
