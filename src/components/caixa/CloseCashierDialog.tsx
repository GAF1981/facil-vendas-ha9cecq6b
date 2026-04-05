import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { employeesService } from '@/services/employeesService'
import { fechamentoService } from '@/services/fechamentoService'
import {
  caixaService,
  ReceiptDetail,
  ExpenseDetail,
} from '@/services/caixaService'
import { Employee } from '@/types/employee'
import { Rota } from '@/types/rota'
import { AlertCircle, ArrowRight, Check, Loader2, X } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'

interface CloseCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRoute: Rota | undefined
  onSuccess?: () => void
  targetEmployeeId?: number
}

interface Blocker {
  clientId: number
  clientName: string
  type: 'pendencia' | 'debito' | 'divida'
  description: string
  actionDone: boolean
}

export function CloseCashierDialog({
  open,
  onOpenChange,
  currentRoute,
  onSuccess,
  targetEmployeeId,
}: CloseCashierDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [loadingBlockers, setLoadingBlockers] = useState(false)
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([])
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([])
  const [blockers, setBlockers] = useState<Blocker[]>([])

  const { toast } = useToast()
  const { employee: loggedInUser } = useUserStore()

  useEffect(() => {
    if (open) {
      employeesService.getEmployees(1, 100).then(({ data }) => {
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      })

      if (targetEmployeeId) {
        setSelectedEmployeeId(targetEmployeeId.toString())
      } else if (loggedInUser) {
        setSelectedEmployeeId(loggedInUser.id.toString())
      }
    }
  }, [open, loggedInUser, targetEmployeeId])

  async function checkBlockers(empId: number, route: Rota): Promise<Blocker[]> {
    const routeStart = route.data_inicio
    const routeEnd = route.data_fim || new Date().toISOString()

    const { data: routeItems } = await supabase
      .from('ROTA_ITEMS')
      .select(
        `
        cliente_id,
        CLIENTES (
          CODIGO,
          "NOME CLIENTE"
        )
      `,
      )
      .eq('rota_id', route.id)
      .eq('vendedor_id', empId)

    if (!routeItems?.length) return []
    const clientIds = routeItems
      .map((ri) => ri.cliente_id)
      .filter(Boolean) as number[]
    const clientsMap = new Map(
      routeItems.map((ri) => [
        ri.cliente_id,
        (ri.CLIENTES as any)?.['NOME CLIENTE'] || 'Unknown',
      ]),
    )

    const blockersList: Blocker[] = []

    // Pendencies
    const { data: pendencies } = await supabase
      .from('PENDENCIAS')
      .select('id, cliente_id, descricao_pendencia')
      .in('cliente_id', clientIds)
      .eq('resolvida', false)

    if (pendencies?.length) {
      const pendIds = pendencies.map((p) => p.id)
      const { data: annotations } = await supabase
        .from('pendencia_anotacoes')
        .select('pendencia_id')
        .in('pendencia_id', pendIds)
        .eq('funcionario_id', empId)
        .gte('created_at', routeStart)
        .lte('created_at', routeEnd)

      const annotatedIds = new Set(annotations?.map((a) => a.pendencia_id))

      for (const p of pendencies) {
        blockersList.push({
          clientId: p.cliente_id,
          clientName: clientsMap.get(p.cliente_id) || '',
          type: 'pendencia',
          description: 'Pendência: ' + p.descricao_pendencia,
          actionDone: annotatedIds.has(p.id),
        })
      }
    }

    // Debits
    const { data: debits } = await supabase
      .from('debitos_historico')
      .select('cliente_codigo, debito')
      .in('cliente_codigo', clientIds)
      .gt('debito', 0)

    if (debits?.length) {
      const clientsWithDebits = Array.from(
        new Set(debits.map((d) => d.cliente_codigo).filter(Boolean)),
      ) as number[]
      const { data: actions } = await supabase
        .from('acoes_cobranca')
        .select('cliente_id')
        .in('cliente_id', clientsWithDebits)
        .eq('funcionario_id', empId)
        .gte('data_acao', routeStart)
        .lte('data_acao', routeEnd)

      const actionedClients = new Set(actions?.map((a) => a.cliente_id))

      for (const cid of clientsWithDebits) {
        blockersList.push({
          clientId: cid,
          clientName: clientsMap.get(cid) || '',
          type: 'debito',
          description: 'Débito pendente',
          actionDone: actionedClients.has(cid),
        })
      }
    }

    // Manual Debts
    const { data: mDebtsAll } = await supabase
      .from('dividas_manuais')
      .select('id, cliente_id, valor_parcela, valor_pago')
      .in('cliente_id', clientIds)

    const pendingMDebts =
      mDebtsAll?.filter((d) => d.valor_parcela > d.valor_pago) || []

    if (pendingMDebts.length) {
      const debtIds = pendingMDebts.map((d) => d.id)
      const { data: mActions } = await supabase
        .from('dividas_manuais_acoes')
        .select('divida_id')
        .in('divida_id', debtIds)
        .eq('funcionario_id', empId)
        .gte('data_acao', routeStart)
        .lte('data_acao', routeEnd)

      const actionedDebts = new Set(mActions?.map((a) => a.divida_id))

      for (const d of pendingMDebts) {
        blockersList.push({
          clientId: d.cliente_id!,
          clientName: clientsMap.get(d.cliente_id!) || '',
          type: 'divida',
          description: 'Dívida manual pendente',
          actionDone: actionedDebts.has(d.id),
        })
      }
    }

    return blockersList
  }

  useEffect(() => {
    if (
      open &&
      selectedEmployeeId &&
      selectedEmployeeId !== 'all' &&
      currentRoute
    ) {
      setDataLoading(true)
      setLoadingBlockers(true)
      const empId = parseInt(selectedEmployeeId)
      Promise.all([
        caixaService.getEmployeeReceipts(empId, currentRoute),
        caixaService.getEmployeeExpenses(empId, currentRoute),
        checkBlockers(empId, currentRoute),
      ])
        .then(([recs, exps, blks]) => {
          setReceipts(recs)
          setExpenses(exps)
          setBlockers(blks)
        })
        .finally(() => {
          setDataLoading(false)
          setLoadingBlockers(false)
        })
    } else {
      setReceipts([])
      setExpenses([])
      setBlockers([])
    }
  }, [open, selectedEmployeeId, currentRoute])

  const canChangeEmployee = useMemo(() => {
    if (!loggedInUser) return false
    const allowedSectors = ['Administrador', 'Gerente', 'Financeiro']
    const userSectors = Array.isArray(loggedInUser.setor)
      ? loggedInUser.setor
      : loggedInUser.setor
        ? [loggedInUser.setor]
        : []
    return userSectors.some((s) => allowedSectors.includes(s))
  }, [loggedInUser])

  const handleConfirm = async () => {
    if (!currentRoute) {
      toast({
        title: 'Erro',
        description: 'Nenhuma rota ativa selecionada.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedEmployeeId || selectedEmployeeId === 'all') {
      toast({
        title: 'Atenção',
        description: 'Selecione um funcionário específico para fechar o caixa.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const empId = parseInt(selectedEmployeeId)

      // Check if already closed
      const closureStatus = await fechamentoService.getClosureStatus(
        currentRoute.id,
        empId,
      )

      if (closureStatus === 'Fechado') {
        toast({
          title: 'Já Fechado',
          description:
            'O caixa para este funcionário já foi fechado nesta rota.',
          variant: 'warning',
        })
        onOpenChange(false)
        return
      }

      // Create Closing Record - Status will be 'Aberto' to enforce manual conference
      const fechamento = await fechamentoService.createClosing(
        currentRoute,
        empId,
        loggedInUser?.id || empId,
      )

      toast({
        title: 'Fechamento Iniciado',
        description:
          'Caixa enviado para conferência (Pendente). Vá na aba Fechamentos para confirmar.',
        className: 'bg-blue-600 text-white',
      })

      try {
        await fechamentoService.generateClosingPdf(fechamento, '80mm')
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError)
        toast({
          title: 'Aviso',
          description:
            'Fechamento iniciado, mas houve erro ao gerar o PDF de resumo.',
          variant: 'warning',
        })
      }

      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description:
          'Falha ao iniciar fechamento de caixa. Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalReceipts = receipts.reduce((acc, r) => acc + r.valor, 0)
  const totalExpenses = expenses.reduce(
    (acc, e) => (e.saiuDoCaixa ? acc + e.valor : acc),
    0,
  )

  const unresolvedBlockers = blockers.filter((b) => !b.actionDone)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Caixa Detalhado</DialogTitle>
          <DialogDescription>
            Confira os lançamentos antes de enviar o caixa para conferência na{' '}
            <strong>Rota #{currentRoute?.id}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={!canChangeEmployee}
            >
              <SelectTrigger className="bg-background font-medium w-full sm:w-1/2">
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" disabled>
                  Selecione um funcionário
                </SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeId === 'all' || !selectedEmployeeId ? (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
              <Label>Selecione um funcionário para visualizar os dados.</Label>
            </div>
          ) : dataLoading ? (
            <div className="h-40 flex items-center justify-center bg-muted/20 rounded-md">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="receipts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="receipts">
                  Recebimentos ({receipts.length})
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  Despesas ({expenses.filter((e) => e.saiuDoCaixa).length})
                </TabsTrigger>
                <TabsTrigger
                  value="blockers"
                  className={
                    unresolvedBlockers.length > 0
                      ? 'text-red-600 font-bold'
                      : ''
                  }
                >
                  Ações Pendentes ({unresolvedBlockers.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="receipts" className="mt-2">
                <div className="rounded-md border h-64 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Forma</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center h-24 text-muted-foreground"
                          >
                            Nenhum recebimento encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        receipts.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-mono text-xs">
                              {r.id}
                            </TableCell>
                            <TableCell className="text-xs">
                              {safeFormatDate(r.data, 'dd/MM HH:mm')}
                            </TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]">
                              {r.clienteNome}
                            </TableCell>
                            <TableCell className="text-xs">{r.forma}</TableCell>
                            <TableCell className="text-right font-mono text-xs font-medium text-green-600">
                              {formatCurrency(r.valor)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="font-bold text-sm">
                    Total Recebido: R$ {formatCurrency(totalReceipts)}
                  </span>
                </div>
              </TabsContent>
              <TabsContent value="expenses" className="mt-2">
                <div className="rounded-md border h-64 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead className="text-right">
                          Valor (Dinheiro)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.filter((e) => e.saiuDoCaixa).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center h-24 text-muted-foreground"
                          >
                            Nenhuma despesa no caixa encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        expenses
                          .filter((e) => e.saiuDoCaixa)
                          .map((e) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">
                                {e.id}
                              </TableCell>
                              <TableCell className="text-xs">
                                {safeFormatDate(e.data, 'dd/MM HH:mm')}
                              </TableCell>
                              <TableCell className="text-xs">
                                {e.grupo}
                              </TableCell>
                              <TableCell className="text-xs truncate max-w-[150px]">
                                {e.detalhamento}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-medium text-red-600">
                                {formatCurrency(e.valor)}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-2">
                  <span className="font-bold text-sm text-red-600">
                    Total Despesas (Dinheiro): R${' '}
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>
              </TabsContent>
              <TabsContent value="blockers" className="mt-2">
                {unresolvedBlockers.length > 0 && (
                  <Alert variant="destructive" className="mb-2 py-2 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-bold">
                      Fechamento Bloqueado
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      É necessário registrar as ações exigidas
                      (anotação/resolução ou ação de cobrança) para os clientes
                      abaixo na rota atual para permitir o fechamento.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="rounded-md border h-64 overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingBlockers ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : blockers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center h-24 text-muted-foreground"
                          >
                            Nenhuma ação pendente na rota encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        blockers.map((b, i) => (
                          <TableRow
                            key={i}
                            className={!b.actionDone ? 'bg-red-50/50' : ''}
                          >
                            <TableCell className="text-xs font-medium">
                              {b.clientName} ({b.clientId})
                            </TableCell>
                            <TableCell
                              className="text-xs truncate max-w-[200px]"
                              title={b.description}
                            >
                              {b.description}
                            </TableCell>
                            <TableCell>
                              {b.actionDone ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 text-[10px]"
                                >
                                  Ok
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                >
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!b.actionDone && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    if (b.type === 'pendencia')
                                      window.open(
                                        `/pendencias?search=${b.clientId}`,
                                        '_blank',
                                      )
                                    else if (b.type === 'debito')
                                      window.open(
                                        `/cobranca?cliente=${b.clientId}`,
                                        '_blank',
                                      )
                                    else if (b.type === 'divida')
                                      window.open(
                                        `/dividas-manuais?cliente=${b.clientId}`,
                                        '_blank',
                                      )
                                  }}
                                  title="Ir para ação"
                                >
                                  <ArrowRight className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              loading ||
              !selectedEmployeeId ||
              selectedEmployeeId === 'all' ||
              unresolvedBlockers.length > 0
            }
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
