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
  Filter,
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

export default function CaixaPage() {
  const [loading, setLoading] = useState(true)
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [summaryData, setSummaryData] = useState<CaixaSummaryRow[]>([])
  const [allReceipts, setAllReceipts] = useState<ReceiptDetail[]>([])
  const [allExpenses, setAllExpenses] = useState<ExpenseDetail[]>([])

  // Requirement: Employee Filter for Cashier Totalizers
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  const { toast } = useToast()

  // State for Dialogs
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
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
        // Parallel data fetching for performance
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
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      fetchData(selectedRouteId)
    }
  }, [selectedRouteId, routes])

  const selectedRoute = routes.find((r) => r.id.toString() === selectedRouteId)

  // FILTER LOGIC
  const filteredReceipts = useMemo(() => {
    if (selectedEmployeeId === 'all') return allReceipts
    return allReceipts.filter(
      (r) => r.funcionarioId === Number(selectedEmployeeId),
    )
  }, [allReceipts, selectedEmployeeId])

  const filteredExpenses = useMemo(() => {
    if (selectedEmployeeId === 'all') return allExpenses
    return allExpenses.filter(
      (e) => e.funcionarioId === Number(selectedEmployeeId),
    )
  }, [allExpenses, selectedEmployeeId])

  // Get unique employees from summary data for the filter dropdown
  const uniqueEmployees = useMemo(() => {
    return summaryData.map((s) => ({
      id: s.funcionarioId,
      name: s.funcionarioNome,
    }))
  }, [summaryData])

  // Calculated Totals based on Filtered Data
  const totalRecebido = filteredReceipts.reduce((acc, r) => acc + r.valor, 0)
  const totalDespesas = filteredExpenses.reduce((acc, e) => acc + e.valor, 0)
  const totalSaldo = totalRecebido - totalDespesas

  // Segmented Totals (Filtered)
  const totalPix = filteredReceipts
    .filter((r) => r.forma === 'Pix')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalDinheiro = filteredReceipts
    .filter((r) => r.forma === 'Dinheiro')
    .reduce((acc, r) => acc + r.valor, 0)
  const totalCheque = filteredReceipts
    .filter((r) => r.forma === 'Cheque')
    .reduce((acc, r) => acc + r.valor, 0)

  // Handlers
  const handleOpenGeneralExpense = () => {
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

  // --- PDF GENERATION LOGIC ---
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

      // Filter lists if it's for specific employee, otherwise pass all
      const receiptsToPass = employeeId
        ? allReceipts.filter((r) => r.funcionarioId === employeeId)
        : allReceipts

      const expensesToPass = employeeId
        ? allExpenses.filter((e) => e.funcionarioId === employeeId)
        : allExpenses

      // If for employee, calculate their specific totals
      let specificTotalRecebido =
        summaryData.reduce((acc, row) => acc + row.totalRecebido, 0) -
        (employeeId
          ? summaryData.find((s) => s.funcionarioId !== employeeId)
              ?.totalRecebido || 0
          : 0) // Placeholder logic, actually we should use computed totals

      // Correct logic for PDF totals
      if (employeeId) {
        const empSummary = summaryData.find(
          (s) => s.funcionarioId === employeeId,
        )
        if (empSummary) {
          specificTotalRecebido = empSummary.totalRecebido
          // ... other totals would be similar but let's trust server logic or pass pre-calc
        }
      } else {
        // Global
        specificTotalRecebido = summaryData.reduce(
          (acc, row) => acc + row.totalRecebido,
          0,
        )
      }
      // Note: The original code had slightly confusing logic here, simplifying:
      // We'll just pass what the function expects.
      // If employeeId is present, we pass THAT employee's summary.

      let finalTotalRecebido = totalRecebido
      let finalTotalDespesas = totalDespesas
      let finalTotalSaldo = totalSaldo

      if (employeeId) {
        const empSummary = summaryData.find(
          (s) => s.funcionarioId === employeeId,
        )
        finalTotalRecebido = empSummary?.totalRecebido || 0
        finalTotalDespesas = empSummary?.totalDespesas || 0
        finalTotalSaldo = empSummary?.saldo || 0
      } else {
        // Use the globals calculated from raw data to ensure consistency
        finalTotalRecebido = allReceipts.reduce((acc, r) => acc + r.valor, 0)
        finalTotalDespesas = allExpenses.reduce((acc, e) => acc + e.valor, 0)
        finalTotalSaldo = finalTotalRecebido - finalTotalDespesas
      }

      const { data: pdfBlob, error } = await supabase.functions.invoke(
        'generate-pdf',
        {
          body: {
            reportType,
            summaryData: employeeId ? [] : summaryData, // Only needed for general
            receipts: receiptsToPass,
            expenses: expensesToPass,
            totalRecebido: finalTotalRecebido,
            totalDespesas: finalTotalDespesas,
            totalSaldo: finalTotalSaldo,
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
        // Automatically open in new tab instead of download
        const blob = new Blob([pdfBlob], { type: 'application/pdf' })
        const url = window.URL.createObjectURL(blob)
        window.open(url, '_blank')

        // Clean up URL object after a short delay to ensure it opened
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
            onClick={() => handleGeneratePdf()}
            variant="outline"
            disabled={generatingPdf || loading || !selectedRoute}
            className="flex-1 sm:flex-none"
          >
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Resumo Geral PDF
          </Button>
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

      {/* Route Selector */}
      <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Período / Rota
              </CardTitle>
              <CardDescription>
                Selecione a rota para visualizar o balanço financeiro.
              </CardDescription>
            </div>
            <div className="w-full md:w-[300px]">
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

      {/* Main Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Balanço por Funcionário</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <FinancialSummaryTable
              data={summaryData}
              onAddExpense={handleAddExpense}
              onViewReceipts={handleViewReceipts}
              onViewExpenses={handleViewExpenses}
              onGeneratePdf={handleGeneratePdf}
            />
          )}
        </CardContent>
      </Card>

      {/* Requirement: Employee Filter */}
      <div className="flex justify-end">
        <div className="w-full sm:w-[300px] flex items-center gap-2 bg-card p-3 rounded-lg border shadow-sm">
          <Label className="whitespace-nowrap flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filtrar Totais:
          </Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os Funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Funcionários</SelectItem>
              {uniqueEmployees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segmented Financial Totalizers (Filtered) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Recebimentos em PIX
            </CardTitle>
            <QrCode className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalPix)}
            </div>
            {selectedEmployeeId !== 'all' && (
              <p className="text-xs text-muted-foreground mt-1">
                Filtrado por funcionário
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Recebimentos em Dinheiro
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalDinheiro)}
            </div>
            {selectedEmployeeId !== 'all' && (
              <p className="text-xs text-muted-foreground mt-1">
                Filtrado por funcionário
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-green-200 shadow-sm border-l-4 border-l-green-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Recebimentos em Cheque
            </CardTitle>
            <Landmark className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalCheque)}
            </div>
            {selectedEmployeeId !== 'all' && (
              <p className="text-xs text-muted-foreground mt-1">
                Filtrado por funcionário
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overall Financial Totalizers (Filtered) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-green-50/50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Total Entradas (Geral)
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(totalRecebido)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">
              Saídas (Despesas)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              R$ {formatCurrency(totalDespesas)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Saldo em Caixa
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(totalSaldo)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Galleries (Filtered) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueGallery items={filteredReceipts} />
        <ExpenseGallery items={filteredExpenses} />
      </div>

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
    </div>
  )
}
