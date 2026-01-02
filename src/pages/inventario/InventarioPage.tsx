import { useEffect, useState, useMemo } from 'react'
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
import { Switch } from '@/components/ui/switch'
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
  Filter,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import { InventarioTable } from '@/components/inventario/InventarioTable'
import { InventarioSummary } from '@/components/inventario/InventarioSummary'
import { inventarioService } from '@/services/inventarioService'
import { InventarioItem, DatasDeInventario } from '@/types/inventario'
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
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [activeSession, setActiveSession] = useState<DatasDeInventario | null>(
    null,
  )
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Movement Dialogs State
  const [isReposicaoOpen, setIsReposicaoOpen] = useState(false)
  const [isDevolucaoOpen, setIsDevolucaoOpen] = useState(false)

  // Filters & Sort State
  const [sortKey, setSortKey] = useState<keyof InventarioItem | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [minInitialBalance, setMinInitialBalance] = useState<string>('')
  const [minFinalBalance, setMinFinalBalance] = useState<string>('')
  const [showOnlyWithValues, setShowOnlyWithValues] = useState(false)

  const fetchData = async (
    funcionarioId?: number,
    sessionId?: number | null,
  ) => {
    // Only show full loading if we don't have data yet
    if (data.length === 0) {
      setLoading(true)
    }
    setError(null)
    try {
      const targetId =
        funcionarioId ?? activeSession?.['CODIGO FUNCIONARIO'] ?? undefined
      const targetSessionId = sessionId ?? activeSession?.['ID INVENTÁRIO']

      const result = await inventarioService.getInventory(
        targetId,
        targetSessionId,
      )
      setData(result)
    } catch (error) {
      console.error(error)
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido'

      // If we have data, we just show a toast warning instead of hiding everything
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
  }

  const fetchSession = async () => {
    try {
      const session = await inventarioService.getActiveSession()
      setActiveSession(session)
      // If we have an active session, pass its ID to ensure continuity logic works
      fetchData(
        session?.['CODIGO FUNCIONARIO'] ?? undefined,
        session?.['ID INVENTÁRIO'],
      )
    } catch (error) {
      console.error(error)
      // Even if session fetch fails, try to fetch generic data
      fetchData()
    }
  }

  useEffect(() => {
    fetchSession()
  }, [])

  const handleStartGeneralInventory = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const session = await inventarioService.startSession('GERAL')
      setActiveSession(session)
      fetchData(undefined, session['ID INVENTÁRIO'])
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
        fetchData(employeeId, session['ID INVENTÁRIO'])
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
      fetchData(undefined, null)
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

  const handleSort = (key: keyof InventarioItem) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const processedData = useMemo(() => {
    let filtered = [...data]

    // Apply Filters
    if (minInitialBalance) {
      const min = parseFloat(minInitialBalance)
      if (!isNaN(min)) {
        filtered = filtered.filter((item) => item.saldo_inicial >= min)
      }
    }

    if (minFinalBalance) {
      const min = parseFloat(minFinalBalance)
      if (!isNaN(min)) {
        filtered = filtered.filter((item) => item.saldo_final >= min)
      }
    }

    if (showOnlyWithValues) {
      filtered = filtered.filter(
        (item) => item.saldo_inicial > 0 || item.saldo_final > 0,
      )
    }

    // Apply Sort
    if (sortKey) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey]
        const bVal = b[sortKey]

        // Handle nulls
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        if (aVal === bVal) return 0

        const comparison = aVal > bVal ? 1 : -1
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [
    data,
    sortKey,
    sortDirection,
    minInitialBalance,
    minFinalBalance,
    showOnlyWithValues,
  ])

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
                onClick={() => fetchSession()}
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
          <InventarioSummary data={data} />

          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-muted/20 p-4 rounded-lg border">
            <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="min-initial"
                  className="text-xs whitespace-nowrap"
                >
                  Saldo Inicial &ge;
                </Label>
                <Input
                  id="min-initial"
                  type="number"
                  className="h-8 w-20"
                  placeholder="0"
                  value={minInitialBalance}
                  onChange={(e) => setMinInitialBalance(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="min-final"
                  className="text-xs whitespace-nowrap"
                >
                  Saldo Final &ge;
                </Label>
                <Input
                  id="min-final"
                  type="number"
                  className="h-8 w-20"
                  placeholder="0"
                  value={minFinalBalance}
                  onChange={(e) => setMinFinalBalance(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2 border-l pl-4 ml-2">
                <Switch
                  id="has-values"
                  checked={showOnlyWithValues}
                  onCheckedChange={setShowOnlyWithValues}
                />
                <Label htmlFor="has-values" className="cursor-pointer">
                  Com Saldo (Inicial ou Final &gt; 0)
                </Label>
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
                <div className="text-xs text-muted-foreground">
                  {processedData.length} itens listados
                  {data.some((i) => i.hasError) && (
                    <span className="ml-2 text-red-500 font-medium flex items-center inline-flex">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Alguns itens contêm erros
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <InventarioTable
                data={processedData}
                onSort={handleSort}
                sortKey={sortKey}
                sortDirection={sortDirection}
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
