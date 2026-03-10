import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { reportsService, ExpenseReportRow } from '@/services/reportsService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import {
  Loader2,
  ArrowLeft,
  Search,
  Receipt,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const GRUPOS = [
  'Alimentação',
  'Combustível',
  'Gasolina',
  'Outros',
  'Abastecimento',
  'Manutenção',
]

export default function ExpensesReportPage() {
  const { toast } = useToast()
  const [data, setData] = useState<ExpenseReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [grupoFiltro, setGrupoFiltro] = useState('todos')
  const [funcionarioFiltro, setFuncionarioFiltro] = useState('todos')
  const [funcionarios, setFuncionarios] = useState<
    { id: number; nome: string }[]
  >([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseReportRow | null>(null)
  const [banco, setBanco] = useState('')
  const [bancoOutro, setBancoOutro] = useState('')
  const [dataLancamento, setDataLancamento] = useState('')

  useEffect(() => {
    supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')
      .order('nome_completo')
      .then(({ data }) => {
        if (data) {
          setFuncionarios(
            data.map((f) => ({ id: f.id, nome: f.nome_completo })),
          )
        }
      })
  }, [])

  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenModal = (expense: ExpenseReportRow) => {
    setSelectedExpense(expense)
    setBanco(expense.banco_pagamento || '')
    setBancoOutro(expense.banco_outro || '')
    setDataLancamento(
      expense.data_lancamento || format(new Date(), 'yyyy-MM-dd'),
    )
    setIsModalOpen(true)
  }

  const handleConfirm = async () => {
    if (!selectedExpense) return
    if (!banco) {
      toast({ title: 'Selecione o banco', variant: 'destructive' })
      return
    }
    if (banco === 'Outros' && !bancoOutro) {
      toast({ title: 'Especifique o banco', variant: 'destructive' })
      return
    }
    if (!dataLancamento) {
      toast({ title: 'Informe a data de lançamento', variant: 'destructive' })
      return
    }

    try {
      await reportsService.updateExpenseConfirmation(selectedExpense.id, {
        status: 'Confirmado',
        banco_pagamento: banco,
        banco_outro: banco === 'Outros' ? bancoOutro : null,
        data_lancamento: dataLancamento,
      })
      toast({ title: 'Despesa confirmada com sucesso!' })
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao confirmar despesa', variant: 'destructive' })
    }
  }

  const totalExpenses = data.reduce((acc, row) => acc + row.valor, 0)
  const countExpenses = data.length
  const unconfirmedCount = data.filter((r) => r.status === 'A confirmar').length

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Link to="/relatorio">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground">
            Relatório e aprovação de despesas por período.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros Avançados</CardTitle>
          <CardDescription>
            Filtre as despesas para uma visão mais detalhada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col flex-wrap sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 w-full sm:w-auto">
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

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
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Despesas do Período"
          value={`R$ ${formatCurrency(totalExpenses)}`}
          icon={Receipt}
          description="Soma do valor de todas as despesas filtradas"
          className="border-red-200 bg-red-50/30"
          iconClassName="text-red-600"
        />
        <MetricCard
          title="Quantidade"
          value={countExpenses}
          icon={Receipt}
          description="Total de lançamentos no período"
        />
        <MetricCard
          title="A Confirmar"
          value={unconfirmedCount}
          icon={AlertCircle}
          description="Despesas aguardando aprovação"
          className={cn(
            unconfirmedCount > 0 ? 'border-amber-200 bg-amber-50/30' : '',
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
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Detalhamento</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Caixa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center w-[140px]">Ação</TableHead>
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
                      Nenhuma despesa encontrada para este período.
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
                        <Button
                          variant={
                            item.status === 'Confirmado'
                              ? 'outline'
                              : 'destructive'
                          }
                          size="sm"
                          className={cn(
                            'w-full text-xs h-8 px-2 font-semibold tracking-wide',
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmação de Despesa</DialogTitle>
            <DialogDescription>
              Revise os detalhes da despesa e confirme o lançamento bancário.
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-5 my-2">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Data da Despesa
                  </div>
                  <div className="font-medium mt-0.5">
                    {safeFormatDate(selectedExpense.data, 'dd/MM/yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Valor
                  </div>
                  <div className="font-mono font-semibold text-red-600 mt-0.5">
                    R$ {formatCurrency(selectedExpense.valor)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Funcionário
                  </div>
                  <div className="font-medium mt-0.5">
                    {selectedExpense.funcionario_nome}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs uppercase tracking-wider">
                    Detalhes
                  </div>
                  <div className="font-medium mt-0.5">
                    {selectedExpense.detalhamento} ({selectedExpense.grupo})
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Receipt className="h-4 w-4" />
                    Reconciliação Bancária
                  </h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-52">
                        Aqui você deve informar em qual banco e em qual data
                        esta despesa foi efetivamente descontada.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Banco de Pagamento</Label>
                    <Select value={banco} onValueChange={setBanco}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BS2">BS2</SelectItem>
                        <SelectItem value="Cora">Cora</SelectItem>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data do Lançamento</Label>
                    <Input
                      type="date"
                      value={dataLancamento}
                      onChange={(e) => setDataLancamento(e.target.value)}
                    />
                  </div>
                </div>

                {banco === 'Outros' && (
                  <div className="space-y-2 animate-fade-in-down">
                    <Label>Nome do Banco (Outros)</Label>
                    <Input
                      value={bancoOutro}
                      onChange={(e) => setBancoOutro(e.target.value)}
                      placeholder="Especifique o banco"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className={cn(
                selectedExpense?.status === 'Confirmado'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white',
              )}
            >
              {selectedExpense?.status === 'Confirmado'
                ? 'Salvar Alterações'
                : 'Confirmar Lançamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
