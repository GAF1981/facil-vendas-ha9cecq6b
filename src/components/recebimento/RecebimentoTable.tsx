import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Printer, AlertCircle } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { RecebimentoInstallment } from '@/types/recebimento'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : installments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
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
                    <div className="flex items-center justify-end gap-2">
                      <span>{formatCurrency(inst.valor_pago)}</span>
                      {inst.valor_pago > 0 && (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-amber-500 hover:text-amber-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertCircle className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-2 text-xs">
                              <h4 className="font-semibold mb-2 text-muted-foreground">
                                Detalhes do Recebimento
                              </h4>
                              <div className="space-y-1">
                                <div className="flex justify-between border-b pb-1">
                                  <span>Método:</span>
                                  <span className="font-medium">
                                    {inst.forma_pagamento}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Recebido por:</span>
                                  <span className="font-medium">
                                    {inst.funcionario_nome || 'N/D'}
                                  </span>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-green-100 text-green-700"
                            onClick={(e) => {
                              e.stopPropagation()
                              onGenerateReceipt(inst)
                            }}
                            title="Imprimir Recibo 80mm"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
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
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
