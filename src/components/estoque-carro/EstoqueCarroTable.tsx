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
import { Eye, Filter } from 'lucide-react'
import { useState, useMemo } from 'react'
import { EstoqueCarroMovementDetailsDialog } from './EstoqueCarroMovementDetailsDialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Props {
  items: EstoqueCarroItem[]
}

export function EstoqueCarroTable({ items }: Props) {
  const [selectedItem, setSelectedItem] = useState<EstoqueCarroItem | null>(
    null,
  )

  // Filter States
  const [contagemFilter, setContagemFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState('')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Contagem Filter
      if (contagemFilter) {
        if (contagemFilter === 'PENDENTE') {
          const isPendente = item.diferenca_qtd !== 0 && !item.has_count_record
          if (!isPendente) return false
        } else {
          const val = parseFloat(contagemFilter)
          if (!isNaN(val) && item.contagem !== val) return false
        }
      }

      // Diff Filter
      if (diffFilter) {
        const val = parseFloat(diffFilter)
        if (!isNaN(val) && item.diferenca_qtd !== val) return false
      }

      return true
    })
  }, [items, contagemFilter, diffFilter])

  return (
    <>
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
                        className="h-4 w-4 p-0"
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4">
                      <div className="space-y-2">
                        <Label>Filtrar Contagem</Label>
                        <Input
                          placeholder="Valor ou 'PENDENTE'"
                          value={contagemFilter}
                          onChange={(e) => setContagemFilter(e.target.value)}
                          className="h-8"
                        />
                        {contagemFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-6 text-xs"
                            onClick={() => setContagemFilter('')}
                          >
                            Limpar Filtro
                          </Button>
                        )}
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
                        className="h-4 w-4 p-0"
                      >
                        <Filter className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4">
                      <div className="space-y-2">
                        <Label>Filtrar Diferença</Label>
                        <Input
                          type="number"
                          placeholder="Valor da diferença"
                          value={diffFilter}
                          onChange={(e) => setDiffFilter(e.target.value)}
                          className="h-8"
                        />
                        {diffFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-6 text-xs"
                            onClick={() => setDiffFilter('')}
                          >
                            Limpar Filtro
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </TableHead>
              <TableHead className="text-right">Dif (Val)</TableHead>
              {/* Ajustes column removed as per request */}
              <TableHead className="text-right font-bold bg-gray-100">
                Novo Saldo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              // Status Logic: If there is a diff and no count record, it's PENDING
              const isPendente =
                item.diferenca_qtd !== 0 && !item.has_count_record

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
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{item.produto}</span>
                      {item.codigo && (
                        <span className="text-xs text-muted-foreground">
                          Cod: {item.codigo}
                        </span>
                      )}
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
                      <Badge variant="destructive" className="text-[10px] px-1">
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
        />
      )}
    </>
  )
}
