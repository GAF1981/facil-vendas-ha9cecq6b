import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ClipboardList,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Calendar,
  Hash,
  PlayCircle,
  StopCircle,
  ScanBarcode,
  Truck,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Eraser,
  Search,
} from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { InventarioSummary } from '@/components/inventario/InventarioSummary'
import { InventarioPagination } from '@/components/inventario/InventarioPagination'
import { inventarioService } from '@/services/inventarioService'
import {
  InventarioItem,
  DatasDeInventario,
  InventarioSummaryData,
} from '@/types/inventario'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { EmployeeSelectionDialog } from '@/components/inventario/EmployeeSelectionDialog'
import { MovementDialog } from '@/components/inventario/MovementDialog'
import { safeFormatDate } from '@/lib/formatters'
import { InventarioTableSkeleton } from '@/components/inventario/InventarioTableSkeleton'

export default function InventarioPage() {
  // Session State
  const [activeSession, setActiveSession] = useState<DatasDeInventario | null>(
    null,
  )
  const [sessionLoading, setSessionLoading] = useState(true)

  // Decoupled Data States
  const [tableData, setTableData] = useState<InventarioItem[]>([])
  const [tableLoading, setTableLoading] = useState(true)
  const [tableError, setTableError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const [summaryData, setSummaryData] = useState<
    InventarioSummaryData | undefined
  >(undefined)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const { toast } = useToast()

  // Actions State
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false)

  // Pagination & Filters State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')

  const totalPages = Math.ceil(totalCount / pageSize)

  // Initial Session Fetch
  const fetchSession = async () => {
    setSessionLoading(true)
    try {
      const session = await inventarioService.getActiveSession()
      setActiveSession(session)
    } catch (error) {
      console.error('Error fetching session:', error)
      toast({
        title: 'Aviso',
        description: 'Não foi possível carregar a sessão ativa.',
        variant: 'destructive',
      })
    } finally {
      setSessionLoading(false)
    }
  }

  useEffect(() => {
    fetchSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Independent Fetcher: Table Data
  const fetchTableData = useCallback(async () => {
    if (sessionLoading) return // Wait for session check

    setTableLoading(true)
    setTableError(null)

    const targetId = activeSession?.['CODIGO FUNCIONARIO'] ?? undefined
    const targetSessionId = activeSession?.['ID INVENTÁRIO']

    try {
      const { data, totalCount } =
        await inventarioService.getInventoryPaginated(
          targetId,
          targetSessionId,
          page,
          pageSize,
          searchTerm,
        )
      setTableData(data)
      setTotalCount(totalCount)
    } catch (error) {
      console.error('Table Fetch Error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao buscar itens.'
      setTableError(errorMessage)
    } finally {
      setTableLoading(false)
    }
  }, [activeSession, page, pageSize, searchTerm, sessionLoading])

  // Independent Fetcher: Summary Data
  const fetchSummaryData = useCallback(async () => {
    if (sessionLoading) return // Wait for session check

    setSummaryLoading(true)
    setSummaryError(null)

    const targetId = activeSession?.['CODIGO FUNCIONARIO'] ?? undefined
    const targetSessionId = activeSession?.['ID INVENTÁRIO']

    try {
      const summary = await inventarioService.getInventorySummary(
        targetId,
        targetSessionId,
        searchTerm,
      )
      setSummaryData(summary)
    } catch (error) {
      console.error('Summary Fetch Error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao calcular resumo.'
      setSummaryError(errorMessage)
    } finally {
      setSummaryLoading(false)
    }
  }, [activeSession, searchTerm, sessionLoading])

  // Trigger Fetches - Decoupled Effects
  // 1. Table Fetch Trigger
  useEffect(() => {
    fetchTableData()
  }, [fetchTableData])

  // 2. Summary Fetch Trigger
  // Note: Summary does NOT depend on 'page', preventing unnecessary re-fetches during pagination
  useEffect(() => {
    fetchSummaryData()
  }, [fetchSummaryData])

  // Diagnostic Logger
  useEffect(() => {
    if (tableError || summaryError) {
      console.group('Inventario Page Diagnostics')
      console.error('Errors detected on page:', {
        tableError,
        summaryError,
      })
      console.info('Current Context Params:', {
        sessionId: activeSession?.['ID INVENTÁRIO'] || 'N/A',
        employeeId: activeSession?.['CODIGO FUNCIONARIO'] || 'N/A',
        page,
        pageSize,
        searchTerm,
        timestamp: new Date().toISOString(),
      })
      console.groupEnd()
    }
  }, [tableError, summaryError, activeSession, page, pageSize, searchTerm])

  const handleClearCache = () => {
    setPage(1)
    setSearchTerm('')
    setTableData([])
    setSummaryData(undefined)
    // Re-trigger fetches by resetting states indirectly or calling explicilty
    // Simply refreshing session is a good way to "soft reset" context
    fetchSession().then(() => {
      fetchTableData()
      fetchSummaryData()
    })
    toast({
      title: 'Cache Limpo',
      description: 'Dados recarregados do servidor.',
    })
  }

  const handleRefresh = () => {
    fetchTableData()
    fetchSummaryData()
  }

  const handleStartGeneralInventory = async () => {
    setActionLoading(true)
    try {
      const session = await inventarioService.startSession('GERAL')
      setActiveSession(session)
      // activeSession change will trigger useEffects for data
      toast({
        title: 'Inventário Geral Iniciado',
        description: `Sessão #${session['ID INVENTÁRIO']} iniciada.`,
        className: 'bg-blue-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao iniciar',
        description: 'Não foi possível iniciar o inventário.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleStartEmployeeInventory = (employeeId: number) => {
    const start = async () => {
      setActionLoading(true)
      try {
        const session = await inventarioService.startSession(
          'FUNCIONARIO',
          employeeId,
        )
        setActiveSession(session)
        setIsEmployeeDialogOpen(false)
        toast({
          title: 'Inventário de Funcionário Iniciado',
          description: `Sessão #${session['ID INVENTÁRIO']} iniciada para funcionário ${employeeId}.`,
          className: 'bg-blue-600 text-white',
        })
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao iniciar',
          description: 'Não foi possível iniciar o inventário.',
          variant: 'destructive',
        })
      } finally {
        setActionLoading(false)
      }
    }
    start()
  }

  const handleCloseInventory = async () => {
    if (!activeSession) return
    setActionLoading(true)
    try {
      await inventarioService.closeSession(activeSession['ID INVENTÁRIO'])
      setActiveSession(null)
      toast({
        title: 'Inventário Finalizado',
        description: 'A sessão de inventário foi encerrada com sucesso.',
        className: 'bg-green-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao finalizar',
        description: 'Não foi possível encerrar o inventário.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleMovement = async (
    type: 'REPOSICAO' | 'DEVOLUCAO',
    employeeId: number,
    productId: number,
    quantity: number,
  ) => {
    if (!activeSession) return
    try {
      await inventarioService.createMovement({
        TIPO: type,
        funcionario_id: employeeId,
        produto_id: productId,
        quantidade: quantity,
        session_id: activeSession['ID INVENTÁRIO'],
      })
      toast({
        title:
          type === 'REPOSICAO'
            ? 'Reposição Registrada'
            : 'Devolução Registrada',
        description: 'A movimentação foi salva com sucesso.',
        className: 'bg-green-600 text-white',
      })
      // Refresh both to update stocks and totals
      handleRefresh()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro na movimentação',
        description: 'Não foi possível salvar a movimentação.',
        variant: 'destructive',
      })
    }
  }

  const getHeaderTitle = () => {
    if (activeSession?.TIPO === 'GERAL') return 'Inventário Estoque Geral'
    if (activeSession?.TIPO === 'FUNCIONARIO') return 'Inventário Funcionário'
    return 'Inventário de Mercadorias'
  }

  const renderActionButtons = () => {
    if (activeSession) {
      return (
        <>
          <Button
            variant="outline"
            className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
            onClick={() => setIsReposicaoOpen(true)}
          >
            <Truck className="h-4 w-4" />
            Reposição
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
            onClick={() => setIsDevolucaoOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Devolução
          </Button>
          <div className="w-px h-8 bg-gray-200 mx-2 hidden md:block" />
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Link to="/inventario/contagem">
              <ScanBarcode className="h-4 w-4" />
              Contagem de Saldo Final
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={handleCloseInventory}
            disabled={actionLoading}
            className="gap-2"
          >
            {actionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StopCircle className="h-4 w-4" />
            )}
            {activeSession.TIPO === 'GERAL'
              ? 'Fechar Inventário Geral'
              : 'Fechar Inventário'}
          </Button>
        </>
      )
    }

    return (
      <>
        <Button
          onClick={handleStartGeneralInventory}
          disabled={actionLoading}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          {actionLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Iniciar Inventário Estoque Geral
        </Button>
        <Button
          onClick={() => setIsEmployeeDialogOpen(true)}
          disabled={actionLoading}
          variant="outline"
          className="gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          Iniciar Inventário Funcionário
        </Button>
      </>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 text-violet-700 rounded-lg shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
            <p className="text-muted-foreground">
              Visão geral do estoque, movimentações e conferência.
            </p>
            {activeSession && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-violet-700 bg-violet-50 px-3 py-1.5 rounded-md border border-violet-100">
                <div className="flex items-center gap-1 font-mono">
                  <Hash className="h-3.5 w-3.5" />
                  ID: {activeSession['ID INVENTÁRIO']}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Início:{' '}
                  {safeFormatDate(
                    activeSession['Data de Início de Inventário'],
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearCache}
            className="text-orange-700 border-orange-200 hover:bg-orange-50"
            title="Limpar Cache e Recarregar"
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpar Cache
          </Button>

          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={tableLoading || summaryLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${tableLoading || summaryLoading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Independent Summary Section */}
      <InventarioSummary
        summary={summaryData}
        loading={summaryLoading}
        error={summaryError}
      />

      {/* Filters and Actions */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-muted/20 p-4 rounded-lg border">
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por produto..."
              className="pl-8 w-full md:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                }
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
          {renderActionButtons()}
        </div>
      </div>

      {/* Main Content (Table) */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{getHeaderTitle()}</CardTitle>
              <CardDescription>
                Acompanhamento detalhado de entradas, saídas e saldo final.
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground flex flex-col items-end">
              <span>
                Exibindo {tableData.length} de {totalCount} itens
              </span>
              {tableData.some((i) => i.hasError) && (
                <span className="text-red-500 font-medium flex items-center inline-flex mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Alguns itens contêm erros
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <InventarioTableSkeleton />
          ) : tableError ? (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Tabela</AlertTitle>
              <AlertDescription>
                Não foi possível carregar os itens do inventário: {tableError}
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTableData()}
                    className="border-red-200 hover:bg-red-50 text-red-900"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Tentar Novamente
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <InventarioTable data={tableData} />
              <InventarioPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeSelectionDialog
        open={isEmployeeDialogOpen}
        onOpenChange={setIsEmployeeDialogOpen}
        onConfirm={handleStartEmployeeInventory}
        loading={actionLoading}
      />

      <MovementDialog
        open={isReposicaoOpen}
        onOpenChange={setIsReposicaoOpen}
        type="REPOSICAO"
        onConfirm={(empId, prodId, qty) =>
          handleMovement('REPOSICAO', empId, prodId, qty)
        }
      />

      <MovementDialog
        open={isDevolucaoOpen}
        onOpenChange={setIsDevolucaoOpen}
        type="DEVOLUCAO"
        onConfirm={(empId, prodId, qty) =>
          handleMovement('DEVOLUCAO', empId, prodId, qty)
        }
      />
    </div>
  )
}
