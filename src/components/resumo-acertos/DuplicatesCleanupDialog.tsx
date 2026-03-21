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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertTriangle, CheckCircle, CopyX } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DuplicatesCleanupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  routeId: string
  onSuccess: () => void
}

interface DuplicateItemDetailed {
  id_to_delete: string
  pedido_id: number
  cliente_nome: string
  tipo_duplicidade: string
  detalhes: string
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
  const [duplicates, setDuplicates] = useState<DuplicateItemDetailed[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (open && routeId) {
      checkDuplicates()
    } else {
      setDuplicates([])
      setSelectedIds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routeId])

  const checkDuplicates = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc(
        'get_route_duplicates_detailed',
        {
          p_rota_id: parseInt(routeId),
        },
      )
      if (error) throw error
      const fetchedDuplicates = data || []
      setDuplicates(fetchedDuplicates)
      // Automatically select all by default for convenience
      setSelectedIds(fetchedDuplicates.map((d: any) => d.id_to_delete))
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
    if (!routeId || selectedIds.length === 0) return
    setCleaning(true)
    try {
      const { data, error } = await supabase.rpc(
        'cleanup_selected_duplicates',
        {
          p_ids: selectedIds,
        },
      )
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

  const handleSelectAll = () => {
    if (selectedIds.length === duplicates.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(duplicates.map((d) => d.id_to_delete))
    }
  }

  const handleCheck = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CopyX className="h-5 w-5 text-amber-600" />
            Verificação de Duplicados
          </DialogTitle>
          <DialogDescription>Rota selecionada: #{routeId}</DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-hidden min-h-[200px] flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground my-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Analisando rota atual...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-green-600 my-8">
              <CheckCircle className="h-8 w-8" />
              <p className="font-medium text-center">
                Nenhuma duplicidade encontrada na rota {routeId}.<br />
                Os dados estão organizados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  Foram encontrados {duplicates.length} registros que parecem
                  estar duplicados (mesmo valor e mesma data de
                  vencimento/detalhe). Selecione abaixo quais cópias você deseja
                  excluir (o pedido original sempre será mantido intacto).
                </p>
              </div>

              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-medium">
                  {selectedIds.length} de {duplicates.length} selecionados
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs h-8"
                >
                  {selectedIds.length === duplicates.length
                    ? 'Desmarcar Todos'
                    : 'Selecionar Todos'}
                </Button>
              </div>

              <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/20">
                <div className="space-y-4">
                  {duplicates.map((dup) => (
                    <div
                      key={dup.id_to_delete}
                      className={cn(
                        'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                        selectedIds.includes(dup.id_to_delete)
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-background border-border',
                      )}
                    >
                      <Checkbox
                        id={dup.id_to_delete}
                        checked={selectedIds.includes(dup.id_to_delete)}
                        onCheckedChange={(checked) =>
                          handleCheck(dup.id_to_delete, checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <Label
                          htmlFor={dup.id_to_delete}
                          className="font-semibold text-sm cursor-pointer flex justify-between w-full"
                        >
                          <span>
                            Pedido #{dup.pedido_id} - {dup.cliente_nome}
                          </span>
                          <span className="text-amber-600 font-normal">
                            {dup.tipo_duplicidade}
                          </span>
                        </Label>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {dup.detalhes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
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
              disabled={cleaning || loading || selectedIds.length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {cleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Marcados
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
