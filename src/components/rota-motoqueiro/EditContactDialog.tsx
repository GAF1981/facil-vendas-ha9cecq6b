import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'

interface EditContactDialogProps {
  open: boolean
  onClose: () => void
  clientId: number
  clientName: string
  initialValue: string
  type: 'phone' | 'email'
  onSuccess: () => void
}

export function EditContactDialog({
  open,
  onClose,
  clientId,
  clientName,
  initialValue,
  type,
  onSuccess,
}: EditContactDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setValue(initialValue || '')
    }
  }, [open, initialValue])

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload =
        type === 'phone'
          ? { telefone_cobranca: value }
          : { email_cobranca: value }

      await clientsService.update(clientId, payload)
      toast({
        title: 'Contato Atualizado',
        description: `${type === 'phone' ? 'Telefone' : 'E-mail'} de cobrança salvo com sucesso.`,
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o contato.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Editar {type === 'phone' ? 'Telefone' : 'E-mail'} de Cobrança
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Atualizando contato para: <strong>{clientName}</strong>
          </p>
          <div className="space-y-2">
            <Label>{type === 'phone' ? 'Novo Telefone' : 'Novo E-mail'}</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                type === 'phone' ? '(00) 00000-0000' : 'exemplo@email.com'
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
