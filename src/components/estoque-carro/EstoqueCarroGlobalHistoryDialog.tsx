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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { estoqueCarroService } from '@/services/estoqueCarroService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onRefresh?: () => void
}

export function EstoqueCarroGlobalHistoryDialog({
  open,
  onOpenChange,
  sessionId,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [movements, setMovements] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open && sessionId) {
      loadMovements()
    }
  }, [open, sessionId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const fetchTable = async (
        table: string,
        type: string,
        qtyField: string,
      ) => {
        const { data } = await supabase
          .from(table)
          .select('*, PRODUTOS(PRODUTO)')
          .eq('id_estoque_carro', sessionId)
        return (data || []).map((d) => ({
          uniqueId: `${type}_${d.id}`,
          id: d.id,
          movement_type: d.descricao || type,
          raw_type: type,
          data_horario: d.created_at || d.data_horario || d.timestamp,
          quantidade: d[qtyField] || d.quantidade || 0,
          produto_id: d.produto_id,
          produto_nome: d.PRODUTOS?.PRODUTO || d.produto || 'Desconhecido',
          pedido: d.pedido || '-',
        }))
      }

      const clientToCar = await fetchTable(
        'ESTOQUE CARRO: CLIENTE PARA O CARRO',
        'ENTRADAS_cliente_carro',
        'ENTRADAS_cliente_carro',
      )
      const carToClient = await fetchTable(
        'ESTOQUE CARRO: CARRO PARA O CLIENTE',
        'SAIDAS_carro_cliente',
        'SAIDAS_carro_cliente',
      )

      const { data: repoData } = await supabase
        .from('REPOSIÇÃO E DEVOLUÇÃO')
        .select('*, PRODUTOS(PRODUTO)')
        .eq('id_estoque_carro', sessionId)
      const inventoryMovements = (repoData || []).map((d) => {
        const isReposicao = d.TIPO === 'REPOSIÇÃO' || d.TIPO === 'REPOSICAO'
        const typeKey = isReposicao
          ? 'ENTRADAS_estoque_carro'
          : 'SAIDAS_carro_estoque'
        return {
          uniqueId: `${typeKey}_${d.id}`,
          id: d.id,
          movement_type: typeKey,
          raw_type: typeKey,
          data_horario: d.created_at,
          quantidade: d.quantidade,
          produto_id: d.produto_id,
          produto_nome: d.PRODUTOS?.PRODUTO || 'Desconhecido',
          pedido: '-',
        }
      })

      const contagens = await fetchTable(
        'ESTOQUE CARRO CONTAGEM',
        'contagem',
        'quantidade',
      )

      const all = [
        ...clientToCar,
        ...carToClient,
        ...inventoryMovements,
        ...contagens,
      ]
      all.sort(
        (a, b) =>
          new Date(b.data_horario).getTime() -
          new Date(a.data_horario).getTime(),
      )

      setMovements(all)
      setSelectedIds([])
    } catch (error) {
      console.error('Failed to load details', error)
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
      const newQtd = parseInt(editValue.replace(/\D/g, '')) || 0
      if (newQtd < 0) return

      if (mov.raw_type === 'contagem') {
        await estoqueCarroService.updateCount(
          mov.id,
          newQtd,
          sessionId,
          mov.produto_id,
        )
      } else {
        await estoqueCarroService.updateMovementRecord(
          mov.id,
          mov.raw_type,
          newQtd,
          sessionId,
          mov.produto_id,
        )
      }

      toast({ title: 'Registro atualizado' })
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
    if (!confirm('Tem certeza que deseja remover este registro?')) return
    try {
      if (mov.raw_type === 'contagem') {
        await estoqueCarroService.deleteCount(mov.id, sessionId, mov.produto_id)
      } else {
        await estoqueCarroService.deleteMovementRecord(
          mov.id,
          mov.raw_type,
          sessionId,
          mov.produto_id,
        )
      }
      toast({ title: 'Registro removido' })
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

  const editableMovements = movements.filter((mov) =>
    ['contagem', 'ENTRADAS_estoque_carro', 'SAIDAS_carro_estoque'].includes(
      mov.raw_type,
    ),
  )
  const allEditableSelected =
    editableMovements.length > 0 &&
    editableMovements.every((mov) => selectedIds.includes(mov.uniqueId))

  const toggleSelectAll = () => {
    if (allEditableSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(editableMovements.map((m) => m.uniqueId))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (
      !confirm(
        `Tem certeza que deseja remover ${selectedIds.length} registro(s)?`,
      )
    )
      return

    setLoading(true)
    try {
      const itemsToDelete = movements.filter((m) =>
        selectedIds.includes(m.uniqueId),
      )

      for (const mov of itemsToDelete) {
        if (mov.raw_type === 'contagem') {
          await estoqueCarroService.deleteCount(
            mov.id,
            sessionId,
            mov.produto_id,
          )
        } else {
          await estoqueCarroService.deleteMovementRecord(
            mov.id,
            mov.raw_type,
            sessionId,
            mov.produto_id,
          )
        }
      }

      toast({ title: 'Registros removidos com sucesso' })
      setSelectedIds([])
      loadMovements()
      if (onRefresh) onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro na exclusão em lote',
        description: error.message,
        variant: 'destructive',
      })
      loadMovements()
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ENTRADAS_cliente_carro':
        return { label: 'Recolhido (Cliente)', color: 'text-green-600' }
      case 'SAIDAS_carro_cliente':
        return { label: 'Consignado (Cliente)', color: 'text-red-600' }
      case 'ENTRADAS_estoque_carro':
        return { label: 'Entrada Estoque', color: 'text-blue-600' }
      case 'SAIDAS_carro_estoque':
        return { label: 'Devolução Estoque', color: 'text-orange-600' }
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Últimos Lançamentos (Estoque
              Carro)
            </DialogTitle>
            {selectedIds.length > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionados ({selectedIds.length})
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allEditableSelected}
                    onCheckedChange={toggleSelectAll}
                    disabled={editableMovements.length === 0}
                  />
                </TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Nenhum lançamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov) => {
                  const { label, color } = getTypeLabel(mov.movement_type)
                  const canEditDelete = [
                    'contagem',
                    'ENTRADAS_estoque_carro',
                    'SAIDAS_carro_estoque',
                  ].includes(mov.raw_type)

                  return (
                    <TableRow key={mov.uniqueId}>
                      <TableCell>
                        {canEditDelete && (
                          <Checkbox
                            checked={selectedIds.includes(mov.uniqueId)}
                            onCheckedChange={() => toggleSelect(mov.uniqueId)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {safeFormatDate(mov.data_horario, 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className={color}>{label}</TableCell>
                      <TableCell>{mov.produto_nome}</TableCell>
                      <TableCell>{mov.pedido}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {editingId === mov.uniqueId && canEditDelete ? (
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
                            {canEditDelete && (
                              <>
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
                              </>
                            )}
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
