import {
  Play,
  StopCircle,
  RotateCcw,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Truck,
  CheckSquare,
  Edit,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InventoryGeneralSession } from '@/types/inventory_general'
import { usePermissions } from '@/hooks/use-permissions'

interface Props {
  activeSession: InventoryGeneralSession | undefined
  selectedSession: InventoryGeneralSession | null
  canEdit: boolean
  isEditMode: boolean
  setIsEditMode: (v: boolean) => void
  onStartSession: () => void
  onResetInitial: () => void
  onOpenAction: (type: string) => void
  onFinalize: () => void
  allItemsCounted: boolean
}

export function InventoryControlBar({
  activeSession,
  selectedSession,
  canEdit,
  isEditMode,
  setIsEditMode,
  onStartSession,
  onResetInitial,
  onOpenAction,
  onFinalize,
  allItemsCounted,
}: Props) {
  const { canAccess } = usePermissions()
  const canReset = canAccess('Botão Reset Inventário')
  const canFinalizeInventory = canAccess('Botão Finalizar Inventário')

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-2 items-center">
        {!activeSession && (
          <Button
            onClick={onStartSession}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="mr-2 h-4 w-4" /> Iniciar Inventário Geral
          </Button>
        )}

        {canEdit && (
          <>
            <Button
              variant={isEditMode ? 'default' : 'outline'}
              onClick={() => setIsEditMode(!isEditMode)}
              className={
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'
              }
            >
              {isEditMode ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Edit className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? 'Concluir Edição' : 'Editar Movimentações'}
            </Button>

            {!isEditMode && (
              <>
                {canReset && (
                  <Button
                    variant="outline"
                    onClick={onResetInitial}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Reset Saldo Inicial
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => onOpenAction('COMPRA')}
                >
                  <PackagePlus className="mr-2 h-4 w-4" /> Compras
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenAction('CARRO_PARA_ESTOQUE')}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Devoluções
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenAction('PERDA')}
                >
                  <PackageMinus className="mr-2 h-4 w-4" /> Perdas
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenAction('ESTOQUE_PARA_CARRO')}
                >
                  <Truck className="mr-2 h-4 w-4" /> Reposições
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenAction('CONTAGEM')}
                >
                  <CheckSquare className="mr-2 h-4 w-4" /> Contagem
                </Button>
              </>
            )}

            <div className="flex-1" />
            {!isEditMode && canFinalizeInventory && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onFinalize}
                      disabled={!allItemsCounted}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <StopCircle className="mr-2 h-4 w-4" /> Finalizar e Novo
                      Ciclo
                    </Button>
                  </span>
                </TooltipTrigger>
                {!allItemsCounted && (
                  <TooltipContent>
                    <p>
                      Todos os produtos obrigatórios devem ter contagem
                      registrada.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </>
        )}

        {selectedSession && !canEdit && (
          <div className="text-sm text-muted-foreground font-medium italic flex-1 text-center">
            Visualizando histórico de inventário fechado (Somente Leitura)
          </div>
        )}
      </CardContent>
    </Card>
  )
}
