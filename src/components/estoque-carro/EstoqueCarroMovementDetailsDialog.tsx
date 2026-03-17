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
  productId: number
  productName: string
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
    if (open && sessionId && productId) {
      loadMovements()
    }
  }, [open, sessionId, productId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const data = await estoqueCarroService.getMovementDetails(
        sessionId,
        productId,
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
      await estoqueCarroService.updateCount(
        mov.id,
        newQtd,
        sessionId,
        productId,
      )
      toast({ title: 'Contagem atualizada' })
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
    if (!confirm('Tem certeza que deseja remover esta contagem?')) return
    try {
      await estoqueCarroService.deleteCount(mov.id, sessionId, productId)
      toast({ title: 'Contagem removida' })
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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes: {productName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma movimentação detalhada encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov, idx) => {
                  const { label, color } = getTypeLabel(mov.movement_type)
                  const isContagem = mov.movement_type === 'contagem'

                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        {safeFormatDate(mov.data_horario, 'dd/MM HH:mm')}
                      </TableCell>
                      <TableCell className={color}>{label}</TableCell>
                      <TableCell>
                        {mov.pedido ? `#${mov.pedido}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {editingId === mov.id && isContagem ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
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
                            {isContagem && (
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
