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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { supabase } from '@/lib/supabase/client'
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

export function InventoryMovementDetailsDialog({
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
  const [productMap, setProductMap] = useState<Map<number, string>>(new Map())

  // Filters
  const [filterData, setFilterData] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterIdEstoque, setFilterIdEstoque] = useState('')
  const [filterProduto, setFilterProduto] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.from('PRODUTOS').select('ID, PRODUTO')
      setProductMap(new Map(data?.map((p) => [p.ID, p.PRODUTO]) || []))
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    if (open && sessionId) {
      loadMovements()
    }
  }, [open, sessionId, productId])

  const loadMovements = async () => {
    setLoading(true)
    try {
      const data = await inventoryGeneralService.getMovementDetails(
        sessionId,
        (productId || null) as any,
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

      await inventoryGeneralService.updateMovementQty(
        mov.id,
        mov.movement_type,
        newQtd,
        sessionId,
        pId,
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
      const pId = mov.produto_id || productId
      if (!pId) throw new Error('ID do produto não encontrado')

      await inventoryGeneralService.deleteMovementRecord(
        mov.id,
        mov.movement_type,
        sessionId,
        pId,
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

  const filteredMovements = movements.filter((mov) => {
    if (filterData) {
      const movDate = mov.data_horario
        ? new Date(mov.data_horario).toISOString().split('T')[0]
        : ''
      if (movDate !== filterData) return false
    }
    if (filterTipo !== 'todos' && mov.movement_type !== filterTipo) return false
    if (
      filterIdEstoque &&
      String(mov.id_estoque_carro || '') !== filterIdEstoque
    )
      return false
    if (filterProduto) {
      const pName = String(
        mov.produto_nome || mov.produto || productMap.get(mov.produto_id) || '',
      ).toLowerCase()
      if (!pName.includes(filterProduto.toLowerCase())) return false
    }
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {productId
              ? `Detalhes: ${productName}`
              : 'Últimos Lançamentos (Inventário)'}
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/30 p-4 rounded-lg border my-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            Filtros
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">
                Data
              </Label>
              <Input
                type="date"
                value={filterData}
                onChange={(e) => setFilterData(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">
                Tipo
              </Label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="devolucao_carro">
                    Devolução (Carro)
                  </SelectItem>
                  <SelectItem value="reposicao_carro">
                    Reposição (Carro)
                  </SelectItem>
                  <SelectItem value="perda">Perda/Quebra</SelectItem>
                  <SelectItem value="contagem">Contagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">
                ID Estoque Carro
              </Label>
              <Input
                placeholder="Ex: 123"
                value={filterIdEstoque}
                onChange={(e) => setFilterIdEstoque(e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">
                Produto
              </Label>
              <Input
                placeholder="Buscar produto..."
                value={filterProduto}
                onChange={(e) => setFilterProduto(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>

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
                  <TableHead>ID Estoque</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead className="text-right w-[140px]">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Nenhuma movimentação detalhada encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((mov, idx) => {
                    const { label, color } = getTypeLabel(mov.movement_type)
                    const prodName =
                      mov.produto_nome ||
                      mov.produto ||
                      productMap.get(mov.produto_id) ||
                      'Desconhecido'

                    const isEditableType = [
                      'compra',
                      'devolucao_carro',
                      'reposicao_carro',
                      'perda',
                      'contagem',
                    ].includes(mov.movement_type)

                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          {safeFormatDate(mov.data_horario, 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className={color}>{label}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {mov.id_estoque_carro
                            ? `#${mov.id_estoque_carro}`
                            : '-'}
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={prodName}
                        >
                          {prodName}
                        </TableCell>
                        <TableCell>
                          {mov.pedido ? `#${mov.pedido}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {editingId === mov.id ? (
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
