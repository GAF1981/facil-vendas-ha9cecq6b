import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare, Plus, Clock } from 'lucide-react'
import { pendenciasService } from '@/services/pendenciasService'
import { Pendencia, PendenciaAnotacao } from '@/types/pendencia'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { formatBrazilDate, formatDateTimeBR } from '@/lib/dateUtils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface AnotacoesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendencia: Pendencia | null
}

export function AnotacoesDialog({
  open,
  onOpenChange,
  pendencia,
}: AnotacoesDialogProps) {
  const [anotacoes, setAnotacoes] = useState<PendenciaAnotacao[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [novaAnotacao, setNovaAnotacao] = useState('')

  const { employee } = useUserStore()
  const { toast } = useToast()

  useEffect(() => {
    if (open && pendencia) {
      loadAnotacoes()
    } else {
      setAnotacoes([])
      setNovaAnotacao('')
    }
  }, [open, pendencia])

  const loadAnotacoes = async () => {
    if (!pendencia) return
    setLoading(true)
    try {
      const data = await pendenciasService.getAnotacoes(pendencia.id)
      setAnotacoes(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as anotações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!novaAnotacao.trim() || !pendencia || !employee) return

    setSubmitting(true)
    try {
      await pendenciasService.addAnotacao(
        pendencia.id,
        employee.id,
        novaAnotacao,
      )
      setNovaAnotacao('')
      await loadAnotacoes()
      toast({
        title: 'Sucesso',
        description: 'Anotação adicionada.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar anotação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!pendencia) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <MessageSquare className="h-5 w-5" />
            Anotações da Pendência
          </DialogTitle>
          <DialogDescription>
            Cliente: <strong>{pendencia.CLIENTES?.['NOME CLIENTE']}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 p-3 rounded-md text-sm border">
          <p className="font-semibold text-xs text-muted-foreground uppercase mb-1">
            Problema Original (Data:{' '}
            {formatBrazilDate(pendencia.created_at || new Date().toISOString())}
            )
          </p>
          <p>{pendencia.descricao_pendencia}</p>
        </div>

        <div className="space-y-4 my-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Histórico de Anotações
          </h4>

          <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/10">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : anotacoes.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma anotação registrada ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {anotacoes.map((anot) => (
                  <div key={anot.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {anot.funcionario?.nome_completo
                          ?.substring(0, 2)
                          .toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-background p-3 rounded-lg border shadow-sm">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold">
                          {anot.funcionario?.nome_completo || 'Sistema'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTimeBR(anot.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {anot.texto}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="space-y-2 pt-2">
            <Textarea
              placeholder="Digite uma nova anotação aqui..."
              className="resize-none"
              value={novaAnotacao}
              onChange={(e) => setNovaAnotacao(e.target.value)}
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || !novaAnotacao.trim()}
                size="sm"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar Anotação
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
