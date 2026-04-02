import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DividaManual, DividaManualAcao } from '@/types/divida-manual'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { safeFormatDate } from '@/lib/formatters'
import { Trash2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  debt: DividaManual
}

export function DividaManualAcoesSheet({ open, onOpenChange, debt }: Props) {
  const [acoes, setAcoes] = useState<DividaManualAcao[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  const [form, setForm] = useState({
    acao: '',
    nova_data_combinada: '',
    motivo: '',
  })

  const fetchAcoes = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('dividas_manuais_acoes')
      .select('*, FUNCIONARIOS(nome_completo)')
      .eq('divida_id', debt.id)
      .order('data_acao', { ascending: false })
    if (data) setAcoes(data as any)
    setLoading(false)
  }

  useEffect(() => {
    if (open) fetchAcoes()
  }, [open, debt.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.acao.trim()) return

    try {
      const { error } = await supabase.from('dividas_manuais_acoes').insert([
        {
          divida_id: debt.id,
          funcionario_id: employee?.id,
          acao: form.acao,
          nova_data_combinada: form.nova_data_combinada || null,
          motivo: form.motivo || null,
        },
      ])

      if (error) throw error

      toast({ title: 'Ação Registrada' })
      setForm({ acao: '', nova_data_combinada: '', motivo: '' })
      fetchAcoes()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao registrar ação',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta ação?')) return
    const { error } = await supabase
      .from('dividas_manuais_acoes')
      .delete()
      .eq('id', id)
    if (!error) {
      toast({ title: 'Ação excluída' })
      fetchAcoes()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Ações de Cobrança - C{debt.cobranca_seq}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {debt.CLIENTES?.['NOME CLIENTE']}
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-4 border rounded-md bg-muted/20 mb-6"
        >
          <h3 className="font-semibold text-sm">Registrar Nova Ação</h3>
          <div className="space-y-2">
            <Label>Descrição da Ação *</Label>
            <Textarea
              required
              value={form.acao}
              onChange={(e) => setForm({ ...form, acao: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nova Data Combinada</Label>
              <Input
                type="date"
                value={form.nova_data_combinada}
                onChange={(e) =>
                  setForm({ ...form, nova_data_combinada: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="w-full">
            Registrar Ação
          </Button>
        </form>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Histórico de Ações</h3>
          {loading ? (
            <p className="text-sm">Carregando...</p>
          ) : acoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ação registrada.
            </p>
          ) : (
            acoes.map((a) => (
              <div key={a.id} className="p-3 border rounded-md relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 h-6 w-6"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="flex justify-between text-xs text-muted-foreground mb-2 pr-6">
                  <span>{a.FUNCIONARIOS?.nome_completo || 'Sistema'}</span>
                  <span>{new Date(a.data_acao).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm font-medium mb-2">{a.acao}</p>
                {(a.nova_data_combinada || a.motivo) && (
                  <div className="flex gap-4 text-xs bg-muted/30 p-2 rounded">
                    {a.nova_data_combinada && (
                      <span>
                        <strong>Agendado:</strong>{' '}
                        {safeFormatDate(a.nova_data_combinada)}
                      </span>
                    )}
                    {a.motivo && (
                      <span>
                        <strong>Motivo:</strong> {a.motivo}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
