import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface RotaTableProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled?: boolean
  onSort: (key: string) => void
  sortConfig: SortConfig
  loading?: boolean
}

export function RotaTable({
  rows,
  sellers,
  onUpdateRow,
  disabled = false,
  onSort,
  sortConfig,
  loading = false,
}: RotaTableProps) {
  // Use Intl.NumberFormat specifically for Stock column as requested
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey)
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />
    if (sortConfig.direction === 'asc')
      return <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    return <ArrowDown className="h-3 w-3 ml-1 text-primary" />
  }

  const SortableHeader = ({
    column,
    label,
    align = 'left',
  }: {
    column: string
    label: string
    align?: 'left' | 'right' | 'center'
  }) => (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 transition-colors', {
        'text-right': align === 'right',
        'text-center': align === 'center',
      })}
      onClick={() => onSort(column)}
    >
      <div
        className={cn('flex items-center gap-1', {
          'justify-end': align === 'right',
          'justify-center': align === 'center',
        })}
      >
        {label}
        {getSortIcon(column)}
      </div>
    </TableHead>
  )

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 border rounded-md bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando rota...</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[50px] text-center font-bold text-xs">
                #
              </TableHead>
              <TableHead className="w-[250px] font-bold text-xs">
                Cliente
              </TableHead>
              <SortableHeader column="x_na_rota" label="xRota" align="center" />
              <TableHead className="w-[100px] text-center font-bold text-xs">
                Boleto
              </TableHead>
              <TableHead className="w-[100px] text-center font-bold text-xs">
                Agregado
              </TableHead>
              <TableHead className="w-[160px] font-bold text-xs">
                Vendedor
              </TableHead>
              <SortableHeader column="debito" label="Débito" align="right" />
              <SortableHeader
                column="estoque"
                label="Valor do Estoque Final (Saldo)"
                align="right"
              />
              <SortableHeader
                column="projecao"
                label="Projeção"
                align="right"
              />
              <TableHead className="text-center font-bold text-xs">
                Pedido
              </TableHead>
              <SortableHeader
                column="data_acerto"
                label="Data"
                align="center"
              />
              <TableHead className="w-[100px] text-center font-bold text-xs">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-medium">Nenhum cliente encontrado</p>
                    <p className="text-xs">
                      Tente ajustar os filtros de busca.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.client.CODIGO}
                  className={cn(
                    'hover:bg-muted/30 transition-colors border-b text-xs',
                    {
                      'bg-green-50/50 hover:bg-green-100/50 dark:bg-green-950/10 dark:hover:bg-green-950/20':
                        row.is_completed,
                      'bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20':
                        row.has_pendency && !row.is_completed,
                    },
                  )}
                >
                  <TableCell className="text-center text-muted-foreground font-mono">
                    {row.rowNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="font-semibold text-sm truncate max-w-[230px] block"
                        title={row.client['NOME CLIENTE'] || ''}
                      >
                        {row.client['NOME CLIENTE']}
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono bg-muted px-1 rounded">
                          {row.client.CODIGO}
                        </span>
                        {row.client.MUNICÍPIO && (
                          <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                            • {row.client.MUNICÍPIO}
                          </span>
                        )}
                        {row.client['OBSERVAÇÃO FIXA'] && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="bg-yellow-100 text-yellow-800 px-1 rounded cursor-help font-bold text-[10px]">
                                  OBS
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[300px]">
                                <p>{row.client['OBSERVAÇÃO FIXA']}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Select
                        disabled={disabled}
                        value={row.x_na_rota.toString()}
                        onValueChange={(val) =>
                          onUpdateRow(
                            row.client.CODIGO,
                            'x_na_rota',
                            parseInt(val),
                          )
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            'h-7 w-[50px] text-xs px-1 justify-center',
                            row.x_na_rota > 3
                              ? 'bg-purple-100 text-purple-700 border-purple-200 font-bold'
                              : row.x_na_rota > 0
                                ? 'bg-secondary/50 font-medium'
                                : 'text-muted-foreground',
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">-</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.boleto}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        onUpdateRow(row.client.CODIGO, 'boleto', checked)
                      }
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={row.agregado}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        onUpdateRow(row.client.CODIGO, 'agregado', checked)
                      }
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={disabled}
                      value={row.vendedor_id?.toString() || 'none'}
                      onValueChange={(val) =>
                        onUpdateRow(
                          row.client.CODIGO,
                          'vendedor_id',
                          val === 'none' ? null : parseInt(val),
                        )
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'h-7 w-full text-xs truncate',
                          row.vendedor_id
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground',
                        )}
                      >
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="none"
                          className="text-muted-foreground"
                        >
                          Nenhum
                        </SelectItem>
                        {sellers.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <div className="flex flex-col items-end">
                      <span
                        className={cn({
                          'text-red-600 font-bold': row.debito > 10,
                          'text-muted-foreground': row.debito <= 0,
                        })}
                      >
                        {row.debito > 0
                          ? `R$ ${formatCurrency(row.debito)}`
                          : '-'}
                      </span>
                      {row.quant_debito > 1 && (
                        <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded-full">
                          {row.quant_debito} compras
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {/* Display exact currency value or dash if null */}
                    {row.estoque !== null ? (
                      currencyFormatter.format(row.estoque)
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.projecao ? `R$ ${formatCurrency(row.projecao)}` : '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-[10px]">
                    {row.numero_pedido || '-'}
                  </TableCell>
                  <TableCell className="text-center text-[10px]">
                    {row.data_acerto
                      ? safeFormatDate(row.data_acerto, 'dd/MM/yy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {row.vencimento_status === 'VENCIDO' && (
                        <Badge
                          variant="destructive"
                          className="text-[9px] px-1 h-4 flex items-center gap-1"
                        >
                          <AlertCircle className="w-2 h-2" /> VENCIDO
                        </Badge>
                      )}
                      {row.vencimento_status === 'A VENCER' && (
                        <Badge
                          variant="outline"
                          className="text-yellow-600 border-yellow-200 bg-yellow-50 text-[9px] px-1 h-4"
                        >
                          A VENCER
                        </Badge>
                      )}
                      {row.vencimento_status === 'PAGO' && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 bg-green-50 text-[9px] px-1 h-4"
                        >
                          PAGO
                        </Badge>
                      )}
                      {row.has_pendency && (
                        <Badge
                          variant="secondary"
                          className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-[9px] px-1 h-4 border-orange-200 border"
                        >
                          PENDÊNCIA
                        </Badge>
                      )}
                    </div>
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
