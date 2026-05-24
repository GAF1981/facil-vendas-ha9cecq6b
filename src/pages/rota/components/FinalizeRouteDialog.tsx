import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { rotaService } from '@/services/rotaService'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Rota } from '@/types/rota'

export function FinalizeRouteDialog({
  activeRota,
  onSuccess,
}: {
  activeRota: Rota
  onSuccess: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleFinalize = async () => {
    setLoading(true)
    try {
      await rotaService.finishAndStartNewRoute(activeRota.id)
      toast({
        title: 'Sucesso',
        description: 'Rota finalizada e novo ciclo iniciado com sucesso.',
      })
      setIsOpen(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar rota',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Finalizar Ciclo Atual
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Finalizar Rota e Iniciar Novo Ciclo
          </DialogTitle>
          <DialogDescription className="pt-4 text-base leading-relaxed">
            Você está prestes a fechar a rota atual (
            <strong>#{activeRota.id}</strong>) e abrir um novo ciclo
            automaticamente.
            <br />
            <br />
            - Clientes não atendidos serão transferidos.
            <br />
            - O vendedor "Próximo" (se mapeado no CSV ou sistema) será
            preservado de forma segura na nova rota.
            <br />
            <br />
            Esta operação é atômica e as alterações não podem ser desfeitas.
            Deseja confirmar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleFinalize}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sim, Finalizar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
