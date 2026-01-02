import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Link, useNavigate } from 'react-router-dom'
import { EmployeeSelectionDialog } from '@/components/inventario/EmployeeSelectionDialog'
import { MovementDialog } from '@/components/inventario/MovementDialog'
import { safeFormatDate } from '@/lib/formatters'
import { InventarioTableSkeleton } from '@/components/inventario/InventarioTableSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function InventarioPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InventarioItem[]>([])
  const [summary, setSummary] = useState<InventarioSummaryData>({
    initial: { qty: 0, value: 0 },
    final: { qty: 0, value: 0 },
    positiveDiff: { qty: 0, value: 0 },
    negativeDiff: { qty: 0, value: 0 },
  })
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const [activeSession, setActiveSession] = useState<DatasDeInventario | null>(
    null,
  )
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Movement Dialogs State
  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false)

  // Pagination & Filters State
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  // We debounce search in a real app, here we just useEffect on it or manual trigger
  // For simplicity, we trigger on Enter or blur in Search Input

  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchData = useCallback(
    async (
      funcionarioId?: number,
      sessionId?: number | null,
      currentPage: number = 1,
      forceReload: boolean = false,
    ) => {
      // Only show full loading if we are forcing reload or have no data
      if (forceReload || data.length === 0) {
        setLoading(true)
      }
      setError(null)
      try {
        const targetId =
          funcionarioId ?? activeSession?.['CODIGO FUNCIONARIO'] ?? undefined
        const targetSessionId = sessionId ?? activeSession?.['ID INVENTÁRIO']

        // 1. Fetch Paginated Data
        const { data: items, totalCount: count } =
          await inventarioService.getInventoryPaginated(
            targetId,
            targetSessionId,
            currentPage,
            pageSize,
            searchTerm,
          )

        setData(items)
        setTotalCount(count)

        // 2. Fetch Summary (Aggregated) - This ensures summary is for ALL data, not just page
        const summaryData = await inventarioService.getInventorySummary(
          targetId,
          targetSessionId,
          searchTerm,
        )
        setSummary(summaryData)
      } catch (error) {
        console.error(error)
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido'

        if (data.length > 0) {
          toast({
            title: 'Aviso de Atualização',
            description:
              'Não foi possível atualizar os dados. Exibindo dados em cache.',
            variant: 'destructive',
          })
        } else {
          setError(errorMessage)
          toast({
            title: 'Erro ao carregar',
            description: 'Não foi possível buscar os dados de inventário.',
            variant: 'destructive',
          })
        }
      } finally {
        setLoading(false)
      }
    },
    [activeSession, pageSize, searchTerm, toast, data.length],
  )

  const fetchSession = async () => {
    try {
      const session = await inventarioService.getActiveSession()
      setActiveSession(session)
      // If we have an active session, pass its ID to ensure continuity logic works
      fetchData(
        session?.['CODIGO FUNCIONARIO'] ?? undefined,
        session?.['ID INVENTÁRIO'],
        1,
        true,
      )
    } catch (error) {
      console.error(error)
      // Even if session fetch fails, try to fetch generic data
      fetchData(undefined, undefined, 1, true)
    }
  }

  useEffect(() => {
    fetchSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Initial Load

  // Effect to refetch when page/search changes
  useEffect(() => {
    if (activeSession !== undefined) {
      fetchData(
        activeSession?.['CODIGO FUNCIONARIO'] ?? undefined,
        activeSession?.['ID INVENTÁRIO'],
        page,
        false,
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm])

  const handleClearCache = () => {
    // Reset states and force reload
    setPage(1)
    setSearchTerm('')
    setData([])
    fetchData(
      activeSession?.['CODIGO FUNCIONARIO'] ?? undefined,
      activeSession?.['ID INVENTÁRIO'],
      1,
      true,
    )
    toast({
      title: 'Cache Limpo',
      description: 'Dados recarregados do servidor.',
    })
  }

  const handleStartGeneralInventory = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const session = await inventarioService.startSession('GERAL')
      setActiveSession(session)
      fetchData(undefined, session['ID INVENTÁRIO'], 1, true)
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
      setError(null)
      try {
        const session = await inventarioService.startSession(
          'FUNCIONARIO',
          employeeId,
        )
        setActiveSession(session)
        setIsEmployeeDialogOpen(false)
        fetchData(employeeId, session['ID INVENTÁRIO'], 1, true)
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
    setError(null)
    try {
      await inventarioService.closeSession(activeSession['ID INVENTÁRIO'])
      setActiveSession(null)
      fetchData(undefined, null, 1, true)
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
      fetchData(
        activeSession['CODIGO FUNCIONARIO'] ?? undefined,
        activeSession['ID INVENTÁRIO'],
        page,
        true,
      )
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
            onClick={() =>
              fetchData(
                activeSession?.['CODIGO FUNCIONARIO'] ?? undefined,
                activeSession?.['ID INVENTÁRIO'],
                page,
                true,
              )
            }
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="space-y-6 animate-fade-in">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="bg-muted/20 p-4 rounded-lg border h-20 flex items-center justify-between">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
          <InventarioTableSkeleton />
        </div>
      ) : error && data.length === 0 ? (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Carregamento</AlertTitle>
          <AlertDescription>
            Ocorreu um problema ao buscar os dados do inventário: {error}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleClearCache()}
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
          <InventarioSummary summary={summary} />

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
                      setPage(1) // Reset to first page on new search
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
              {renderActionButtons()}
            </div>
          </div>

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
                    Exibindo {data.length} de {totalCount} itens
                  </span>
                  {data.some((i) => i.hasError) && (
                    <span className="text-red-500 font-medium flex items-center inline-flex mt-1">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Alguns itens contêm erros
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <InventarioTable
                data={data}
                // Sorting logic is handled by server order (Name default),
                // client sort is removed or can be kept for current page only
                // For simplicity and correctness with pagination, we rely on server default order (Name)
                // or we could implement server sort later.
              />

              <InventarioPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </>
      )}

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
