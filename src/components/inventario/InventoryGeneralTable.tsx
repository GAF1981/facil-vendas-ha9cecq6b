import { InventoryGeneralItem } from '@/types/inventory_general'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Filter, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MovementDetailsPopover } from './MovementDetailsPopover'
import { InventoryActionDialog } from './InventoryActionDialog'

interface Props {
  items: InventoryGeneralItem[]
  sessionId: number
  onSuccess: () => void
  readOnly?: boolean
  isEditMode?: boolean
  onMarkAsZero?: (productId: number) => void
  onUpdateItem?: (productId: number, type: string, value: number) => void
}

export function InventoryGeneralTable({
  items,
  sessionId,
  onSuccess,
  readOnly,
}: Props) {
  // Filter States
  const [contagemFilter, setContagemFilter] = useState<string>('todos')
  const [diffFilter, setDiffFilter] = useState<string>('todos')
  const [search, setSearch] = useState('')

  // Quick Count State
  const [quickCountProduct, setQuickCountProduct] =
    useState<InventoryGeneralItem | null>(null)

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Text Search
      if (search) {
        const lower = search.toLowerCase()
        if (
          !item.produto.toLowerCase().includes(lower) &&
          !item.codigo?.toString().includes(lower)
        ) {
          return false
        }
      }

      // Contagem Filter
      if (contagemFilter !== 'todos') {
        if (contagemFilter === 'Pendente') {
          const isPendente = item.is_mandatory && !item.has_count_record
          if (!isPendente) return false
        }
      }

      // Diff Filter
      if (diffFilter !== 'todos') {
        if (diffFilter === '>0') {
          if (item.diferenca_qty <= 0) return false
        } else if (diffFilter === '!=0') {
          if (item.diferenca_qty === 0) return false
        }
      }

      return true
    })
  }, [items, contagemFilter, diffFilter, search])

  return (
    <>
      <div className="rounded-md border bg-card overflow-auto shadow-sm max-h-[65vh]">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead className="min-w-[250px]">Produto</TableHead>
              <TableHead className="text-right">S. Inicial</TableHead>
              <TableHead className="text-right text-blue-600">
                Compras
              </TableHead>
              <TableHead className="text-right text-green-600">
                Devolução
              </TableHead>
              <TableHead className="text-right text-red-600">Perdas</TableHead>
              <TableHead className="text-right text-orange-600">
                Reposição
              </TableHead>
              <TableHead className="text-right font-bold bg-blue-50/50">
                S. Final (Calc)
              </TableHead>
              <TableHead className="text-right bg-yellow-50/50 min-w-[140px]">
                <div className="flex items-center justify-end gap-2">
                  Contagem
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-4 w-4 p-0',
                          contagemFilter !== 'todos' && 'text-primary',
                        )}
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4">
                      <div className="space-y-2">
                        <Label>Filtrar Contagem</Label>
                        <Select
                          value={contagemFilter}
                          onValueChange={setContagemFilter}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead className="text-right min-w-[120px]">
                <div className="flex items-center justify-end gap-2">
                  Dif (Qtd)
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-4 w-4 p-0',
                          diffFilter !== 'todos' && 'text-primary',
                        )}
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4">
                      <div className="space-y-2">
                        <Label>Filtrar Diferença</Label>
                        <Select
                          value={diffFilter}
                          onValueChange={setDiffFilter}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value=">0">{`> 0`}</SelectItem>
                            <SelectItem value="!=0">!= 0</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead className="text-right">Dif (Val)</TableHead>
              <TableHead className="text-right font-bold bg-gray-100">
                Novo Saldo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const isPendente = item.is_mandatory && !item.has_count_record

                return (
                  <TableRow
                    key={item.produto_id}
                    className="hover:bg-muted/30 group"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.produto}</span>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:bg-blue-100 ml-auto"
                              onClick={() => setQuickCountProduct(item)}
                              title="Contagem Rápida"
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {item.codigo && (
                          <span className="text-xs text-muted-foreground">
                            Cod: {item.codigo}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {item.saldo_inicial}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-600">
                      {item.compras}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {item.carro_para_estoque > 0 ? (
                        <MovementDetailsPopover
                          details={item.details_carro_para_estoque}
                          title="Devoluções"
                        >
                          <span className="cursor-pointer hover:underline underline-offset-4 decoration-dashed">
                            {item.carro_para_estoque}
                          </span>
                        </MovementDetailsPopover>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {item.saidas_perdas}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {item.estoque_para_carro > 0 ? (
                        <MovementDetailsPopover
                          details={item.details_estoque_para_carro}
                          title="Reposições"
                        >
                          <span className="cursor-pointer hover:underline underline-offset-4 decoration-dashed">
                            {item.estoque_para_carro}
                          </span>
                        </MovementDetailsPopover>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold bg-blue-50/30">
                      {item.saldo_final}
                    </TableCell>
                    <TableCell className="text-right font-mono bg-yellow-50/30">
                      {isPendente ? (
                        <Badge
                          variant="outline"
                          className="text-orange-600 border-orange-200 bg-orange-50 gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" /> Pendente
                        </Badge>
                      ) : (
                        <span className="flex items-center justify-end gap-1">
                          {item.has_count_record && (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                          {item.contagem}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono font-medium',
                        item.diferenca_qty < 0
                          ? 'text-red-600'
                          : item.diferenca_qty > 0
                            ? 'text-blue-600'
                            : 'text-gray-400',
                      )}
                    >
                      {item.diferenca_qty > 0 ? '+' : ''}
                      {item.diferenca_qty}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-xs',
                        item.diferenca_val !== 0
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {formatCurrency(item.diferenca_val)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold bg-gray-100/50">
                      {item.novo_saldo_final}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {quickCountProduct && (
        <InventoryActionDialog
          open={!!quickCountProduct}
          onOpenChange={(o) => !o && setQuickCountProduct(null)}
          type="CONTAGEM"
          sessionId={sessionId}
          onSuccess={onSuccess}
          persistedEmployeeId=""
          setPersistedEmployeeId={() => {}}
          persistedSupplierId=""
          setPersistedSupplierId={() => {}}
          preselectedProduct={{
            ID: quickCountProduct.produto_id,
            CODIGO: quickCountProduct.codigo,
            PRODUTO: quickCountProduct.produto,
          }}
        />
      )}
    </>
  )
}
