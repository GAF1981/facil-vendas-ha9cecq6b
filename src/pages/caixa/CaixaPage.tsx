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
import { CloseCashierDialog } from '@/components/caixa/CloseCashierDialog'
import { useUserStore } from '@/stores/useUserStore'
import { MultiSelect, Option } from '@/components/common/MultiSelect'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fechamentoService } from '@/services/fechamentoService'

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [summaryData, setSummaryData] = useState<CaixaSummaryRow[]>([])
  const [allReceipts, setAllReceipts] = useState<ReceiptDetail[]>([])
  const [allExpenses, setAllExpenses] = useState<ExpenseDetail[]>([])

  // Employee Filter State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
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

  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('A4')

  // Initialization: Fetch Routes and Set Default User
  useEffect(() => {
    fetchRoutes()
    if (loggedInUser) {
      setSelectedEmployeeIds([loggedInUser.id.toString()])
    }
  }, [])

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

  const fetchData = async (routeId: string) => {
    if (!routeId) return
    setLoading(true)
    try {
      const route = routes.find((r) => r.id.toString() === routeId)
      if (route) {
        const [summary, receipts, expenses] = await Promise.all([
          caixaService.getFinancialSummary(route),
          caixaService.getAllReceipts(route),
          caixaService.getAllExpenses(route),
        ])

        setSummaryData(summary)
        setAllReceipts(receipts)
        setAllExpenses(expenses)
      }
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
    if (selectedRouteId && routes.length > 0) {
      fetchData(selectedRouteId)
    }
  }, [selectedRouteId, routes])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  // Filtering Logic
  const employeeOptions: Option[] = useMemo(() => {
    return summaryData.map((s) => ({
      label: s.funcionarioNome,
      value: s.funcionarioId.toString(),
    }))
  }, [summaryData])

  const filteredReceipts = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return allReceipts
    return allReceipts.filter((r) =>
      selectedEmployeeIds.includes(r.funcionarioId?.toString() || ''),
    )
  }, [allReceipts, selectedEmployeeIds])

  const filteredExpenses = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return allExpenses
    return allExpenses.filter((e) =>
      selectedEmployeeIds.includes(e.funcionarioId?.toString() || ''),
    )
  }, [allExpenses, selectedEmployeeIds])

  const filteredSummary = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return summaryData
    return summaryData.filter((s) =>
      selectedEmployeeIds.includes(s.funcionarioId.toString()),
    )
  }, [summaryData, selectedEmployeeIds])

  // Calculations (Ensuring correct subtractions)
  const totalRecebido = filteredReceipts.reduce((acc, r) => acc + r.valor, 0)
  // Ensure we only sum expenses that came out of the cashier
  const totalDespesas = filteredExpenses
    .filter((e) => e.saiuDoCaixa)
    .reduce((acc, e) => acc + e.valor, 0)

  const totalSaldo = totalRecebido - totalDespesas

  const totalPix = filteredReceipts
    .filter((r) => r.forma === 'Pix')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalDinheiro = filteredReceipts
    .filter((r) => r.forma === 'Dinheiro')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalCheque = filteredReceipts
    .filter((r) => r.forma === 'Cheque')
    .reduce((acc, r) => acc + r.valor, 0)

  // Saldo de Acerto = (Total Saldo - Total Pix)
  const saldoDeAcerto = totalSaldo - totalPix

  const handleOpenGeneralExpense = async () => {
    if (!loggedInUser || !selectedRouteId) return

    try {
      const status = await fechamentoService.getClosureStatus(
        parseInt(selectedRouteId),
        loggedInUser.id,
      )
      if (status === 'Aberto' || status === 'Fechado') {
        toast({
          title: 'Ação Bloqueada',
          description:
            'Seu Caixa está fechado para a Rota !!! Você deve aguardar abrir uma Nova Rota !!!',
          variant: 'destructive',
        })
        return
      }
    } catch (e) {
      console.error(e)
    }

    setPreselectedEmployee(null)
    setIsExpenseDialogOpen(true)
  }

  const handleAddExpense = (empId: number, empName: string) => {
    setPreselectedEmployee({ id: empId, name: empName })
    setIsExpenseDialogOpen(true)
  }

  const handleViewReceipts = (empId: number, empName: string) => {
    setViewReceipts({ open: true, empId, empName })
  }

  const handleViewExpenses = (empId: number, empName: string) => {
    setViewExpenses({ open: true, empId, empName })
  }

  const handleGeneratePdf = async (
    employeeId?: number,
    employeeName?: string,
  ) => {
    if (!selectedRoute) return
    setGeneratingPdf(true)
    try {
      const reportType = employeeId ? 'employee-cash-summary' : 'cash-summary'
      const employeeData = employeeId
        ? {
            id: employeeId,
            name: employeeName,
          }
        : null

      const receiptsToPass = employeeId
        ? allReceipts.filter((r) => r.funcionarioId === employeeId)
        : allReceipts

      const expensesToPass = employeeId
        ? allExpenses.filter((e) => e.funcionarioId === employeeId)
        : allExpenses

      let finalTotalRecebido = totalRecebido
      let finalTotalDespesas = totalDespesas
      let finalTotalSaldo = totalSaldo
      let finalSaldoDeAcerto = saldoDeAcerto

      if (employeeId) {
        const empSummary = summaryData.find(
          (s) => s.funcionarioId === employeeId,
        )
        finalTotalRecebido = empSummary?.totalRecebido || 0
        finalTotalDespesas = empSummary?.totalDespesas || 0
        finalTotalSaldo = empSummary?.saldo || 0

        // Calculate specific Saldo de Acerto for Employee
        const empPix = receiptsToPass
          .filter((r) => r.forma === 'Pix')
          .reduce((acc, r) => acc + r.valor, 0)
        finalSaldoDeAcerto = finalTotalSaldo - empPix
      }

      const { data: pdfBlob, error } = await supabase.functions.invoke(
        'generate-pdf',
        {
          body: {
            reportType,
            format: printFormat,
            summaryData: employeeId ? [] : filteredSummary,
            receipts: receiptsToPass,
            expenses: expensesToPass,
            totalRecebido: finalTotalRecebido,
            totalDespesas: finalTotalDespesas,
            totalSaldo: finalTotalSaldo,
            saldoDeAcerto: finalSaldoDeAcerto,
            periodo: {
              inicio: selectedRoute.data_inicio,
              fim: selectedRoute.data_fim,
              rotaId: selectedRoute.id,
            },
            employee: employeeData,
            date: new Date().toISOString(),
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
          <Button
            onClick={() => setIsCloseCashierDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none text-white"
            disabled={!selectedRoute}
          >
            <Lock className="mr-2 h-4 w-4" />
            Fechar Caixa
          </Button>
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
              disabled={generatingPdf || loading || !selectedRoute}
              className="flex-1 sm:flex-none"
            >
              {generatingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              PDF Geral
            </Button>
          </div>
          <Button
            onClick={handleOpenGeneralExpense}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Cadastrar Despesa
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchData(selectedRouteId)}
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
                Selecione a rota e os funcionários para visualizar o balanço.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="w-full sm:w-[250px]">
                <Label className="text-xs mb-1 block">Funcionários</Label>
                <MultiSelect
                  options={employeeOptions}
                  selected={selectedEmployeeIds}
                  onChange={setSelectedEmployeeIds}
                  placeholder="Selecione funcionários..."
                />
              </div>
              <div className="w-full sm:w-[250px]">
                <Label className="text-xs mb-1 block">Rota</Label>
                <Select
                  value={selectedRouteId}
                  onValueChange={setSelectedRouteId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a rota" />
                  </SelectTrigger>
                  <SelectContent>
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedRoute ? (
            <div className="flex flex-wrap gap-4 pt-2 text-sm">
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Início:</span>
                <span className="font-medium">
                  {safeFormatDate(selectedRoute.data_inicio)}
                </span>
              </div>
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Fim:</span>
                <span className="font-medium">
                  {selectedRoute.data_fim
                    ? safeFormatDate(selectedRoute.data_fim)
                    : 'Em andamento'}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
              <Wallet className="h-3 w-3" /> Saldo em Caixa
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
        <RevenueGallery items={filteredReceipts} />
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
      />

      <ReceiptsDetailDialog
        open={viewReceipts.open}
        onOpenChange={(v) => setViewReceipts((p) => ({ ...p, open: v }))}
        employeeId={viewReceipts.empId}
        employeeName={viewReceipts.empName}
        route={selectedRoute}
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
      />
    </div>
  )
}
