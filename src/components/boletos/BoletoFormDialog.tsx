import { useEffect, useState } from 'react'
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
import { Boleto, BoletoInsert, BoletoUpdate } from '@/types/boleto'
import { boletoService } from '@/services/boletoService'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface BoletoFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: Boleto | null
}

export function BoletoFormDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: BoletoFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState<{
    cliente_nome: string
    cliente_codigo: string
    status: string
    vencimento: string
    valor: string
    pedido_id: string
  }>({
    cliente_nome: '',
    cliente_codigo: '',
    status: 'A Receber',
    vencimento: '',
    valor: '',
    pedido_id: '',
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          cliente_nome: initialData.cliente_nome,
          cliente_codigo: initialData.cliente_codigo.toString(),
          status: initialData.status,
          vencimento: initialData.vencimento,
          valor: formatCurrency(initialData.valor),
          pedido_id: initialData.pedido_id
            ? initialData.pedido_id.toString()
            : '',
        })
      } else {
        setFormData({
          cliente_nome: '',
          cliente_codigo: '',
          status: 'A Receber',
          vencimento: '',
          valor: '',
          pedido_id: '',
        })
      }
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.cliente_nome ||
      !formData.cliente_codigo ||
      !formData.vencimento ||
      !formData.valor
    ) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload: BoletoInsert = {
        cliente_nome: formData.cliente_nome,
        cliente_codigo: parseInt(formData.cliente_codigo),
        status: formData.status,
        vencimento: formData.vencimento,
        valor: parseCurrency(formData.valor),
        pedido_id: formData.pedido_id ? parseInt(formData.pedido_id) : null,
      }

      if (initialData) {
        await boletoService.update(initialData.id, payload)
        toast({ title: 'Sucesso', description: 'Boleto atualizado.' })
      } else {
        await boletoService.create(payload)
        toast({ title: 'Sucesso', description: 'Boleto criado.' })
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar boleto.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Boleto' : 'Novo Boleto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Código do Cliente *</Label>
            <Input
              type="number"
              value={formData.cliente_codigo}
              onChange={(e) =>
                setFormData({ ...formData, cliente_codigo: e.target.value })
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Nome do Cliente *</Label>
            <Input
              value={formData.cliente_nome}
              onChange={(e) =>
                setFormData({ ...formData, cliente_nome: e.target.value })
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A Receber">A Receber</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={formData.vencimento}
                onChange={(e) =>
                  setFormData({ ...formData, vencimento: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Valor (R$) *</Label>
              <Input
                placeholder="0,00"
                value={formData.valor}
                onChange={(e) =>
                  setFormData({ ...formData, valor: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Número do Pedido (Opcional)</Label>
            <Input
              type="number"
              value={formData.pedido_id}
              onChange={(e) =>
                setFormData({ ...formData, pedido_id: e.target.value })
              }
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
