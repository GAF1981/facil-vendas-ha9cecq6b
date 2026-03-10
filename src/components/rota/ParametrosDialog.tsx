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
import { RotaRow } from '@/types/rota'
import { parseCurrency } from '@/lib/formatters'
import { subDays, format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { rotaService } from '@/services/rotaService'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Settings2 } from 'lucide-react'

interface ParametrosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: RotaRow[]
  activeRotaId?: number
  onComplete: () => void
}

export function ParametrosDialog({
  open,
  onOpenChange,
  rows,
  activeRotaId,
  onComplete,
}: ParametrosDialogProps) {
  const [projecao, setProjecao] = useState('350,00')
  const [data, setData] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  )
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleAplicar = async () => {
    if (!activeRotaId) return
    setLoading(true)
    try {
      const pThresh = parseCurrency(projecao)
      const dThresh = new Date(data)

      const targets = rows.filter((r) => {
        const p = r.projecao || 0
        const d = r.data_acerto ? new Date(r.data_acerto) : new Date(0)
        return p >= pThresh && d <= dThresh
      })

      if (targets.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhum cliente atende aos parâmetros informados.',
        })
        setLoading(false)
        return
      }

      const { data: admins } = await supabase
        .from('FUNCIONARIOS')
        .select('id, setor')
        .eq('situacao', 'ATIVO')
      let adminId = null
      if (admins) {
        const admin = admins.find((a) =>
          Array.isArray(a.setor)
            ? a.setor.includes('Administrador')
            : a.setor === 'Administrador',
        )
        adminId = admin?.id || admins[0]?.id || null
      }

      const lastSellerMap = new Map<number, number>()
      const clientIds = targets.map((t) => t.client.CODIGO)
      const chunkSize = 50

      for (let i = 0; i < clientIds.length; i += chunkSize) {
        const chunk = clientIds.slice(i, i + chunkSize)
        const { data: history } = await supabase
          .from('BANCO_DE_DADOS')
          .select(
            '"CÓDIGO DO CLIENTE", "CODIGO FUNCIONARIO", "DATA E HORA", "DATA DO ACERTO"',
          )
          .in('CÓDIGO DO CLIENTE', chunk)
          .not('CODIGO FUNCIONARIO', 'is', null)
          .order('DATA DO ACERTO', { ascending: false })
          .limit(2000)

        if (history) {
          history.sort((a, b) => {
            const d1 = new Date(
              a['DATA E HORA'] || a['DATA DO ACERTO'] || 0,
            ).getTime()
            const d2 = new Date(
              b['DATA E HORA'] || b['DATA DO ACERTO'] || 0,
            ).getTime()
            return d2 - d1
          })

          history.forEach((h) => {
            const cid = h['CÓDIGO DO CLIENTE']
            if (cid && !lastSellerMap.has(cid) && h['CODIGO FUNCIONARIO']) {
              lastSellerMap.set(cid, h['CODIGO FUNCIONARIO'])
            }
          })
        }
      }

      const assignments = targets.map((t) => {
        const cid = t.client.CODIGO
        const sellerId = lastSellerMap.get(cid) || adminId
        return { clientId: cid, sellerId }
      })

      await rotaService.bulkUpdateNextSellersVariable(activeRotaId, assignments)

      toast({
        title: 'Sucesso',
        description: `${assignments.length} clientes atualizados com base nos parâmetros.`,
        className: 'bg-green-600 text-white',
      })
      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao aplicar parâmetros.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Parâmetros de Rota
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Projeção Mínima (R$)</Label>
            <Input
              value={projecao}
              onChange={(e) => setProjecao(e.target.value)}
              placeholder="350,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Corte (Último Acerto)</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Clientes com projeção maior ou igual ao valor e último acerto
            anterior ou igual à data selecionada terão o{' '}
            <strong>próximo vendedor</strong> atribuído automaticamente com base
            no histórico. Se não houver histórico, será atribuído ao
            administrador.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleAplicar} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar Parâmetros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
