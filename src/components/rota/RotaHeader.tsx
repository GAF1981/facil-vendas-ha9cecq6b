import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Rota } from '@/types/rota'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Play,
  Square,
  Loader2,
  Download,
  Save,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Info,
  MapIcon,
  List,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEffect, useState } from 'react'
import { caixaService, CaixaSummaryRow } from '@/services/caixaService'
import { rotaService } from '@/services/rotaService'
import { RotaImportDialog } from './RotaImportDialog'

interface RotaHeaderProps {
  activeRota: Rota | null
  lastRota: Rota | null
  onStart: () => void
  onEnd: () => void
  onExport: () => void
  loading: boolean
  hasPendingUpdates?: boolean
  pendingClosures?: string[]
  onImportSuccess?: () => void
  isGerencialActive?: boolean
  totalClients?: number
  isMapView?: boolean
  onToggleMap?: () => void
  hasCoordinates?: boolean
}

export function RotaHeader({
  activeRota,
  lastRota,
  onStart,
  onEnd,
  onExport,
  loading,
  hasPendingUpdates = false,
  onImportSuccess,
  isGerencialActive = true,
  totalClients,
  isMapView,
  onToggleMap,
  hasCoordinates,
}: RotaHeaderProps) {
  const displayRota = activeRota || lastRota
  const { canAccess } = usePermissions()
  const { employee } = useUserStore()
  const [summaryData, setSummaryData] = useState<CaixaSummaryRow[]>([])
  const [activeSellers, setActiveSellers] = useState<Set<number>>(new Set())
  const [alertsLoading, setAlertsLoading] = useState(false)

  useEffect(() => {
    if (activeRota) {
      setAlertsLoading(true)
      Promise.all([
        caixaService.getFinancialSummary(activeRota),
        rotaService.getRotaItems(activeRota.id),
      ])
        .then(([summary, items]) => {
          setSummaryData(summary)
          const sellers = new Set<number>()
          items.forEach((item) => {
            if (item.vendedor_id) sellers.add(item.vendedor_id)
          })
          setActiveSellers(sellers)
        })
        .catch(console.error)
        .finally(() => setAlertsLoading(false))
    } else {
      setSummaryData([])
      setActiveSellers(new Set())
    }
  }, [activeRota])

  const isHighLevelAdmin = (() => {
    if (employee?.setor) {
      const sectors = Array.isArray(employee.setor)
        ? employee.setor
        : [employee.setor]
      if (
        sectors.some(
          (s) =>
            s.toLowerCase() === 'administrador' ||
            s.toLowerCase() === 'gerente',
        )
      ) {
        return true
      }
    }
    return false
  })()

  const canViewFinalize = isHighLevelAdmin || canAccess('Relatório')

  const pendingClosingEmployees = summaryData
    .filter((row) => !row.hasClosingRecord)
    .map((row) => row.funcionarioNome)

  const pendingConfirmationEmployees = summaryData
    .filter((row) => row.hasClosingRecord && row.dbStatus === 'Aberto')
    .map((row) => row.funcionarioNome)

  const pendingRouteEmployees: string[] = []
  const ignoredRouteEmployees: string[] = []

  if (!alertsLoading) {
    const closedSellerIds = new Set(
      summaryData
        .filter((row) => row.hasClosingRecord)
        .map((row) => row.funcionarioId),
    )

    activeSellers.forEach((sellerId) => {
      if (!closedSellerIds.has(sellerId)) {
        const empSummary = summaryData.find((s) => s.funcionarioId === sellerId)

        let hasMovement = false
        let name = `Vendedor #${sellerId}`

        if (empSummary) {
          name = empSummary.funcionarioNome
          const totalActivity =
            Math.abs(empSummary.totalRecebido) +
            Math.abs(empSummary.totalDespesas) +
            Math.abs(empSummary.totalBoleto)
          if (totalActivity > 0.01) {
            hasMovement = true
          }
        }

        if (hasMovement) {
          pendingRouteEmployees.push(name)
        } else {
          ignoredRouteEmployees.push(name)
        }
      }
    })
  }

  const hasPendingClosing = pendingClosingEmployees.length > 0
  const hasPendingConfirmation = pendingConfirmationEmployees.length > 0
  const hasPendingRoute = pendingRouteEmployees.length > 0

  const hasIssues = hasPendingRoute || hasPendingConfirmation
  const isBlocked =
    loading || hasPendingUpdates || (!isHighLevelAdmin && hasIssues)

  return (
    <Card className="w-full border-l-4 border-l-primary shadow-sm bg-muted/20">
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 overflow-hidden">
          <h2 className="text-lg font-bold tracking-tight whitespace-nowrap">
            Controle de Rota {totalClients !== undefined && `(${totalClients})`}
          </h2>
          {displayRota ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold">
                #{displayRota.id}
              </span>
              <span className="truncate">
                {format(parseISO(displayRota.data_inicio), 'dd/MM HH:mm', {
                  locale: ptBR,
                })}
                {displayRota.data_fim ? (
                  <>
                    {' -> '}
                    {format(parseISO(displayRota.data_fim), 'dd/MM HH:mm', {
                      locale: ptBR,
                    })}
                  </>
                ) : (
                  <span className="text-green-700 font-semibold ml-2 bg-green-100 px-2 py-0.5 rounded border border-green-200 shadow-sm">
                    (em andamento)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma rota ativa ou recente.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto items-start">
          {hasPendingUpdates && (
            <div className="flex items-center gap-2 text-xs text-orange-600 font-medium animate-pulse mr-2 mt-2">
              <Save className="h-3 w-3" />
              Salvando...
            </div>
          )}

          <div className="flex items-start gap-2">
            {!isGerencialActive && (
              <RotaImportDialog
                activeRota={activeRota}
                onSuccess={onImportSuccess}
              />
            )}

            {onToggleMap && (
              <Button
                onClick={onToggleMap}
                variant="outline"
                className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50"
                title="Alternar Visualização"
              >
                {isMapView ? (
                  <>
                    <List className="mr-2 h-4 w-4" />
                    Visualizar Lista
                  </>
                ) : (
                  <>
                    <MapIcon className="mr-2 h-4 w-4" />
                    Visualizar Mapa
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onExport}
              variant="outline"
              className="w-full sm:w-auto"
              title="Exportar para Excel (CSV)"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>

          {!activeRota ? (
            <Button
              onClick={onStart}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Nova Rota
            </Button>
          ) : (
            canViewFinalize && (
              <>
                {ignoredRouteEmployees.length > 0 && isHighLevelAdmin && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-blue-600"
                        title="Vendedores sem movimento ignorados"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-64 bg-blue-50 border-blue-200"
                      align="end"
                    >
                      <div className="space-y-1">
                        <h4 className="font-semibold text-blue-900 text-xs">
                          Ignorados (Sem Movimento)
                        </h4>
                        <ul className="list-disc pl-4 text-[10px] text-blue-800">
                          {ignoredRouteEmployees.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {!isGerencialActive && hasPendingRoute && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 gap-2 h-9 border border-yellow-200 animate-pulse"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Pendência de Rota
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-yellow-50 border-yellow-200"
                      align="end"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" />
                          Vendedores Pendentes
                        </h4>
                        <p className="text-xs text-yellow-800">
                          Todos os vendedores com movimento devem fechar o
                          caixa.
                          {isHighLevelAdmin && (
                            <span className="block mt-1 font-bold">
                              Admin pode forçar.
                            </span>
                          )}
                        </p>
                        <ul className="list-disc pl-4 text-sm text-yellow-900 max-h-40 overflow-y-auto">
                          {pendingRouteEmployees.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {!hasPendingRoute && hasPendingClosing && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 h-9 border border-red-200 animate-pulse"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        {pendingClosingEmployees.length} Pendência(s) de
                        Fechamento
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-red-50 border-red-200"
                      align="end"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-red-900 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Fechamentos Pendentes
                        </h4>
                        <p className="text-xs text-red-800">
                          Os seguintes vendedores precisam fechar o caixa:
                        </p>
                        <ul className="list-disc pl-4 text-sm text-red-900">
                          {pendingClosingEmployees.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {hasPendingConfirmation && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 gap-2 h-9 border border-orange-200"
                      >
                        <Clock className="h-4 w-4" />
                        {pendingConfirmationEmployees.length} Pendência(s) de
                        Confirmação
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 bg-orange-50 border-orange-200"
                      align="end"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Confirmações Pendentes
                        </h4>
                        <p className="text-xs text-orange-800">
                          Os seguintes vendedores aguardam confirmação do
                          gerente:
                        </p>
                        <ul className="list-disc pl-4 text-sm text-orange-900">
                          {pendingConfirmationEmployees.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {!isGerencialActive && (
                  <div className="relative group">
                    <Button
                      onClick={onEnd}
                      disabled={isBlocked}
                      variant="destructive"
                      className="w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="mr-2 h-4 w-4" />
                      )}
                      {isHighLevelAdmin && hasIssues
                        ? 'Forçar Finalização'
                        : 'Finalizar Rota'}
                    </Button>
                    {isBlocked && !loading && !hasPendingUpdates && (
                      <div className="absolute top-full right-0 mt-1 w-64 p-2 bg-black/80 text-white text-xs rounded hidden group-hover:block z-50 text-center">
                        Não é possível finalizar. Existem caixas não fechados ou
                        pendentes de confirmação.
                        {!isHighLevelAdmin && ' (Restrito a Admin)'}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}
