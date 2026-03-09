import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { FechamentoCaixa } from '@/types/fechamento'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { fechamentoService } from '@/services/fechamentoService'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  Lock,
  Loader2,
  CheckCheck,
  FileText,
  CalendarClock,
  Printer,
  Banknote,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface FechamentoTableProps {
  data: FechamentoCaixa[]
  onRefresh: () => void
}

export function FechamentoTable({ data, onRefresh }: FechamentoTableProps) {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())
  const [generatingPdfIds, setGeneratingPdfIds] = useState<Set<number>>(
    new Set(),
  )

  const handleToggleApproval = async (
    item: FechamentoCaixa,
    field:
      | 'dinheiro_aprovado'
      | 'pix_aprovado'
      | 'cheque_aprovado'
      | 'despesas_aprovadas'
      | 'saldo_acerto_aprovado',
    value: boolean,
  ) => {
    if (item.status === 'Fechado') return

    try {
      await fechamentoService.updateApproval(item.id, field, value)
      onRefresh()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar aprovação.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelClosing = async (item: FechamentoCaixa) => {
    setLoadingIds((prev) => new Set(prev).add(item.id))
    try {
      await fechamentoService.cancelClosing(item.id)
      toast({
        title: 'Fechamento Cancelado',
        description: `O início do fechamento de caixa de ${item.funcionario?.nome_completo || 'funcionário'} foi desfeito com sucesso. O caixa está aberto novamente.`,
        className: 'bg-green-600 text-white',
      })
      onRefresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao cancelar o fechamento.',
        variant: 'destructive',
      })
      onRefresh()
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleConfirm = async (item: FechamentoCaixa) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado.',
        variant: 'destructive',
      })
      return
    }

    setLoadingIds((prev) => new Set(prev).add(item.id))
    try {
      await fechamentoService.confirmClosing(item.id, employee.id)

      toast({
        title: 'Caixa Fechado',
        description: `Caixa de ${item.funcionario?.nome_completo} finalizado com sucesso. Gerando comprovante...`,
        className: 'bg-green-600 text-white',
      })

      // Pass true for forceClosed to simulate the just-closed state
      // Defaulting to A4 for automatic generation
      await handleGeneratePdf(item, 'A4', true)
      onRefresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Atenção',
        description: 'Caixa fechado, mas houve erro ao gerar o PDF.',
        variant: 'warning',
      })
      onRefresh()
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleMarkRecolhido = async (item: FechamentoCaixa) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado.',
        variant: 'destructive',
      })
      return
    }

    setLoadingIds((prev) => new Set(prev).add(item.id))
    try {
      await fechamentoService.markAsRecolhido(item.id, employee.id)

      toast({
        title: 'Recolhido',
        description: `Valores de ${item.funcionario?.nome_completo} recolhidos com sucesso.`,
        className: 'bg-green-600 text-white',
      })

      onRefresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar recolhimento.',
        variant: 'destructive',
      })
      onRefresh()
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  const handleGeneratePdf = async (
    item: FechamentoCaixa,
    format: 'A4' | '80mm' = 'A4',
    forceClosed: boolean = false,
  ) => {
    const pdfData = {
      ...item,
      status: forceClosed ? 'Fechado' : item.status,
      responsavel: forceClosed
        ? { nome_completo: employee?.nome_completo }
        : item.responsavel,
    }

    setGeneratingPdfIds((prev) => new Set(prev).add(item.id))
    try {
      await fechamentoService.generateClosingPdf(
        pdfData as FechamentoCaixa,
        format,
      )
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro no PDF',
        description: error.message || 'Falha ao gerar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdfIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[50px] text-center">Rota</TableHead>
            <TableHead>Funcionário</TableHead>
            <TableHead className="text-right">Venda Total</TableHead>
            <TableHead className="text-right">Descontos</TableHead>
            <TableHead className="text-right font-bold text-red-600">
              A Receber (Dívida)
            </TableHead>
            <TableHead className="text-center w-[100px] bg-green-50/50 text-green-700 font-bold border-l">
              Dinheiro
            </TableHead>
            <TableHead className="text-center w-[100px] bg-purple-50/50 text-purple-700 font-bold">
              PIX
            </TableHead>
            <TableHead className="text-center w-[100px] bg-blue-50/50 text-blue-700 font-bold">
              Cheque
            </TableHead>
            <TableHead className="text-center w-[100px] bg-red-50/50 text-red-700 font-bold border-r">
              Despesas
            </TableHead>
            <TableHead className="text-center w-[120px] bg-yellow-50/50 text-yellow-800 font-bold border-r">
              Saldo Acerto
            </TableHead>
            <TableHead className="text-center">Responsável</TableHead>
            <TableHead className="text-center w-[120px]">Recolhido</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={13}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhum fechamento iniciado para esta rota.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const isClosed = item.status === 'Fechado'

              // Validation Logic: Stricter - REQUIRE ALL CHECKBOXES including Saldo Acerto
              const canConfirm =
                item.dinheiro_aprovado &&
                item.pix_aprovado &&
                item.cheque_aprovado &&
                item.despesas_aprovadas &&
                item.saldo_acerto_aprovado && // NEW Mandatory Check
                !isClosed

              const isLoading = loadingIds.has(item.id)
              const isGeneratingPdf = generatingPdfIds.has(item.id)

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    'hover:bg-muted/30 transition-colors',
                    isClosed && 'bg-gray-50/50',
                  )}
                >
                  <TableCell className="text-center font-mono text-xs">
                    {item.rota_id}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>
                        {item.funcionario?.nome_completo || 'Desconhecido'}
                      </span>
                      {isClosed && item.created_at && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <CalendarClock className="h-3 w-3" />
                          {safeFormatDate(item.created_at)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    R$ {formatCurrency(item.venda_total)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-red-500">
                    R$ {formatCurrency(item.desconto_total)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">
                    R$ {formatCurrency(item.valor_a_receber)}
                  </TableCell>

                  {/* Approval Columns */}
                  <TableCell className="border-l bg-green-50/20 text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-green-700">
                        R$ {formatCurrency(item.valor_dinheiro)}
                      </span>
                      <Checkbox
                        checked={item.dinheiro_aprovado}
                        disabled={isClosed}
                        onCheckedChange={(c) =>
                          handleToggleApproval(
                            item,
                            'dinheiro_aprovado',
                            c as boolean,
                          )
                        }
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="bg-purple-50/20 text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-purple-700">
                        R$ {formatCurrency(item.valor_pix)}
                      </span>
                      <Checkbox
                        checked={item.pix_aprovado}
                        disabled={isClosed}
                        onCheckedChange={(c) => {
                          handleToggleApproval(
                            item,
                            'pix_aprovado',
                            c as boolean,
                          )
                        }}
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 disabled:opacity-70"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="bg-blue-50/20 text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-blue-700">
                        R$ {formatCurrency(item.valor_cheque)}
                      </span>
                      <Checkbox
                        checked={item.cheque_aprovado}
                        disabled={isClosed}
                        onCheckedChange={(c) =>
                          handleToggleApproval(
                            item,
                            'cheque_aprovado',
                            c as boolean,
                          )
                        }
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="border-r bg-red-50/20 text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-red-700">
                        R$ {formatCurrency(item.valor_despesas || 0)}
                      </span>
                      <Checkbox
                        checked={item.despesas_aprovadas}
                        disabled={isClosed}
                        onCheckedChange={(c) =>
                          handleToggleApproval(
                            item,
                            'despesas_aprovadas',
                            c as boolean,
                          )
                        }
                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="border-r bg-yellow-50/20 text-center p-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-yellow-800">
                        R$ {formatCurrency(item.saldo_acerto || 0)}
                      </span>
                      <Checkbox
                        checked={item.saldo_acerto_aprovado}
                        disabled={isClosed}
                        onCheckedChange={(c) =>
                          handleToggleApproval(
                            item,
                            'saldo_acerto_aprovado',
                            c as boolean,
                          )
                        }
                        className="data-[state=checked]:bg-yellow-600 data-[state=checked]:border-yellow-600 border-yellow-400"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="text-center text-xs text-muted-foreground">
                    {item.responsavel?.nome_completo || '-'}
                  </TableCell>

                  {/* Recolhido Column */}
                  <TableCell className="text-center">
                    {isClosed ? (
                      item.recolhido_por_id ? (
                        <div className="flex flex-col items-center justify-center">
                          <CheckCheck className="h-4 w-4 text-green-600 mb-1" />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {item.recolhedor?.nome_completo?.split(' ')[0] ||
                              'OK'}
                          </span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleMarkRecolhido(item)}
                          disabled={isLoading || isGeneratingPdf}
                        >
                          {isLoading ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Banknote className="mr-2 h-3 w-3" />
                          )}
                          Recolher
                        </Button>
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Ação Column */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DropdownMenu>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={isGeneratingPdf}
                                  className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                >
                                  {isGeneratingPdf ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerar Relatório PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleGeneratePdf(item, 'A4')}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Relatório A4
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleGeneratePdf(item, '80mm')}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Relatório Térmico (80mm)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isClosed ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="text-green-600 font-bold opacity-100"
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Confirmado
                        </Button>
                      ) : (
                        <>
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                      disabled={isLoading || isGeneratingPdf}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cancelar Início de Fechamento</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Cancelar Fechamento?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja cancelar o início do fechamento? Isso
                                  permitirá adicionar novos lançamentos ao
                                  caixa.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Voltar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelClosing(item)}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Sim, Cancelar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <Button
                            size="sm"
                            onClick={() => handleConfirm(item)}
                            disabled={!canConfirm || isLoading}
                            className={cn(
                              'w-[110px]',
                              canConfirm
                                ? 'bg-green-600 hover:bg-green-700'
                                : '',
                            )}
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Lock className="mr-2 h-4 w-4" />
                            )}
                            Confirmar
                          </Button>
                        </>
                      )}
                    </div>
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
