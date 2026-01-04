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
import { formatCurrency } from '@/lib/formatters'
import { fechamentoService } from '@/services/fechamentoService'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { Lock, Loader2, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FechamentoTableProps {
  data: FechamentoCaixa[]
  onRefresh: () => void
}

export function FechamentoTable({ data, onRefresh }: FechamentoTableProps) {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())

  const handleToggleApproval = async (
    item: FechamentoCaixa,
    field: 'dinheiro_aprovado' | 'pix_aprovado' | 'cheque_aprovado',
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
        description: `Caixa de ${item.funcionario?.nome_completo} finalizado com sucesso.`,
        className: 'bg-green-600 text-white',
      })
      onRefresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o fechamento.',
        variant: 'destructive',
      })
    } finally {
      setLoadingIds((prev) => {
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
            <TableHead className="text-center w-[100px] bg-blue-50/50 text-blue-700 font-bold border-r">
              Cheque
            </TableHead>
            <TableHead className="text-center">Responsável</TableHead>
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
                Nenhum fechamento iniciado para esta rota.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const isClosed = item.status === 'Fechado'
              const canConfirm =
                item.dinheiro_aprovado &&
                item.pix_aprovado &&
                item.cheque_aprovado &&
                !isClosed
              const isLoading = loadingIds.has(item.id)

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
                    {item.funcionario?.nome_completo || 'Desconhecido'}
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
                        onCheckedChange={(c) =>
                          handleToggleApproval(
                            item,
                            'pix_aprovado',
                            c as boolean,
                          )
                        }
                        className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                    </div>
                  </TableCell>

                  <TableCell className="border-r bg-blue-50/20 text-center p-2">
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

                  <TableCell className="text-center text-xs text-muted-foreground">
                    {item.responsavel?.nome_completo || '-'}
                  </TableCell>

                  <TableCell className="text-right">
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
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(item)}
                        disabled={!canConfirm || isLoading}
                        className={cn(
                          'w-[110px]',
                          canConfirm ? 'bg-green-600 hover:bg-green-700' : '',
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Lock className="mr-2 h-4 w-4" />
                        )}
                        Confirmar
                      </Button>
                    )}
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
