import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EstoqueCarroSession } from '@/types/estoque_carro'
import {
  RotateCcw,
  Play,
  Calculator,
  CheckCircle2,
  Gift,
  Lock,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'

interface Props {
  viewedSession: EstoqueCarroSession | null
  activeSession: EstoqueCarroSession | null
  onStart: () => void
  onReset: () => void
  onCount: () => void
  onFinalize: () => void
  onBrinde: () => void
  loading: boolean
  disableFinalize?: boolean
  canFinalize?: boolean
}

export function EstoqueCarroControlBar({
  viewedSession,
  activeSession,
  onStart,
  onReset,
  onCount,
  onFinalize,
  onBrinde,
  loading,
  disableFinalize = false,
  canFinalize = true,
}: Props) {
  const { canAccess } = usePermissions()
  const canReset = canAccess('Botão Reset Estoque Carro')
  const canFinalizeEstoque = canAccess('Botão Finalizar Estoque Carro')

  const isViewedSessionClosed = !!viewedSession?.data_fim
  const isViewedSessionActive =
    viewedSession &&
    activeSession &&
    viewedSession.id === activeSession.id &&
    !isViewedSessionClosed
  const canStartNew = !activeSession

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-2 items-center">
        {!viewedSession && canStartNew && (
          <Button
            onClick={onStart}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-2 h-4 w-4" /> Iniciar Carro Estoque
          </Button>
        )}

        {viewedSession && isViewedSessionClosed && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded text-gray-600 border border-gray-200 w-full sm:w-auto">
            <Lock className="h-4 w-4" />
            <span className="font-medium text-sm">
              Histórico - Sessão Finalizada
            </span>
          </div>
        )}

        {viewedSession && isViewedSessionActive && (
          <>
            {canReset && (
              <Button variant="outline" onClick={onReset} disabled={loading}>
                <RotateCcw className="mr-2 h-4 w-4 text-red-600" /> Reset Saldo
                Inicial
              </Button>
            )}

            <Button variant="secondary" onClick={onCount} disabled={loading}>
              <Calculator className="mr-2 h-4 w-4" /> Contagem Carro
            </Button>

            <Button
              variant="outline"
              onClick={onBrinde}
              disabled={loading}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Gift className="mr-2 h-4 w-4" /> Brinde
            </Button>

            <div className="flex-1" />

            {canFinalizeEstoque && (
              <Button
                onClick={onFinalize}
                disabled={loading || disableFinalize || !canFinalize}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !canFinalize
                    ? 'Você não tem permissão para finalizar.'
                    : disableFinalize
                      ? 'Realize todas as contagens pendentes antes de finalizar.'
                      : ''
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar Ajustes e
                Abrir Novo
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
