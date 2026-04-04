import { useState } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2, Plus } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function NovaDividaModal({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    cliente_id: '',
    valor_parcela: '',
    data_acerto: new Date().toISOString().substring(0, 10),
    vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10),
    forma_pagamento: 'Dinheiro',
    motivo: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cliente_id = parseInt(formData.cliente_id)
      if (isNaN(cliente_id)) throw new Error('Código do cliente inválido')

      const valor_parcela = parseFloat(formData.valor_parcela.replace(',', '.'))
      if (isNaN(valor_parcela)) throw new Error('Valor da parcela inválido')

      const { data: maxSeq } = await supabase
        .from('dividas_manuais')
        .select('cobranca_seq')
        .eq('cliente_id', cliente_id)
        .order('cobranca_seq', { ascending: false })
        .limit(1)
        .single()

      const nextSeq = (maxSeq?.cobranca_seq || 0) + 1

      const { error } = await supabase.from('dividas_manuais').insert({
        cliente_id,
        valor_parcela,
        data_acerto: formData.data_acerto,
        vencimento: formData.vencimento,
        forma_pagamento: formData.forma_pagamento,
        motivo: formData.motivo,
        cobranca_seq: nextSeq,
        valor_pago: 0,
      })

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Dívida registrada com sucesso.' })
      onSuccess()
      onOpenChange(false)
      setFormData({
        ...formData,
        cliente_id: '',
        valor_parcela: '',
        motivo: '',
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Nova Dívida Manual
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código Cliente</Label>
              <Input
                required
                value={formData.cliente_id}
                onChange={(e) =>
                  setFormData({ ...formData, cliente_id: e.target.value })
                }
                placeholder="Ex: 123"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Parcela (R$)</Label>
              <Input
                required
                value={formData.valor_parcela}
                onChange={(e) =>
                  setFormData({ ...formData, valor_parcela: e.target.value })
                }
                placeholder="Ex: 150.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Acerto</Label>
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
              <Label>Vencimento</Label>
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
              <Label>Forma de Pagamento</Label>
              <Input
                required
                value={formData.forma_pagamento}
                onChange={(e) =>
                  setFormData({ ...formData, forma_pagamento: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo (Opcional)</Label>
              <Input
                value={formData.motivo}
                onChange={(e) =>
                  setFormData({ ...formData, motivo: e.target.value })
                }
                placeholder="Descreva a dívida"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
              Salvar Dívida
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
