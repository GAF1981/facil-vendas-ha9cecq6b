import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventarioItem } from '@/types/inventario'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ArrowUpDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface InventarioTableProps {
  data: InventarioItem[]
  onSort?: (key: keyof InventarioItem) => void
  sortKey?: keyof InventarioItem | null
  sortDirection?: 'asc' | 'desc'
}

export function InventarioTable({
  data,
  onSort,
  sortKey,
  sortDirection,
}: InventarioTableProps) {
  const renderSortIcon = (key: keyof InventarioItem) => {
    if (sortKey !== key)
      return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />
    return (
      <ArrowUpDown
        className={cn(
          'ml-2 h-3 w-3',
          sortDirection === 'asc' ? 'text-primary' : 'text-primary',
          'opacity-100',
        )}
      />
    )
  }

  const handleSort = (key: keyof InventarioItem) => {
    if (onSort) onSort(key)
  }

  const SortableHead = ({
    title,
    sortKey,
    className,
    children,
  }: {
    title: string
    sortKey: keyof InventarioItem
    className?: string
    children?: React.ReactNode
  }) => {
    if (!onSort) {
      return (
        <TableHead className={cn('text-center font-bold p-2', className)}>
          <div className="flex flex-col items-center justify-center h-full">
            {title}
            {children}
          </div>
        </TableHead>
      )
    }

    return (
      <TableHead className={cn('text-center p-0', className)}>
        <Button
          variant="ghost"
          onClick={() => handleSort(sortKey)}
          className="w-full h-full min-h-[48px] rounded-none hover:bg-black/5 font-bold"
        >
          {title}
          {renderSortIcon(sortKey)}
        </Button>
      </TableHead>
    )
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Cód. Barras</TableHead>
              <TableHead className="w-[80px]">Cód. Produto</TableHead>
              <TableHead className="min-w-[200px]">Mercadoria</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="text-right">Preço</TableHead>

              <SortableHead
                title="Saldo Inicial"
                sortKey="saldo_inicial"
                className="bg-blue-50/50 text-blue-700"
              />

              <TableHead className="text-center bg-green-50/50 text-green-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Estoque &rarr; Carro)</span>
              </TableHead>
              <TableHead className="text-center bg-green-50/50 text-green-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Cliente &rarr; Carro)</span>
              </TableHead>
              <TableHead className="text-center bg-red-50/50 text-red-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Carro &rarr; Estoque)</span>
              </TableHead>
              <TableHead className="text-center bg-red-50/50 text-red-700">
                Movimentação
                <br />
                <span className="text-[10px]">(Carro &rarr; Cliente)</span>
              </TableHead>

              <SortableHead
                title="Saldo Final"
                sortKey="saldo_final"
                className="bg-muted/50 border-x border-border/50 min-w-[120px]"
              />

              <TableHead className="text-center font-bold bg-yellow-50/50 text-yellow-700 min-w-[100px]">
                Contagem
              </TableHead>
              <TableHead className="text-center">Dif. (Qtd)</TableHead>
              <TableHead className="text-right">Dif. (Valor)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum item de inventário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    'hover:bg-muted/30',
                    item.hasError && 'bg-red-50 hover:bg-red-100/50',
                  )}
                >
                  <TableCell className="font-mono text-xs">
                    {item.codigo_barras || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.codigo_produto}
                  </TableCell>
                  <TableCell className="font-medium text-sm flex items-center gap-2">
                    {item.mercadoria}
                    {item.hasError && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-destructive text-destructive-foreground">
                            <p>Erro ao processar dados deste item.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{item.tipo || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-xs">
                    R$ {formatCurrency(item.preco)}
                  </TableCell>
                  <TableCell className="text-center bg-blue-50/20 font-mono">
                    {item.saldo_inicial}
                  </TableCell>
                  <TableCell className="text-center bg-green-50/20 text-green-700 font-mono">
                    {item.entrada_estoque_carro}
                  </TableCell>
                  <TableCell className="text-center bg-green-50/20 text-green-700 font-mono">
                    {item.entrada_cliente_carro}
                  </TableCell>
                  <TableCell className="text-center bg-red-50/20 text-red-700 font-mono">
                    {item.saida_carro_estoque}
                  </TableCell>
                  <TableCell className="text-center bg-red-50/20 text-red-700 font-mono">
                    {item.saida_carro_cliente}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-muted/20 border-x border-border/50 font-mono">
                    {item.saldo_final}
                  </TableCell>
                  <TableCell className="text-center font-bold bg-yellow-50/20 text-yellow-700 font-mono">
                    {item.estoque_contagem_carro}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-center font-bold font-mono',
                      item.diferenca_quantidade > 0
                        ? 'text-green-600'
                        : item.diferenca_quantidade < 0
                          ? 'text-red-600'
                          : 'text-gray-400',
                    )}
                  >
                    {item.diferenca_quantidade > 0 ? '+' : ''}
                    {item.diferenca_quantidade}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-bold text-xs',
                      item.diferenca_quantidade > 0
                        ? 'text-green-600'
                        : item.diferenca_quantidade < 0
                          ? 'text-red-600'
                          : 'text-gray-400',
                    )}
                  >
                    {item.diferenca_valor > 0 ? '+' : ''}
                    R$ {formatCurrency(item.diferenca_valor)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
