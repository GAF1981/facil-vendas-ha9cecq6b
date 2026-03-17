import { EstoqueCarroItem } from '@/types/estoque_carro'
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
import { Eye, Filter, Calculator, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { EstoqueCarroMovementDetailsDialog } from './EstoqueCarroMovementDetailsDialog'
import { EstoqueCarroCountDialog } from './EstoqueCarroCountDialog'
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
import { Input } from '@/components/ui/input'

interface Props {
  items: EstoqueCarroItem[]
  onRefresh?: () => void
}

export function EstoqueCarroTable({ items, onRefresh }: Props) {
  const [selectedItem, setSelectedItem] = useState<EstoqueCarroItem | null>(
    null,
  )
  const [countItem, setCountItem] = useState<EstoqueCarroItem | null>(null)

  // Filter States
  const [contagemFilter, setContagemFilter] = useState<string>('todos')
  const [diffFilter, setDiffFilter] = useState<string>('todos')
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Text Search: Name or Barcode or Code
      if (search) {
        const lower = search.toLowerCase()
        const matchesName = item.produto.toLowerCase().includes(lower)
        const matchesCode = item.codigo?.toString().includes(lower)
        const matchesBarcode = item.barcode?.toString().includes(lower)

        if (!matchesName && !matchesCode && !matchesBarcode) {
          return false
        }
      }

      // Contagem Filter
      if (contagemFilter !== 'todos') {
        if (contagemFilter === 'Pendente') {
          // New Logic: If Saldo Final != 0 AND count not recorded -> Pendente
          const isPendente = item.saldo_final !== 0 && !item.has_count_record
          if (!isPendente) return false
        }
      }

      // Diff Filter
      if (diffFilter !== 'todos') {
        if (diffFilter === '>0') {
          if (item.diferenca_qtd <= 0) return false
        } else if (diffFilter === '!=0') {
          if (item.diferenca_qtd === 0) return false
        }
      }

      return true
    })
  }, [items, contagemFilter, diffFilter, search])

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por nome ou código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="rounded-md border bg-card overflow-auto shadow-sm max-h-[65vh]">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px] bg-muted sticky left-0 z-20"></TableHead>
                <TableHead className="min-w-[200px]">Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo Inicial</TableHead>
                <TableHead className="text-right text-green-600 font-semibold bg-green-50/50">
                  Ent. Cliente
                </TableHead>
                <TableHead className="text-right text-green-600">
                  Ent. Estoque
                </TableHead>
                <TableHead className="text-right text-red-600 font-semibold bg-red-50/50">
                  Saída Cliente
                </TableHead>
                <TableHead className="text-right text-red-600">
                  Saída Estoque
                </TableHead>
                <TableHead className="text-right font-bold bg-blue-50/50">
                  Saldo Final
                </TableHead>
                <TableHead className="text-right bg-yellow-50/50 min-w-[120px]">
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
                <TableHead className="text-right min-w-[100px]">
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
              {filteredItems.map((item) => {
                // Status Indicator Logic: if Saldo final != 0 AND !has_count_record -> Pendente
                const isPendente =
                  item.saldo_final !== 0 && !item.has_count_record

                return (
                  <TableRow key={item.produto_id} className="hover:bg-muted/30">
                    <TableCell className="p-2 sticky left-0 bg-background z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium group relative">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span>{item.produto}</span>
                          {/* Quick Count Icon */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:bg-blue-100 ml-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCountItem(item)
                            }}
                            title="Realizar Contagem Rápida"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {item.codigo && <span>Cod: {item.codigo}</span>}
                          {item.barcode && <span>Bar: {item.barcode}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{item.tipo}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.saldo_inicial}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-700 font-medium bg-green-50/20">
                      {item.entradas_cliente}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {item.entradas_estoque}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-700 font-medium bg-red-50/20">
                      {item.saidas_cliente}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {item.saidas_estoque}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono font-bold bg-blue-50/30',
                        item.saldo_final < 0 && 'text-red-600',
                      )}
                    >
                      {item.saldo_final}
                    </TableCell>
                    <TableCell className="text-right font-mono bg-yellow-50/30">
                      {isPendente ? (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1"
                        >
                          Pendente
                        </Badge>
                      ) : (
                        item.contagem
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono',
                        item.diferenca_qtd !== 0 && 'text-red-600 font-bold',
                      )}
                    >
                      {item.diferenca_qtd}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatCurrency(item.diferenca_val)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold bg-gray-100/50">
                      {item.novo_saldo}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {selectedItem && (
          <EstoqueCarroMovementDetailsDialog
            open={!!selectedItem}
            onOpenChange={(o) => !o && setSelectedItem(null)}
            sessionId={selectedItem.id_estoque_carro}
            productId={selectedItem.produto_id}
            productName={selectedItem.produto}
            onRefresh={() => {
              if (onRefresh) onRefresh()
              else window.location.reload()
            }}
          />
        )}

        {countItem && (
          <EstoqueCarroCountDialog
            open={!!countItem}
            onOpenChange={(o) => !o && setCountItem(null)}
            sessionId={countItem.id_estoque_carro}
            onSuccess={() => {
              if (onRefresh) onRefresh()
              else window.location.reload()
            }}
            preselectedProduct={{
              id: countItem.produto_id,
              codigo: countItem.codigo,
              produto: countItem.produto,
            }}
          />
        )}
      </div>
    </>
  )
}
