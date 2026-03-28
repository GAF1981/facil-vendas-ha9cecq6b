import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { resumoAcertosService } from '@/services/resumoAcertosService'
import {
  caixaService,
  CaixaSummaryRow,
  ReceiptDetail,
  ExpenseDetail,
} from '@/services/caixaService'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  Loader2,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  Printer,
  Banknote,
  Landmark,
  QrCode,
  Lock,
  Calculator,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { Rota } from '@/types/rota'
import { FinancialSummaryTable } from '@/components/caixa/FinancialSummaryTable'
import { ExpenseFormDialog } from '@/components/caixa/ExpenseFormDialog'
import { ReceiptsDetailDialog } from '@/components/caixa/ReceiptsDetailDialog'
import { ExpensesDetailDialog } from '@/components/caixa/ExpensesDetailDialog'
import { supabase } from '@/lib/supabase/client'
import { RevenueGallery } from '@/components/caixa/RevenueGallery'
import { ExpenseGallery } from '@/components/caixa/ExpenseGallery'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CloseCashierDialog } from '@/components/caixa/CloseCashierDialog'
import { useUserStore } from '@/stores/useUserStore'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { fechamentoService } from '@/services/fechamentoService'

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [summaryData, setSummaryData] = useState<CaixaSummaryRow[]>([])
  const [allReceipts, setAllReceipts] = useState<ReceiptDetail[]>([])
  const [allExpenses, setAllExpenses] = useState<ExpenseDetail[]>([])
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([])

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const { employee: loggedInUser } = useUserStore()

  const { toast } = useToast()

  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isCloseCashierDialogOpen, setIsCloseCashierDialogOpen] =
    useState(false)
  const [preselectedEmployee, setPreselectedEmployee] = useState<{
    id: number
    name: string
  } | null>(null)

  const [viewReceipts, setViewReceipts] = useState<{
    open: boolean
    empId: number | null
    empName: string
  }>({ open: false, empId: null, empName: '' })

  const [viewExpenses, setViewExpenses] = useState<{
    open: boolean
    empId: number | null
    empName: string
  }>({ open: false, empId: null, empName: '' })

  const [alertState, setAlertState] = useState<{
    open: boolean
    title: string
    message: string
  }>({
    open: false,
    title: 'Atenção',
    message: '',
  })

  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('80mm')

  const canSelectEmployee = useMemo(() => {
    if (!loggedInUser) return false
    const allowedSectors = ['Administrador', 'Gerente', 'Financeiro']
    const userSectors = Array.isArray(loggedInUser.setor)
      ? loggedInUser.setor
      : loggedInUser.setor
        ? [loggedInUser.setor]
        : []
    return userSectors.some((s) => allowedSectors.includes(s))
  }, [loggedInUser])

  useEffect(() => {
    fetchRoutes()
    fetchActiveEmployees()
  }, [])

  useEffect(() => {
    if (loggedInUser && selectedEmployeeId === 'all') {
      if (canSelectEmployee) {
        // Admin stays on 'all'
      } else {
        setSelectedEmployeeId(loggedInUser.id.toString())
      }
    }
  }, [loggedInUser, selectedEmployeeId, canSelectEmployee])

  const fetchActiveEmployees = async () => {
    try {
      const { data } = await employeesService.getEmployees(1, 1000)
      setActiveEmployees(data.filter((e) => e.situacao === 'ATIVO'))
    } catch (error) {
      console.error('Error fetching employees', error)
    }
  }

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(allRoutes[0].id.toString())
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar rotas.',
        variant: 'destructive',
      })
    }
  }

  const fetchData = async (routeId: string, sDate: string, eDate: string) => {
    if (!routeId && !sDate && !eDate) return
    setLoading(true)
    try {
      const filters = {
        rotaId: routeId && routeId !== 'all' ? parseInt(routeId) : undefined,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
      }

      const [summary, receipts, expenses] = await Promise.all([
        caixaService.getFinancialSummary(filters),
        caixaService.getAllReceipts(filters),
        caixaService.getAllExpenses(filters),
      ])

      setSummaryData(summary)
      setAllReceipts(receipts)
      setAllExpenses(expenses)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os dados do caixa.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (routes.length > 0) {
      fetchData(selectedRouteId, startDate, endDate)
    }
  }, [selectedRouteId, startDate, endDate, routes])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  const filteredReceipts = useMemo(() => {
    if (!selectedEmployeeId || selectedEmployeeId === 'all') return allReceipts
    return allReceipts.filter(
      (r) => r.funcionarioId?.toString() === selectedEmployeeId,
    )
  }, [allReceipts, selectedEmployeeId])

  const filteredExpenses = useMemo(() => {
    if (!selectedEmployeeId || selectedEmployeeId === 'all') return allExpenses
    return allExpenses.filter(
      (e) => e.funcionarioId?.toString() === selectedEmployeeId,
    )
  }, [allExpenses, selectedEmployeeId])

  const filteredSummary = useMemo(() => {
    let data = summaryData

    if (!selectedEmployeeId || selectedEmployeeId === 'all') {
      // Show all data if 'all' is selected
    } else {
      data = data.filter(
        (s) => s.funcionarioId.toString() === selectedEmployeeId,
      )
    }

    return data
  }, [summaryData, selectedEmployeeId])

  const totalRecebido = filteredReceipts.reduce((acc, r) => acc + r.valor, 0)
  const totalDespesas = filteredExpenses
    .filter((e) => e.saiuDoCaixa)
    .reduce((acc, e) => acc + e.valor, 0)

  const totalPix = filteredReceipts
    .filter((r) => r.forma === 'Pix')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalDinheiro = filteredReceipts
    .filter((r) => r.forma === 'Dinheiro')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalCheque = filteredReceipts
    .filter((r) => r.forma === 'Cheque')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalBoleto = filteredReceipts
    .filter((r) => r.forma === 'Boleto')
    .reduce((acc, r) => acc + r.valor, 0)

  const totalSaldo = totalRecebido - totalDespesas - totalBoleto

  const saldoDeAcerto = totalSaldo - totalPix

  const handleOpenGeneralExpense = async () => {
    if (!loggedInUser) return

    const targetEmpId =
      selectedEmployeeId && selectedEmployeeId !== 'all'
        ? parseInt(selectedEmployeeId)
        : loggedInUser.id
    const targetEmpName =
      activeEmployees.find((e) => e.id === targetEmpId)?.nome_completo || ''

    if (selectedRouteId) {
      const closureStatus = await fechamentoService.getClosureStatus(
        parseInt(selectedRouteId),
        targetEmpId,
      )

      if (closureStatus === 'Fechado' || closureStatus === 'Aberto') {
        setAlertState({
          open: true,
          title: 'Ação Bloqueada',
          message: `O Caixa de ${targetEmpName} já está em processo de fechamento ou fechado. Não é possível lançar novas despesas.`,
        })
        return
      }
    }

    setPreselectedEmployee({ id: targetEmpId, name: targetEmpName })
    setIsExpenseDialogOpen(true)
  }

  const handleAddExpense = async (empId: number, empName: string) => {
    if (selectedRouteId) {
      const closureStatus = await fechamentoService.getClosureStatus(
        parseInt(selectedRouteId),
        empId,
      )
      if (closureStatus === 'Fechado' || closureStatus === 'Aberto') {
        setAlertState({
          open: true,
          title: 'Ação Bloqueada',
          message: 'Caixa em fechamento ou fechado.',
        })
        return
      }
    }

    setPreselectedEmployee({ id: empId, name: empName })
    setIsExpenseDialogOpen(true)
  }

  const handleViewReceipts = (empId: number, empName: string) => {
    setViewReceipts({ open: true, empId, empName })
  }

  const handleViewExpenses = (empId: number, empName: string) => {
    setViewExpenses({ open: true, empId, empName })
  }

  const handleDeleteReceipt = async (id: number) => {
    const receipt = allReceipts.find((r) => r.id === id)
    if (receipt && selectedRouteId && receipt.funcionarioId) {
      const closureStatus = await fechamentoService.getClosureStatus(
        parseInt(selectedRouteId),
        receipt.funcionarioId,
      )
      if (closureStatus === 'Fechado' || closureStatus === 'Aberto') {
        toast({
          title: 'Ação Bloqueada',
          description:
            'Não é possível excluir pagamentos de um caixa que está em fechamento ou fechado.',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      await caixaService.deleteReceipt(id)
      toast({
        title: 'Sucesso',
        description: 'Pagamento excluído com sucesso.',
        className: 'bg-green-600 text-white',
      })
      if (selectedRouteId) {
        fetchData(selectedRouteId)
      }
    } catch (error) {
      console.error('Failed to delete receipt', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pagamento.',
        variant: 'destructive',
      })
    }
  }

  const handleGeneratePdf = async (
    employeeId?: number,
    employeeName?: string,
  ) => {
    setGeneratingPdf(true)
    try {
      const targetId =
        employeeId ||
        (selectedEmployeeId && selectedEmployeeId !== 'all'
          ? parseInt(selectedEmployeeId)
          : undefined)

      const reportType = 'employee-cash-summary'
      const employeeData = targetId
        ? {
            id: targetId,
            name:
              employeeName ||
              activeEmployees.find((e) => e.id === targetId)?.nome_completo,
          }
        : null

      const receiptsToPass = targetId
        ? allReceipts.filter((r) => r.funcionarioId === targetId)
        : allReceipts

      const expensesToPass = targetId
        ? allExpenses.filter(
            (e) => e.funcionarioId === targetId && e.saiuDoCaixa,
          )
        : allExpenses.filter((e) => e.saiuDoCaixa)

      let finalTotalRecebido = totalRecebido
      let finalTotalDespesas = totalDespesas
      let finalTotalSaldo = totalSaldo
      let finalSaldoDeAcerto = saldoDeAcerto

      let settlements = []

      let allSettlements: any[] = []
      if (selectedRoute) {
        allSettlements =
          await resumoAcertosService.getSettlements(selectedRoute)
      }

      if (targetId) {
        const empSummary = summaryData.find((s) => s.funcionarioId === targetId)
        if (empSummary) {
          finalTotalRecebido = empSummary.totalRecebido
          finalTotalDespesas = empSummary.totalDespesas
          finalTotalSaldo = empSummary.saldo
        } else if (targetId.toString() === selectedEmployeeId) {
          finalTotalRecebido = totalRecebido
          finalTotalDespesas = totalDespesas
          finalTotalSaldo = totalSaldo
        }

        const empPix = receiptsToPass
          .filter((r) => r.forma === 'Pix')
          .reduce((acc, r) => acc + r.valor, 0)
        finalSaldoDeAcerto = finalTotalSaldo - empPix

        settlements = allSettlements.filter((s) => s.employeeId === targetId)
      } else {
        settlements = allSettlements
      }

      const valorDinheiro = receiptsToPass
        .filter((r) => r.forma === 'Dinheiro')
        .reduce((acc, r) => acc + r.valor, 0)
      const valorPix = receiptsToPass
        .filter((r) => r.forma === 'Pix')
        .reduce((acc, r) => acc + r.valor, 0)
      const valorCheque = receiptsToPass
        .filter((r) => r.forma === 'Cheque')
        .reduce((acc, r) => acc + r.valor, 0)
      const valorBoleto = receiptsToPass
        .filter((r) => r.forma === 'Boleto')
        .reduce((acc, r) => acc + r.valor, 0)

      const vendaTotal = settlements.reduce(
        (acc, s) => acc + s.totalSalesValue,
        0,
      )
      const descontoTotal = settlements.reduce(
        (acc, s) => acc + s.totalDiscount,
        0,
      )

      const { data: pdfBlob, error } = await supabase.functions.invoke(
        'generate-pdf',
        {
          body: {
            reportType,
            format: printFormat,
            summaryData: targetId ? [] : filteredSummary,
            receipts: receiptsToPass,
            expenses: expensesToPass,
            totalRecebido: finalTotalRecebido,
            totalDespesas: finalTotalDespesas,
            totalSaldo: finalTotalSaldo,
            saldoDeAcerto: finalSaldoDeAcerto,
            periodo: {
              inicio: selectedRoute ? selectedRoute.data_inicio : startDate,
              fim: selectedRoute ? selectedRoute.data_fim : endDate,
              rotaId: selectedRoute ? selectedRoute.id : null,
            },
            employee: employeeData,
            date: new Date().toISOString(),
            fechamento: {
              valor_dinheiro: valorDinheiro,
              valor_pix: valorPix,
              valor_cheque: valorCheque,
              valor_boleto: valorBoleto,
              valor_despesas: finalTotalDespesas,
              saldo_acerto: finalSaldoDeAcerto,
              venda_total: vendaTotal,
              desconto_total: descontoTotal,
              rota_id: selectedRoute ? selectedRoute.id : null,
              funcionario: employeeData
                ? { nome_completo: employeeData.name }
                : null,
            },
            settlements: settlements,
          },
        },
      )

      if (error) throw error

      if (pdfBlob) {
        const blob = new Blob([pdfBlob], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')

        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 1000)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const canCloseCashier = useMemo(() => {
    if (!loggedInUser) return false
    return true
  }, [loggedInUser])

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Caixa</h1>
            <p className="text-muted-foreground">
              Gestão de fluxo de caixa e despesas diárias.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canCloseCashier && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      onClick={() => setIsCloseCashierDialogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none text-white w-full sm:w-auto"
                      disabled={
                        !selectedRoute ||
                        !selectedEmployeeId ||
                        selectedEmployeeId === 'all'
                      }
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Fechar Caixa
                    </Button>
                  </span>
                </TooltipTrigger>
                {selectedEmployeeId === 'all' && (
                  <TooltipContent>
                    <p>
                      Selecione um funcionário específico para fechar o caixa.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          <div className="flex flex-col sm:flex-row gap-2 border p-1 rounded-md bg-background">
            <div className="flex items-center gap-2 px-2">
              <Label className="text-xs">Formato:</Label>
              <Select
                value={printFormat}
                onValueChange={(v: 'A4' | '80mm') => setPrintFormat(v)}
              >
                <SelectTrigger className="h-8 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => handleGeneratePdf()}
              variant="outline"
              size="sm"
              disabled={
                generatingPdf ||
                loading ||
                (!selectedEmployeeId && selectedEmployeeId !== 'all')
              }
              className="flex-1 sm:flex-none"
            >
              {generatingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
          <Button
            onClick={handleOpenGeneralExpense}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Lançar Despesa
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchData(selectedRouteId, startDate, endDate)}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Filtros & Rota
              </CardTitle>
              <CardDescription>
                Selecione a rota e o funcionário para visualizar o balanço
                individual.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="w-full sm:w-[250px]">
                <Label className="text-xs mb-1 block">Funcionário</Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={!canSelectEmployee}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Resumo Geral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Resumo Geral (Todos)</SelectItem>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.nome_completo}
                      </SelectItem>
                    ))}
                    {!activeEmployees.find(
                      (e) => e.id.toString() === selectedEmployeeId,
                    ) &&
                      loggedInUser && (
                        <SelectItem value={loggedInUser.id.toString()}>
                          {loggedInUser.nome_completo}
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[250px]">
                <Label className="text-xs mb-1 block">Rota</Label>
                <Select
                  value={selectedRouteId}
                  onValueChange={(v) => {
                    setSelectedRouteId(v)
                    if (v !== 'all') {
                      setStartDate('')
                      setEndDate('')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a rota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas as Rotas / Período
                    </SelectItem>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id.toString()}>
                        Rota #{route.id} (
                        {safeFormatDate(route.data_inicio, 'dd/MM')}
                        {route.data_fim
                          ? ` - ${safeFormatDate(route.data_fim, 'dd/MM')}`
                          : ' - Atual'}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[130px]">
                <Label className="text-xs mb-1 block">Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (selectedRouteId !== 'all') setSelectedRouteId('all')
                  }}
                  className="h-9 text-xs"
                />
              </div>
              <div className="w-full sm:w-[130px]">
                <Label className="text-xs mb-1 block">Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    if (selectedRouteId !== 'all') setSelectedRouteId('all')
                  }}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedRoute ? (
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Início:</span>
                <span className="font-medium">
                  {safeFormatDate(
                    selectedRoute.data_inicio,
                    'dd/MM/yyyy HH:mm',
                  )}
                </span>
              </div>
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Fim:</span>
                <span className="font-medium">
                  {selectedRoute.data_fim
                    ? safeFormatDate(selectedRoute.data_fim, 'dd/MM/yyyy HH:mm')
                    : 'Em andamento'}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <QrCode className="h-3 w-3" /> Pix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-green-700">
              R$ {formatCurrency(totalPix)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> Dinheiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-green-700">
              R$ {formatCurrency(totalDinheiro)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <Landmark className="h-3 w-3" /> Cheque
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-green-700">
              R$ {formatCurrency(totalCheque)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Total Boleto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-green-700">
              R$ {formatCurrency(totalBoleto)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-green-700 flex items-center gap-1">
              <ArrowDownCircle className="h-3 w-3" /> Total Entradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-green-700">
              R$ {formatCurrency(totalRecebido)}
            </div>
            <p className="text-[10px] text-green-600/70">
              Inclui Boletos (R$ {formatCurrency(totalBoleto)})
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-200">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-red-700 flex items-center gap-1">
              <ArrowUpCircle className="h-3 w-3" /> Saídas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-lg font-bold text-red-700">
              R$ {formatCurrency(totalDespesas)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200 lg:col-span-2">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-blue-700 flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Saldo em Caixa (Líquido)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(totalSaldo)}
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-blue-600 font-medium flex items-center gap-1 cursor-help border-b border-dotted border-blue-400">
                        <Calculator className="h-3 w-3" /> Saldo de Acerto
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        O Saldo de Acerto leva em conta o Saldo em Caixa -
                        Recebimentos em Pix.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-sm font-bold text-blue-800">
                  R$ {formatCurrency(saldoDeAcerto)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueGallery
          items={filteredReceipts}
          onDelete={handleDeleteReceipt}
        />
        <ExpenseGallery items={filteredExpenses} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por Funcionário</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <FinancialSummaryTable
              data={filteredSummary}
              onAddExpense={handleAddExpense}
              onViewReceipts={handleViewReceipts}
              onViewExpenses={handleViewExpenses}
              onGeneratePdf={handleGeneratePdf}
            />
          )}
        </CardContent>
      </Card>

      <ExpenseFormDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        onSuccess={() => fetchData(selectedRouteId)}
        preselectedEmployee={preselectedEmployee}
        activeRouteId={selectedRoute ? selectedRoute.id : undefined}
      />

      <ReceiptsDetailDialog
        open={viewReceipts.open}
        onOpenChange={(v) => setViewReceipts((p) => ({ ...p, open: v }))}
        employeeId={viewReceipts.empId}
        employeeName={viewReceipts.empName}
        route={selectedRoute}
        onDeleteReceipt={handleDeleteReceipt}
      />

      <ExpensesDetailDialog
        open={viewExpenses.open}
        onOpenChange={(v) => setViewExpenses((p) => ({ ...p, open: v }))}
        employeeId={viewExpenses.empId}
        employeeName={viewExpenses.empName}
        route={selectedRoute}
      />

      <CloseCashierDialog
        open={isCloseCashierDialogOpen}
        onOpenChange={setIsCloseCashierDialogOpen}
        currentRoute={selectedRoute}
        onSuccess={() => fetchData(selectedRouteId)}
        targetEmployeeId={
          selectedEmployeeId && selectedEmployeeId !== 'all'
            ? parseInt(selectedEmployeeId)
            : undefined
        }
      />

      <AlertDialog
        open={alertState.open}
        onOpenChange={(open) => setAlertState((p) => ({ ...p, open }))}
      >
        <AlertDialogContent>
          <VisuallyHidden>
            <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
          </VisuallyHidden>
          <div className="py-4 text-center">
            <AlertDialogDescription className="text-base font-medium text-foreground">
              {alertState.message}
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
