import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { safeFormatDate } from '@/lib/formatters'
import { Loader2, Edit2, Trash2, Check, X, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onRefresh?: () => void
}

export function InventoryGlobalHistoryDialog({
  open,
  onOpenChange,
  sessionId,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [movements, setMovements] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    if (open && sessionId) {
      loadMovements()
    }
  }, [open, sessionId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const { data: products } = await supabase
        .from('PRODUTOS')
        .select('ID, PRODUTO')
      const productMap = new Map(products?.map((p) => [p.ID, p.PRODUTO]) || [])

      const fetchTable = async (
        table: string,
        type: string,
        qtyField: string,
      ) => {
        const { data } = await supabase
          .from(table)
          .select('*')
          .eq('id_inventario', sessionId)

        let results = (data || []).map((d: any) => ({
          uniqueId: `${type}_${d.id}`,
          id: d.id,
          movement_type: type,
          data_horario: d.created_at,
          quantidade: d[qtyField] || d.quantidade || 0,
          produto_id: d.produto_id,
          produto_nome: productMap.get(d.produto_id) || 'Desconhecido',
          id_estoque_carro: d.id_estoque_carro || '-',
          funcionario_id: d.funcionario_id,
        }))

        // Aprimora a busca do id_estoque_carro verificando na tabela REPOSIÇÃO E DEVOLUÇÃO
        if (type === 'devolucao_carro' || type === 'reposicao_carro') {
          const tType = type === 'devolucao_carro' ? 'DEVOLUCAO' : 'REPOSICAO'
          const { data: repData } = await supabase
            .from('REPOSIÇÃO E DEVOLUÇÃO')
            .select('produto_id, funcionario_id, id_estoque_carro, created_at')
            .eq('session_id', sessionId)
            .eq('TIPO', tType)

          if (repData) {
            results = results.map((r: any) => {
              const match = repData.find(
                (rep) =>
                  rep.produto_id === r.produto_id &&
                  rep.funcionario_id === r.funcionario_id &&
                  Math.abs(
                    new Date(rep.created_at).getTime() -
                      new Date(r.data_horario).getTime(),
                  ) < 10000,
              )
              if (match && match.id_estoque_carro) {
                r.id_estoque_carro = match.id_estoque_carro
              }
              return r
            })
          }
        }
        return results
      }

      const compras = await fetchTable(
        'ESTOQUE GERAL COMPRAS',
        'compra',
        'compras_quantidade',
      )
      const devolucoes = await fetchTable(
        'ESTOQUE GERAL CARRO PARA ESTOQUE',
        'devolucao_carro',
        'quantidade',
      )
      const reposicoes = await fetchTable(
        'ESTOQUE GERAL ESTOQUE PARA CARRO',
        'reposicao_carro',
        'quantidade',
      )
      const perdas = await fetchTable(
        'ESTOQUE GERAL SAÍDAS PERDAS',
        'perda',
        'quantidade',
      )
      const contagens = await fetchTable(
        'ESTOQUE GERAL CONTAGEM',
        'contagem',
        'quantidade',
      )

      const all = [
        ...compras,
        ...devolucoes,
        ...reposicoes,
        ...perdas,
        ...contagens,
      ]
      all.sort(
        (a, b) =>
          new Date(b.data_horario).getTime() -
          new Date(a.data_horario).getTime(),
      )

      setMovements(all)
    } catch (error) {
      console.error('Failed to load global movements', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar lançamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditStart = (mov: any) => {
    setEditingId(mov.uniqueId)
    setEditValue(mov.quantidade?.toString() || '0')
  }

  const handleEditSave = async (mov: any) => {
    try {
      const newQtd = parseInt(editValue.replace(/\D/g, ''), 10) || 0
      if (newQtd < 0) return
      await inventoryGeneralService.updateMovementQty(
        mov.id,
        mov.movement_type,
        newQtd,
        sessionId,
        mov.produto_id,
      )
      toast({ title: 'Movimentação atualizada' })
      setEditingId(null)
      loadMovements()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (mov: any) => {
    if (!confirm('Tem certeza que deseja remover esta movimentação?')) return
    try {
      await inventoryGeneralService.deleteMovementRecord(
        mov.id,
        mov.movement_type,
        sessionId,
        mov.produto_id,
      )
      toast({ title: 'Movimentação removida' })
      loadMovements()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'compra':
        return { label: 'Compra', color: 'text-blue-600' }
      case 'devolucao_carro':
        return { label: 'Devolução (Carro)', color: 'text-green-600' }
      case 'reposicao_carro':
        return { label: 'Reposição (Carro)', color: 'text-orange-600' }
      case 'perda':
        return { label: 'Perda/Quebra', color: 'text-red-600' }
      case 'contagem':
        return { label: 'Contagem', color: 'text-purple-600 font-semibold' }
      default:
        return { label: type, color: '' }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Últimos Lançamentos (Inventário)
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>ID Estoque Carro</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov) => {
                  const { label, color } = getTypeLabel(mov.movement_type)
                  return (
                    <TableRow key={mov.uniqueId}>
                      <TableCell>
                        {safeFormatDate(mov.data_horario, 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className={color}>{label}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {mov.id_estoque_carro}
                      </TableCell>
                      <TableCell>{mov.produto_nome}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {editingId === mov.uniqueId ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={editValue}
                              onChange={(e) =>
                                setEditValue(e.target.value.replace(/\D/g, ''))
                              }
                              onKeyDown={(e) => {
                                if (
                                  ['.', ',', 'e', 'E', '+', '-'].includes(e.key)
                                )
                                  e.preventDefault()
                              }}
                              className="w-20 h-8 text-right"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSave(mov)}
                              className="h-6 w-6 text-green-600"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingId(null)}
                              className="h-6 w-6 text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span>{mov.quantidade}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStart(mov)}
                              className="h-6 w-6 ml-2"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mov)}
                              className="h-6 w-6 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
