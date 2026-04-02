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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { DividaManual } from '@/types/divida-manual'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt?: DividaManual | null
}

export function DividaManualFormDialog({ open, onOpenChange, debt }: Props) {
  const { addDivida, updateDivida } = useDividasManuaisStore()
  const { employee } = useUserStore()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    cliente_id: '',
    data_acerto: new Date().toISOString().split('T')[0],
    vencimento: '',
    forma_pagamento: 'DINHEIRO',
    valor_parcela: '',
    valor_pago: '0',
    forma_cobranca: 'VAZIO',
    data_combinada: '',
    motivo: 'VAZIO',
  })

  useEffect(() => {
    if (debt && open) {
      setFormData({
        cliente_id: debt.cliente_id.toString(),
        data_acerto: debt.data_acerto,
        vencimento: debt.vencimento,
        forma_pagamento: debt.forma_pagamento,
        valor_parcela: debt.valor_parcela.toString(),
        valor_pago: debt.valor_pago.toString(),
        forma_cobranca: debt.forma_cobranca || 'VAZIO',
        data_combinada: debt.data_combinada || '',
        motivo: debt.motivo || 'VAZIO',
      })
    } else if (open) {
      setFormData({
        cliente_id: '',
        data_acerto: new Date().toISOString().split('T')[0],
        vencimento: '',
        forma_pagamento: 'DINHEIRO',
        valor_parcela: '',
        valor_pago: '0',
        forma_cobranca: 'VAZIO',
        data_combinada: '',
        motivo: 'VAZIO',
      })
    }
  }, [debt, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        cliente_id: parseInt(formData.cliente_id),
        data_acerto: formData.data_acerto,
        vencimento: formData.vencimento,
        forma_pagamento: formData.forma_pagamento,
        valor_parcela: parseFloat(formData.valor_parcela),
        valor_pago: parseFloat(formData.valor_pago) || 0,
        forma_cobranca:
          formData.forma_cobranca === 'VAZIO' ? null : formData.forma_cobranca,
        data_combinada: formData.data_combinada || null,
        motivo: formData.motivo === 'VAZIO' ? null : formData.motivo,
        funcionario_id: employee?.id,
      }

      if (debt) {
        await updateDivida(debt.id, payload)
        toast({
          title: 'Atualizada',
          description: 'Dívida atualizada com sucesso.',
        })
      } else {
        await addDivida(payload)
        toast({
          title: 'Criada',
          description: 'Dívida registrada com sucesso.',
        })
      }
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {debt ? 'Editar Dívida Manual' : 'Nova Dívida Manual'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cód. Cliente *</Label>
              <Input
                required
                type="number"
                value={formData.cliente_id}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Acerto *</Label>
              <Input
                required
                type="date"
                value={formData.data_acerto}
                onChange={(e) =>
                  setFormData({ ...formData, data_acerto: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) =>
                  setFormData({ ...formData, forma_pagamento: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">BOLETO</SelectItem>
                  <SelectItem value="CARTÃO">CARTÃO</SelectItem>
                  <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                  <SelectItem value="PRAZO">PRAZO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input
                required
                type="date"
                value={formData.vencimento}
                onChange={(e) =>
                  setFormData({ ...formData, vencimento: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valor da Dívida *</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor_parcela}
                onChange={(e) =>
                  setFormData({ ...formData, valor_parcela: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Pago</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_pago}
                onChange={(e) =>
                  setFormData({ ...formData, valor_pago: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Cobrança</Label>
              <Select
                value={formData.forma_cobranca}
                onValueChange={(v) =>
                  setFormData({ ...formData, forma_cobranca: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAZIO">VAZIO</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="MOTOQUEIRO">MOTOQUEIRO</SelectItem>
                  <SelectItem value="BOLETO">BOLETO</SelectItem>
                  <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                  <SelectItem value="MENSAGEM">MENSAGEM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Combinada</Label>
              <Input
                type="date"
                value={formData.data_combinada}
                onChange={(e) =>
                  setFormData({ ...formData, data_combinada: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Motivo</Label>
              <Select
                value={formData.motivo}
                onValueChange={(v) => setFormData({ ...formData, motivo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VAZIO">VAZIO</SelectItem>
                  <SelectItem value="Autorizou ida">Autorizou ida</SelectItem>
                  <SelectItem value="Avisou ida">Avisou ida</SelectItem>
                  <SelectItem value="Combinou motoqueiro">
                    Combinou motoqueiro
                  </SelectItem>
                  <SelectItem value="Sem Contato">Sem Contato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
