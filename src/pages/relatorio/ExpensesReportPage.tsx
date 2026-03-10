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
import { startOfMonth, endOfMonth, format } from 'date-fns'
import {
  Loader2,
  ArrowLeft,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ExpenseConfirmationDialog } from '@/components/relatorio/ExpenseConfirmationDialog'
import { ExpenseFilters } from '@/components/relatorio/ExpenseFilters'

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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseReportRow | null>(null)

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
          <ExpenseFilters
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            grupoFiltro={grupoFiltro}
            setGrupoFiltro={setGrupoFiltro}
            funcionarioFiltro={funcionarioFiltro}
            setFuncionarioFiltro={setFuncionarioFiltro}
            funcionarios={funcionarios}
            loading={loading}
            onFilter={fetchData}
          />
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
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Data</TableHead>
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
                        <Button
                          variant={
                            item.status === 'Confirmado'
                              ? 'outline'
                              : 'destructive'
                          }
                          size="sm"
                          className={cn(
                            'w-full text-xs h-8 px-2 font-semibold',
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

      <ExpenseConfirmationDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expense={selectedExpense}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
