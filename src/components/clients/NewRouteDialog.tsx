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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus } from 'lucide-react'

interface NewRouteDialogProps {
  onSuccess: () => void
}

export function NewRouteDialog({ onSuccess }: NewRouteDialogProps) {
  const [open, setOpen] = useState(false)
  const [routeName, setRouteName] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!routeName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da rota não pode ser vazio.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await clientsService.createRoute(routeName.trim())
      toast({
        title: 'Sucesso',
        description: 'Nova rota cadastrada com sucesso.',
      })
      setRouteName('')
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao cadastrar rota. Verifique se já existe.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-2">
          <Plus className="mr-2 h-4 w-4" />
          Cadastrar e Salvar Rota
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Rota</DialogTitle>
          <DialogDescription>
            Insira o nome da nova rota para adicionar à lista centralizada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nome
            </Label>
            <Input
              id="name"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              className="col-span-3"
              placeholder="Nome da rota"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
