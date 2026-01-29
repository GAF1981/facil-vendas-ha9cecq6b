import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CaixaSummaryRow } from '@/services/caixaService'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Eye,
  PlusCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface FinancialSummaryTableProps {
  data: CaixaSummaryRow[]
  onViewReceipts: (employeeId: number, employeeName: string) => void
  onViewExpenses: (employeeId: number, employeeName: string) => void
  onAddExpense: (employeeId: number, employeeName: string) => void
  onGeneratePdf: (employeeId: number, employeeName: string) => void
}

export function FinancialSummaryTable({
  data,
  onViewReceipts,
  onViewExpenses,
  onAddExpense,
  onGeneratePdf,
}: FinancialSummaryTableProps) {
  const totalRecebido = data.reduce((acc, row) => acc + row.totalRecebido, 0)
  const totalDespesas = data.reduce((acc, row) => acc + row.totalDespesas, 0)
  const totalBoleto = data.reduce((acc, row) => acc + row.totalBoleto, 0)
  const totalCaixa = data.reduce((acc, row) => acc + row.saldo, 0)

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Funcionário</TableHead>
            <TableHead className="text-center">Caixa</TableHead>
            <TableHead className="text-right text-green-700">
              Entradas Totais
            </TableHead>
            <TableHead className="text-right text-muted-foreground">
              Boletos
            </TableHead>
            <TableHead className="text-right text-red-700">Despesas</TableHead>
            <TableHead className="text-right font-bold text-blue-700">
              Saldo Líquido
            </TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma movimentação financeira encontrada para esta rota.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((row) => (
                <TableRow key={row.funcionarioId} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {row.hasClosingRecord && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                                onClick={() =>
                                  onGeneratePdf(
                                    row.funcionarioId,
                                    row.funcionarioNome,
                                  )
                                }
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Relatório de Fechamento PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {row.funcionarioNome}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        !row.hasClosingRecord
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : row.dbStatus === 'Aberto'
                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                            : 'bg-green-100 text-green-700 border-green-200',
                      )}
                    >
                      {!row.hasClosingRecord ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Aberto
                        </span>
                      ) : row.dbStatus === 'Aberto' ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Em Análise
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Fechado
                        </span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-green-600">
                        R$ {formatCurrency(row.totalRecebido)}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                onViewReceipts(
                                  row.funcionarioId,
                                  row.funcionarioNome,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 text-green-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Recebimentos</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-muted-foreground">
                      R$ {formatCurrency(row.totalBoleto)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono text-red-600">
                        R$ {formatCurrency(row.totalDespesas)}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() =>
                                onViewExpenses(
                                  row.funcionarioId,
                                  row.funcionarioNome,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver Despesas</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono font-bold',
                      row.saldo >= 0 ? 'text-blue-600' : 'text-red-600',
                    )}
                  >
                    R$ {formatCurrency(row.saldo)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 text-xs',
                        row.hasClosingRecord
                          ? 'opacity-50 cursor-not-allowed'
                          : 'border-blue-200 hover:bg-blue-50 hover:text-blue-700',
                      )}
                      onClick={() =>
                        onAddExpense(row.funcionarioId, row.funcionarioNome)
                      }
                      disabled={row.hasClosingRecord}
                      title={
                        row.hasClosingRecord
                          ? 'Bloqueado: Fechamento já iniciado/finalizado'
                          : 'Lançar Despesa'
                      }
                    >
                      <PlusCircle className="mr-1 h-3 w-3" />
                      Lançar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totalizer Row */}
              <TableRow className="bg-muted/50 font-bold border-t-2">
                <TableCell colSpan={2}>TOTAL GERAL</TableCell>
                <TableCell className="text-right text-green-700">
                  R$ {formatCurrency(totalRecebido)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  R$ {formatCurrency(totalBoleto)}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  R$ {formatCurrency(totalDespesas)}
                </TableCell>
                <TableCell className="text-right text-blue-700">
                  R$ {formatCurrency(totalCaixa)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
