import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cobrancaService } from '@/services/cobrancaService'
import { CollectionAction } from '@/types/cobranca'
import { useToast } from '@/hooks/use-toast'
import { format, parseISO } from 'date-fns'
import { Loader2, Plus, CalendarIcon, UserIcon, History } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import { formatCurrency } from '@/lib/formatters'

interface CollectionActionsSheetProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  clientName: string
  clientId: number
  onActionAdded: () => void
  defaultShowForm?: boolean
  // NEW: Installment context
  installment?: {
    vencimento: string | null
    formaPagamento: string | null
  }
}

export function CollectionActionsSheet({
  isOpen,
  onClose,
  orderId,
  clientName,
  clientId,
  onActionAdded,
  defaultShowForm = false,
  installment,
}: CollectionActionsSheetProps) {
  const [actions, setActions] = useState<CollectionAction[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(defaultShowForm)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  // Form State
  const [newAction, setNewAction] = useState({
    acao: '',
    dataAcao: format(new Date(), 'yyyy-MM-dd'),
  })

  const fetchActions = async () => {
    if (!orderId) return
    setLoading(true)
    try {
      // Pass filtering options if installment is present
      const data = await cobrancaService.getCollectionActions(orderId, {
        targetVencimento: installment?.vencimento ?? undefined,
        targetFormaPagamento: installment?.formaPagamento ?? undefined,
      })
      setActions(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico de cobrança.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchActions()
      setShowForm(defaultShowForm)
      setNewAction({
        acao: '',
        dataAcao: format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [isOpen, orderId, defaultShowForm, installment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para adicionar uma ação.',
        variant: 'destructive',
      })
      return
    }

    if (!newAction.acao.trim()) {
      toast({
        title: 'Atenção',
        description: 'Descreva a ação realizada.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await cobrancaService.addCollectionAction({
        acao: newAction.acao,
        dataAcao: newAction.dataAcao,
        novaDataCombinada: null,
        funcionarioId: employee.id,
        funcionarioNome: employee.nome_completo,
        pedidoId: Number(orderId),
        clienteId: clientId,
        clienteNome: clientName,
        installments: [],
        // Save target installment details
        targetVencimento: installment?.vencimento || null,
        targetFormaPagamento: installment?.formaPagamento || null,
      })

      toast({
        title: 'Sucesso',
        description: 'Ação de cobrança registrada.',
        variant: 'default',
        className: 'bg-green-600 text-white',
      })

      await fetchActions()
      setShowForm(false)
      onActionAdded()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a ação. Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Ações de Cobrança
          </SheetTitle>
          <SheetDescription>
            Histórico para o Pedido <strong>#{orderId}</strong> - {clientName}
            {installment && (
              <div className="mt-1 text-xs text-muted-foreground border-l-2 pl-2 border-primary">
                Parcela: {installment.formaPagamento}
                {installment.vencimento &&
                  ` (${format(parseISO(installment.vencimento), 'dd/MM/yyyy')})`}
              </div>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!showForm && (
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Ação
              </Button>
            </div>
          )}

          {showForm && (
            <div className="bg-muted/30 p-4 rounded-lg border space-y-4 animate-in slide-in-from-top-4 fade-in overflow-y-auto max-h-[60vh]">
              <h3 className="text-sm font-semibold">Registrar Nova Ação</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="acao">Descrição da Ação</Label>
                  <Textarea
                    id="acao"
                    placeholder="Ex: Cliente informou que pagará na próxima semana..."
                    value={newAction.acao}
                    onChange={(e) =>
                      setNewAction({ ...newAction, acao: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dataAcao">Data da Ação</Label>
                  <Input
                    id="dataAcao"
                    type="date"
                    value={newAction.dataAcao}
                    onChange={(e) =>
                      setNewAction({ ...newAction, dataAcao: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="flex-1 min-h-0 border rounded-md">
            <ScrollArea className="h-full p-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma ação registrada
                  {installment ? ' para esta parcela' : ' para este pedido'}.
                </div>
              ) : (
                <div className="space-y-4">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="border rounded-lg p-3 text-sm space-y-2 bg-card shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <CalendarIcon className="w-3 h-3" />
                          {action.dataAcao
                            ? format(parseISO(action.dataAcao), 'dd/MM/yyyy')
                            : '-'}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <UserIcon className="w-3 h-3" />
                          {action.funcionarioNome || 'Sistema'}
                        </div>
                      </div>
                      <div className="font-medium whitespace-pre-wrap">
                        {action.acao}
                      </div>
                      {/* Show target details if we are viewing ALL order actions (installment not passed) */}
                      {!installment &&
                        (action.targetVencimento ||
                          action.targetFormaPagamento) && (
                          <div className="text-[10px] text-muted-foreground mt-1 border-t pt-1 border-dashed">
                            Referente a:{' '}
                            {action.targetFormaPagamento || 'Parcela'} -{' '}
                            {action.targetVencimento
                              ? format(
                                  parseISO(action.targetVencimento),
                                  'dd/MM',
                                )
                              : ''}
                          </div>
                        )}
                      {action.installments && action.installments.length > 0 ? (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            Novo Acordo:
                          </p>
                          <div className="space-y-1">
                            {action.installments.map((inst, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs bg-muted/30 p-1 rounded"
                              >
                                <span>
                                  {format(parseISO(inst.vencimento), 'dd/MM')}
                                </span>
                                <span>{inst.forma_pagamento}</span>
                                <span className="font-medium text-green-600">
                                  R$ {formatCurrency(inst.valor)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        action.novaDataCombinada && (
                          <div className="text-xs pt-1 border-t mt-1 flex gap-2">
                            <span className="text-muted-foreground">
                              Nova Previsão:
                            </span>
                            <span className="font-semibold text-blue-600">
                              {format(
                                parseISO(action.novaDataCombinada),
                                'dd/MM/yyyy',
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
