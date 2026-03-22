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
import { Loader2 } from 'lucide-react'
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

interface CloseCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRoute: Rota | undefined
  onSuccess?: () => void
  targetEmployeeId?: number
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
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([])
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([])

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

  useEffect(() => {
    if (
      open &&
      selectedEmployeeId &&
      selectedEmployeeId !== 'all' &&
      currentRoute
    ) {
      setDataLoading(true)
      const empId = parseInt(selectedEmployeeId)
      Promise.all([
        caixaService.getEmployeeReceipts(empId, currentRoute),
        caixaService.getEmployeeExpenses(empId, currentRoute),
      ])
        .then(([recs, exps]) => {
          setReceipts(recs)
          setExpenses(exps)
        })
        .finally(() => setDataLoading(false))
    } else {
      setReceipts([])
      setExpenses([])
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="receipts">
                  Recebimentos ({receipts.length})
                </TabsTrigger>
                <TabsTrigger value="expenses">
                  Despesas ({expenses.filter((e) => e.saiuDoCaixa).length})
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
              loading || !selectedEmployeeId || selectedEmployeeId === 'all'
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
