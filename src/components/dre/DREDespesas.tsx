import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
import { reportsService, ExpenseReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Loader2,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Search,
  Edit,
  Trash2,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ExpenseConfirmationDialog } from '@/components/relatorio/ExpenseConfirmationDialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const GRUPOS = [
  'Alimentação',
  'Combustível',
  'Gasolina',
  'Outros',
  'Abastecimento',
  'Manutenção',
]

interface DREDespesasProps {
  startDate: string
  endDate: string
}

export function DREDespesas({ startDate, endDate }: DREDespesasProps) {
  const { toast } = useToast()
  const [data, setData] = useState<ExpenseReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [grupoFiltro, setGrupoFiltro] = useState('todos')
  const [funcionarioFiltro, setFuncionarioFiltro] = useState('todos')
  const [funcionarios, setFuncionarios] = useState<
    { id: number; nome: string }[]
  >([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseReportRow | null>(null)

  // Edit states
  const [editExpenseId, setEditExpenseId] = useState<number | null>(null)
  const [editData, setEditData] = useState('')
  const [editGrupo, setEditGrupo] = useState('')
  const [editDetalhamento, setEditDetalhamento] = useState('')
  const [editValor, setEditValor] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')
      .order('nome_completo')
      .then(({ data }) => {
        if (data)
          setFuncionarios(
            data.map((f) => ({ id: f.id, nome: f.nome_completo })),
          )
      })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await reportsService.getExpensesReport(
        startDate,
        endDate,
        grupoFiltro,
        funcionarioFiltro,
      )
      setData(result)
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao buscar despesas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, grupoFiltro, funcionarioFiltro, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenModal = (expense: ExpenseReportRow) => {
    setSelectedExpense(expense)
    setIsModalOpen(true)
  }

  const handleConfirm = async (formData: any) => {
    if (!selectedExpense) return
    if (!formData.banco_pagamento)
      return toast({ title: 'Selecione o banco', variant: 'destructive' })
    if (formData.banco_pagamento === 'Outros' && !formData.banco_outro) {
      return toast({ title: 'Especifique o banco', variant: 'destructive' })
    }
    if (!formData.data_lancamento)
      return toast({
        title: 'Informe a data de lançamento',
        variant: 'destructive',
      })

    try {
      await reportsService.updateExpenseConfirmation(
        selectedExpense.id,
        formData,
      )
      toast({ title: 'Despesa confirmada com sucesso!' })
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao confirmar despesa', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta despesa?')) return
    try {
      await supabase.from('DESPESAS').delete().eq('id', id)
      toast({ title: 'Despesa excluída com sucesso' })
      fetchData()
    } catch (e) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleOpenEdit = (exp: ExpenseReportRow) => {
    setEditExpenseId(exp.id)
    setEditData(exp.data ? exp.data.split('T')[0] : '')
    setEditGrupo(exp.grupo)
    setEditDetalhamento(exp.detalhamento)
    setEditValor(exp.valor.toString())
  }

  const handleSaveEdit = async () => {
    if (!editExpenseId) return
    setSavingEdit(true)
    try {
      const dataIso = editData
        ? new Date(editData).toISOString()
        : new Date().toISOString()
      await supabase
        .from('DESPESAS')
        .update({
          Data: dataIso,
          'Grupo de Despesas': editGrupo,
          Detalhamento: editDetalhamento,
          Valor: Number(editValor),
        })
        .eq('id', editExpenseId)
      toast({ title: 'Despesa atualizada com sucesso' })
      setEditExpenseId(null)
      fetchData()
    } catch (e) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setSavingEdit(false)
    }
  }

  const totalExpenses = data.reduce((acc, row) => acc + row.valor, 0)
  const countExpenses = data.length
  const unconfirmedCount = data.filter((r) => r.status === 'A confirmar').length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros de Despesas</CardTitle>
          <CardDescription>
            Período controlado pelos filtros globais do DRE.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-wrap sm:flex-row gap-4 items-end">
          <div className="space-y-2 w-full sm:w-auto min-w-[150px]">
            <Label>Grupo</Label>
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {GRUPOS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full sm:w-auto min-w-[150px]">
            <Label>Funcionário</Label>
            <Select
              value={funcionarioFiltro}
              onValueChange={setFuncionarioFiltro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={fetchData}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Filtrar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Despesas do Período"
          value={`R$ ${formatCurrency(totalExpenses)}`}
          icon={Receipt}
          className="border-red-200 bg-red-50/30"
          iconClassName="text-red-600"
        />
        <MetricCard title="Quantidade" value={countExpenses} icon={Receipt} />
        <MetricCard
          title="A Confirmar"
          value={unconfirmedCount}
          icon={AlertCircle}
          className={cn(
            unconfirmedCount > 0 && 'border-amber-200 bg-amber-50/30',
          )}
          iconClassName={cn(
            unconfirmedCount > 0 ? 'text-amber-500' : 'text-muted-foreground',
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Detalhamento</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead className="text-center">Caixa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center w-[180px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {safeFormatDate(item.data, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{item.grupo}</TableCell>
                    <TableCell>{item.detalhamento}</TableCell>
                    <TableCell>{item.funcionario_nome}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={item.saiu_do_caixa ? 'default' : 'secondary'}
                      >
                        {item.saiu_do_caixa ? 'SIM' : 'NÃO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600">
                      R$ {formatCurrency(item.valor)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant={
                            item.status === 'Confirmado'
                              ? 'outline'
                              : 'destructive'
                          }
                          size="sm"
                          className={cn(
                            'text-xs h-8 px-2 font-semibold',
                            item.status === 'Confirmado'
                              ? 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700'
                              : 'bg-red-500 hover:bg-red-600',
                          )}
                          onClick={() => handleOpenModal(item)}
                        >
                          {item.status === 'Confirmado' ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{' '}
                              Confirmado
                            </>
                          ) : (
                            'A confirmar'
                          )}
                        </Button>
                        {!item.saiu_do_caixa && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleOpenEdit(item)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(item.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseConfirmationDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expense={selectedExpense}
        onConfirm={handleConfirm}
      />

      <Dialog
        open={editExpenseId !== null}
        onOpenChange={(open) => !open && setEditExpenseId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={editGrupo}
                onValueChange={setEditGrupo}
                disabled={savingEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {GRUPOS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Detalhamento</Label>
              <Input
                value={editDetalhamento}
                onChange={(e) => setEditDetalhamento(e.target.value)}
                disabled={savingEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
                disabled={savingEdit}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditExpenseId(null)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
