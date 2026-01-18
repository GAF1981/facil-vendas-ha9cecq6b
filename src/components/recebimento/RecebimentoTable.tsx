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
import { ConsolidatedRecebimento } from '@/types/recebimento'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RecebimentoTableProps {
  loading: boolean
  installments: ConsolidatedRecebimento[]
  selectedVendaId: number | null
  onSelectVenda: (vendaId: number) => void
  onGenerateReceipt: (inst: ConsolidatedRecebimento) => void
}

export function RecebimentoTable({
  loading,
  installments,
  selectedVendaId,
  onSelectVenda,
  onGenerateReceipt,
}: RecebimentoTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Data Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Método Orig.</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right text-green-600">
              Valor Pago
            </TableHead>
            <TableHead className="text-right text-red-600 font-bold">
              Débito (Saldo)
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
                Nenhum registro encontrado.
              </TableCell>
            </TableRow>
          ) : (
            installments.map((inst) => {
              const isSelected = selectedVendaId === inst.venda_id
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
                  key={inst.venda_id}
                  className={isSelected ? 'bg-muted/50' : ''}
                  onClick={() => onSelectVenda(inst.venda_id)}
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
                      {inst.history.length > 0 && (
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
                          <PopoverContent className="w-80 p-0" align="end">
                            <div className="p-3 border-b bg-muted/20">
                              <h4 className="font-semibold text-sm">
                                Histórico de Pagamentos
                              </h4>
                            </div>
                            <ScrollArea className="h-[200px]">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="h-8 text-xs">
                                      Data
                                    </TableHead>
                                    <TableHead className="h-8 text-xs">
                                      Quem
                                    </TableHead>
                                    <TableHead className="h-8 text-xs">
                                      Via
                                    </TableHead>
                                    <TableHead className="h-8 text-xs text-right">
                                      Valor
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {inst.history.map((h, i) => (
                                    <TableRow
                                      key={i}
                                      className="hover:bg-muted/50"
                                    >
                                      <TableCell className="py-2 text-xs">
                                        {safeFormatDate(h.data, 'dd/MM')}
                                      </TableCell>
                                      <TableCell
                                        className="py-2 text-xs max-w-[80px] truncate"
                                        title={h.funcionario}
                                      >
                                        {h.funcionario}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs">
                                        {h.forma_pagamento}
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-right font-medium">
                                        {formatCurrency(h.valor)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      )}
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
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">
                    {formatCurrency(saldo)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectVenda(inst.venda_id)}
                      onClick={(e) => e.stopPropagation()}
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
