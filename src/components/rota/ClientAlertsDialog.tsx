import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Bell, AlertCircle, Info, StickyNote, ExternalLink } from 'lucide-react'
import { RotaRow } from '@/types/rota'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface ClientAlertsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: RotaRow
  onSaveTask: (clientId: number, task: string) => Promise<void>
}

export function ClientAlertsDialog({
  open,
  onOpenChange,
  row,
  onSaveTask,
}: ClientAlertsDialogProps) {
  const [task, setTask] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setTask(row.tarefas || '')
    }
  }, [open, row.tarefas])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveTask(row.client.CODIGO, task)
      toast({
        title: 'Tarefa salva',
        description: 'A anotação foi salva com sucesso.',
        className: 'bg-green-600 text-white',
      })
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a tarefa.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGoToPendencies = () => {
    // Navigate with query param to filter for this client as required
    navigate(`/pendencias?cliente_id=${row.client.CODIGO}`)
    onOpenChange(false)
  }

  const pendencias = row.pendency_details || []
  const observacaoFixa = row.client['OBSERVAÇÃO FIXA']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-500" />
            Alertas: {row.client['NOME CLIENTE']}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Pendências Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Pendências ({pendencias.length})
              </h4>
              {/* Added Button to Navigate to Pendencies Page */}
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-50"
                onClick={handleGoToPendencies}
              >
                <ExternalLink className="h-3 w-3" />
                Ver Pendências
              </Button>
            </div>
            {pendencias.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {pendencias.map((p, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-6">
                Nenhuma pendência registrada.
              </p>
            )}
          </div>

          {/* Informação Fixa Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-600">
              <Info className="h-4 w-4" />
              Informação Fixa
            </h4>
            {observacaoFixa ? (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm text-yellow-900">
                {observacaoFixa}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic pl-6">
                Sem observação fixa.
              </p>
            )}
          </div>

          {/* Tarefas Section */}
          <div className="space-y-2">
            <Label
              htmlFor="tarefas"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <StickyNote className="h-4 w-4" />
              Tarefas
            </Label>
            <Textarea
              id="tarefas"
              placeholder="Digite anotações temporárias para esta rota..."
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
