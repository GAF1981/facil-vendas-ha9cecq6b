import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Upload, ArrowRightLeft } from 'lucide-react'
import { rotaService } from '@/services/rotaService'
import { toast } from 'sonner'
import { RotaImportDialog } from './RotaImportDialog'
import { useState } from 'react'

interface RotaHeaderProps {
  activeRotaId: number | null
  onReload: () => void
}

export function RotaHeader({ activeRotaId, onReload }: RotaHeaderProps) {
  const [importOpen, setImportOpen] = useState(false)

  const handleStartRoute = async () => {
    if (activeRotaId) {
      toast.error('Já existe uma rota ativa.')
      return
    }
    try {
      await rotaService.startRota()
      toast.success('Nova rota iniciada')
      onReload()
    } catch (e) {
      toast.error('Erro ao iniciar rota')
    }
  }

  const handleFinishRoute = async () => {
    if (!activeRotaId) return
    if (
      !confirm('Deseja realmente finalizar a rota atual e iniciar a próxima?')
    )
      return
    try {
      await rotaService.finishAndStartNewRoute(activeRotaId)
      toast.success('Rota finalizada e nova rota iniciada!')
      onReload()
    } catch (e) {
      toast.error('Erro ao finalizar rota')
    }
  }

  const handleTransferNextSellers = async () => {
    if (!activeRotaId) return
    if (
      !confirm(
        'Deseja aplicar todos os "Próximos Vendedores" para "Vendedores" nesta rota?',
      )
    )
      return
    try {
      await rotaService.bulkTransferNextSellers(activeRotaId)
      toast.success('Transferência de vendedores concluída!')
      onReload()
    } catch (e) {
      toast.error('Erro ao transferir vendedores')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
          Gestão de Rotas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeRotaId ? (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Rota Ativa: #{activeRotaId}
            </span>
          ) : (
            'Nenhuma rota ativa no momento'
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={onReload}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>

        {activeRotaId && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTransferNextSellers}
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir Próximos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar CSV
            </Button>
          </>
        )}

        {!activeRotaId ? (
          <Button onClick={handleStartRoute} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Iniciar Nova Rota
          </Button>
        ) : (
          <Button onClick={handleFinishRoute} size="sm" variant="default">
            Finalizar Rota
          </Button>
        )}
      </div>

      {activeRotaId && (
        <RotaImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          rotaId={activeRotaId}
          onSuccess={onReload}
        />
      )}
    </div>
  )
}
