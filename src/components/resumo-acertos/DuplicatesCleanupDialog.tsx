import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, CheckCircle, CopyX } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DuplicatesCleanupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  routeId: string
  onSuccess: () => void
}

interface DuplicateItem {
  pedido_id: number
  cliente_nome: string
  tipo_duplicidade: string
  quantidade: number
}

export function DuplicatesCleanupDialog({
  open,
  onOpenChange,
  routeId,
  onSuccess,
}: DuplicatesCleanupDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([])

  useEffect(() => {
    if (open && routeId) {
      checkDuplicates()
    } else {
      setDuplicates([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routeId])

  const checkDuplicates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_route_duplicates', {
        p_rota_id: parseInt(routeId),
      })
      if (error) throw error
      setDuplicates(data || [])
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao verificar duplicidades',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!routeId) return
    setCleaning(true)
    try {
      const { data, error } = await supabase.rpc('cleanup_route_duplicates', {
        p_rota_id: parseInt(routeId),
      })
      if (error) throw error

      const res = data as { items_removed: number; payments_removed: number }

      toast({
        title: 'Limpeza concluída',
        description: `${res.items_removed} itens e ${res.payments_removed} pagamentos removidos.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao limpar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setCleaning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CopyX className="h-5 w-5 text-amber-600" />
            Verificação de Duplicados
          </DialogTitle>
          <DialogDescription>Rota selecionada: #{routeId}</DialogDescription>
        </DialogHeader>

        <div className="py-4 min-h-[100px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Analisando rota atual...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <p className="font-medium text-center">
                Nenhuma duplicidade encontrada na rota {routeId}.<br />
                Os dados estão organizados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Foram encontrados{' '}
                  {duplicates.reduce((acc, d) => acc + d.quantidade, 0)}{' '}
                  registros duplicados. Deseja realizar a limpeza agora? As
                  informações originais serão mantidas.
                </p>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2 text-sm border rounded-md p-2 bg-muted/30">
                {duplicates.map((dup, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between border-b pb-1 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="font-mono font-semibold">
                        #{dup.pedido_id}
                      </span>
                      <span
                        className="ml-2 truncate max-w-[150px] inline-block align-bottom"
                        title={dup.cliente_nome}
                      >
                        {dup.cliente_nome}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground mr-2">
                        {dup.tipo_duplicidade}
                      </span>
                      <span className="font-bold text-amber-600">
                        +{dup.quantidade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || cleaning}
          >
            {duplicates.length > 0 ? 'Cancelar' : 'Fechar'}
          </Button>
          {duplicates.length > 0 && (
            <Button
              variant="default"
              onClick={handleCleanup}
              disabled={cleaning || loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Limpar Duplicados
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
