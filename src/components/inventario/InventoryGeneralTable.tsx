import { useState, useEffect, useMemo } from 'react'
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
import { MovementDetailsPopover } from './MovementDetailsPopover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Ban, Filter } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'

interface Props {
  items: InventoryGeneralItem[]
  onMarkAsZero: (productId: number) => void
  readOnly?: boolean
  isEditMode?: boolean
  onUpdateItem?: (productId: number, type: string, value: number) => void
}

// Editable Cell Component
function EditableCell({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  const [localValue, setLocalValue] = useState(value.toString())

  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const handleBlur = () => {
    const num = parseFloat(localValue)
    if (!isNaN(num) && num !== value) {
      onChange(num)
    } else {
      setLocalValue(value.toString())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
      e.currentTarget.blur() // Remove focus
    }
  }

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-20 h-8 text-right px-2 py-1"
    />
  )
}

export function InventoryGeneralTable({
  items,
  onMarkAsZero,
  readOnly = false,
  isEditMode = false,
  onUpdateItem,
}: Props) {
  const [contagemFilter, setContagemFilter] = useState('')
  const [diffFilter, setDiffFilter] = useState('')

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Contagem Filter
      if (contagemFilter) {
        const val = parseFloat(contagemFilter)
        if (!isNaN(val) && item.contagem !== val) return false
      }

      // Diff Filter
      if (diffFilter) {
        const val = parseFloat(diffFilter)
        if (!isNaN(val) && item.diferenca_qty !== val) return false
      }

      return true
    })
  }, [items, contagemFilter, diffFilter])

  return (
    <div className="rounded-md border bg-card overflow-auto shadow-sm max-h-[70vh] relative">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
          <TableRow>
            <TableHead className="w-[200px] bg-muted">Produto</TableHead>
            <TableHead className="bg-muted">Tipo</TableHead>
            <TableHead className="text-right bg-muted">Saldo Inicial</TableHead>
            <TableHead className="text-right text-green-600 bg-muted">
              Entradas (Compras)
            </TableHead>
            <TableHead className="text-right text-green-600 bg-muted">
              <div className="flex items-center justify-end gap-1">
                Entradas (Carro)
              </div>
            </TableHead>
            <TableHead className="text-right text-red-600 bg-muted">
              Saídas (Perdas)
            </TableHead>
            <TableHead className="text-right text-red-600 bg-muted">
              <div className="flex items-center justify-end gap-1">
                Saídas (Carro)
              </div>
            </TableHead>
            <TableHead className="text-right font-bold bg-muted">
              Saldo Final (Teórico)
            </TableHead>
            <TableHead className="text-right bg-blue-50">
              <div className="flex items-center justify-end gap-2">
                Contagem
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4">
                    <div className="space-y-2">
                      <Label>Filtrar Contagem</Label>
                      <Input
                        type="number"
                        placeholder="Valor exato"
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
            <TableHead className="text-right bg-muted">
              <div className="flex items-center justify-end gap-2">
                Dif (Qtd)
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4">
                    <div className="space-y-2">
                      <Label>Filtrar Diferença</Label>
                      <Input
                        type="number"
                        placeholder="Valor exato"
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
            <TableHead className="text-right bg-muted">Dif (Val)</TableHead>
            <TableHead className="text-right font-bold bg-gray-50">
              Novo Saldo Final
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.map((item) => (
            <TableRow key={item.produto_id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.produto}</span>
                  <span className="text-xs text-muted-foreground">
                    Code: {item.codigo}
                  </span>
                </div>
              </TableCell>
              <TableCell>{item.tipo}</TableCell>
              <TableCell className="text-right font-mono">
                {item.saldo_inicial}
              </TableCell>

              {/* Compras */}
              <TableCell className="text-right font-mono text-green-600">
                {isEditMode && !readOnly && onUpdateItem ? (
                  <EditableCell
                    value={item.compras}
                    onChange={(val) =>
                      onUpdateItem(item.produto_id, 'COMPRA', val)
                    }
                  />
                ) : (
                  item.compras
                )}
              </TableCell>

              {/* Entradas Carro */}
              <TableCell className="text-right font-mono text-green-600">
                <div className="flex items-center justify-end gap-1">
                  {isEditMode && !readOnly && onUpdateItem ? (
                    <EditableCell
                      value={item.carro_para_estoque}
                      onChange={(val) =>
                        onUpdateItem(item.produto_id, 'CARRO_PARA_ESTOQUE', val)
                      }
                    />
                  ) : (
                    item.carro_para_estoque
                  )}
                  {!isEditMode && (
                    <MovementDetailsPopover
                      title="Entradas (Carro -> Estoque)"
                      details={item.details_carro_para_estoque}
                      colorClass="text-green-600"
                    />
                  )}
                </div>
              </TableCell>

              {/* Saídas Perdas */}
              <TableCell className="text-right font-mono text-red-600">
                {isEditMode && !readOnly && onUpdateItem ? (
                  <EditableCell
                    value={item.saidas_perdas}
                    onChange={(val) =>
                      onUpdateItem(item.produto_id, 'PERDA', val)
                    }
                  />
                ) : (
                  item.saidas_perdas
                )}
              </TableCell>

              {/* Saídas Carro */}
              <TableCell className="text-right font-mono text-red-600">
                <div className="flex items-center justify-end gap-1">
                  {isEditMode && !readOnly && onUpdateItem ? (
                    <EditableCell
                      value={item.estoque_para_carro}
                      onChange={(val) =>
                        onUpdateItem(item.produto_id, 'ESTOQUE_PARA_CARRO', val)
                      }
                    />
                  ) : (
                    item.estoque_para_carro
                  )}
                  {!isEditMode && (
                    <MovementDetailsPopover
                      title="Saídas (Estoque -> Carro)"
                      details={item.details_estoque_para_carro}
                      colorClass="text-red-600"
                    />
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right font-mono font-bold">
                {item.saldo_final}
              </TableCell>

              {/* Contagem */}
              <TableCell className="text-right font-mono bg-blue-50/50">
                <div className="flex items-center justify-end gap-2">
                  {isEditMode && !readOnly && onUpdateItem ? (
                    <EditableCell
                      value={item.has_count_record ? item.contagem : 0}
                      onChange={(val) =>
                        onUpdateItem(item.produto_id, 'CONTAGEM', val)
                      }
                    />
                  ) : (
                    <>
                      {item.has_count_record ? (
                        <span>{item.contagem}</span>
                      ) : item.is_mandatory ? (
                        <Badge variant="destructive" className="text-xs">
                          Pendente
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}

                      {!readOnly && !item.has_count_record && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-600"
                              onClick={() => onMarkAsZero(item.produto_id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Confirmar contagem ZERO{' '}
                              {item.is_mandatory && '(Obrigatório)'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell
                className={`text-right font-mono ${item.diferenca_qty < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {item.diferenca_qty}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(item.diferenca_val)}
              </TableCell>
              <TableCell className="text-right font-mono font-bold bg-gray-50/50">
                {item.novo_saldo_final}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
