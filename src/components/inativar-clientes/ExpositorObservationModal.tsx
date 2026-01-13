import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { InativarCliente } from '@/types/inativar_clientes'

interface ExpositorObservationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (id: number, observation: string) => Promise<void>
  client: InativarCliente | null
}

export function ExpositorObservationModal({
  isOpen,
  onClose,
  onSave,
  client,
}: ExpositorObservationModalProps) {
  const [observation, setObservation] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen && client) {
      setObservation(client.observacoes_expositor || '')
    } else {
      setObservation('')
    }
  }, [isOpen, client])

  const handleSave = async () => {
    if (!client) return
    if (!observation.trim()) return

    setIsSaving(true)
    try {
      await onSave(client.id, observation)
      onClose()
    } catch (error) {
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observações: Retirada de Expositor</DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo ou detalhes da retirada do expositor
            para o cliente <strong>{client?.cliente_nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="observation">Observações</Label>
            <Textarea
              id="observation"
              placeholder="Descreva as condições do expositor, quem retirou, data, etc."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!observation.trim() || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Confirmar e Marcar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
