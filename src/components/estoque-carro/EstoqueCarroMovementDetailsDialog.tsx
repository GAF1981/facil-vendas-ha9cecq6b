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
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { safeFormatDate } from '@/lib/formatters'
import { Loader2, Edit2, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  productId?: number | null
  productName?: string
  onRefresh?: () => void
}

export function EstoqueCarroMovementDetailsDialog({
  open,
  onOpenChange,
  sessionId,
  productId,
  productName,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [movements, setMovements] = useState<any[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const { toast } = useToast()

  useEffect(() => {
    if (open && sessionId) {
      loadMovements()
    }
  }, [open, sessionId, productId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const data = await estoqueCarroService.getMovementDetails(
        sessionId,
        productId || null,
      )
      setMovements(data)
    } catch (error) {
      console.error('Failed to load details', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditStart = (mov: any) => {
    setEditingId(mov.id)
    setEditValue(mov.quantidade?.toString() || '0')
  }

  const handleEditSave = async (mov: any) => {
    try {
      const newQtd = Number(editValue)
      if (isNaN(newQtd) || newQtd < 0) return

      const pId = mov.produto_id || productId
      if (!pId) throw new Error('ID do produto não encontrado')

      if (mov.raw_type === 'contagem') {
        await estoqueCarroService.updateCount(mov.id, newQtd, sessionId, pId)
      } else {
        await estoqueCarroService.updateMovementRecord(
          mov.id,
          mov.raw_type,
          newQtd,
          sessionId,
          pId,
        )
      }

      toast({ title: 'Lançamento atualizado' })
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
    if (!confirm('Tem certeza que deseja remover este lançamento?')) return
    try {
      const pId = mov.produto_id || productId
      if (!pId) throw new Error('ID do produto não encontrado')

      if (mov.raw_type === 'contagem') {
        await estoqueCarroService.deleteCount(mov.id, sessionId, pId)
      } else {
        await estoqueCarroService.deleteMovementRecord(
          mov.id,
          mov.raw_type,
          sessionId,
          pId,
        )
      }

      toast({ title: 'Lançamento removido' })
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
      case 'ENTRADAS_cliente_carro':
        return { label: 'Recolhido (Cliente)', color: 'text-green-600' }
      case 'SAIDAS_carro_cliente':
        return { label: 'Consignado (Cliente)', color: 'text-red-600' }
      case 'ENTRADAS_estoque_carro':
      case 'reposicao':
      case 'reposição':
        return { label: 'Reposição', color: 'text-blue-600' }
      case 'SAIDAS_carro_estoque':
      case 'devolucao':
      case 'devolução':
        return { label: 'Devolução', color: 'text-orange-600' }
      case 'contagem':
        return { label: 'Contagem', color: 'text-purple-600 font-semibold' }
      default:
        return { label: type, color: '' }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {productId
              ? `Detalhes: ${productName}`
              : 'Últimos Lançamentos (Estoque Carro)'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8 flex-1">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
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
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma movimentação detalhada encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((mov, idx) => {
                    const { label, color } = getTypeLabel(mov.movement_type)
                    const typeStr = String(
                      mov.raw_type || mov.movement_type,
                    ).toLowerCase()

                    const isEditableType =
                      [
                        'entradas_estoque_carro',
                        'saidas_carro_estoque',
                        'contagem',
                        'reposicao',
                        'reposição',
                        'devolucao',
                        'devolução',
                      ].includes(typeStr) ||
                      ['compra', 'brinde', 'perda'].includes(typeStr)

                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          {safeFormatDate(mov.data_horario, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className={color}>{label}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={mov.produto_nome}
                        >
                          {mov.produto_nome || 'Desconhecido'}
                        </TableCell>
                        <TableCell>
                          {mov.pedido ? `#${mov.pedido}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {editingId === mov.id && isEditableType ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={editValue}
                                onChange={(e) =>
                                  setEditValue(
                                    e.target.value.replace(/\D/g, ''),
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (
                                    ['.', ',', 'e', 'E', '+', '-'].includes(
                                      e.key,
                                    )
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
                              {isEditableType && (
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
