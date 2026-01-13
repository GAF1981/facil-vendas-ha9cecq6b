import {
  TableHeader,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
  MessageCircle,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { differenceInDays, parseISO, isValid } from 'date-fns'

interface RotaTableProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled?: boolean
  onSort: (key: string) => void
  sortConfig: SortConfig
  loading?: boolean
  isSelectionMode: boolean
}

export function RotaTable({
  rows,
  sellers,
  onUpdateRow,
  disabled = false,
  onSort,
  sortConfig,
  loading = false,
  isSelectionMode,
}: RotaTableProps) {
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
    className,
  }: {
    column: string
    label: string
    align?: 'left' | 'right' | 'center'
    className?: string
  }) => (
    <TableHead
      className={cn(
        'cursor-pointer hover:bg-muted/50 transition-colors',
        className,
        {
          'text-right': align === 'right',
          'text-center': align === 'center',
        },
      )}
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

  const handleWhatsappClick = (phone: string | null | undefined) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 border rounded-md bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando rota...</p>
      </div>
    )
  }

  const today = new Date()

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-sm flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="relative w-max min-w-full">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                {/* 1. Débito */}
                <SortableHeader
                  column="debito"
                  label="Débito"
                  align="right"
                  className="min-w-[100px]"
                />

                {/* NEW: Vencimento (Rota) - Oldest collection date */}
                <TableHead
                  className="min-w-[90px] bg-muted/50 cursor-pointer hover:bg-muted/50 transition-colors text-center"
                  onClick={() => onSort('vencimento_cobranca')}
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-1">
                          Vencimento
                          {getSortIcon('vencimento_cobranca')}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Data de vencimento mais antiga em aberto</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>

                {/* 2. Projeção */}
                <SortableHeader
                  column="projecao"
                  label="Projeção"
                  align="right"
                  className="min-w-[100px]"
                />

                {/* 3. Vendedor */}
                <TableHead className="min-w-[140px] font-bold text-xs">
                  Vendedor
                </TableHead>

                {/* 4. Rota/Grupo Rota */}
                <SortableHeader
                  column="grupo_rota"
                  label="Rota/Grupo"
                  align="left"
                  className="min-w-[120px]"
                />

                {/* 5. Consignado */}
                <SortableHeader
                  column="valor_consignado"
                  label="Consignado"
                  align="right"
                  className="min-w-[100px]"
                />

                {/* 6. # (Row Number) */}
                <TableHead className="w-[50px] text-center font-bold text-xs">
                  #
                </TableHead>

                {/* 7. Cliente */}
                <TableHead className="min-w-[200px] font-bold text-xs">
                  Cliente
                </TableHead>

                {/* 8. Município */}
                <SortableHeader
                  column="municipio"
                  label="Município"
                  align="left"
                  className="min-w-[120px]"
                />

                {/* 9. Endereço (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="min-w-[200px] font-bold text-xs">
                    Endereço
                  </TableHead>
                )}

                {/* 10. Tipo de Cliente */}
                <TableHead className="min-w-[120px] font-bold text-xs">
                  Tipo
                </TableHead>

                {/* 11. Telefone 1 (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="min-w-[130px] font-bold text-xs">
                    Telefone 1
                  </TableHead>
                )}

                {/* 12. Contato 1 (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="min-w-[120px] font-bold text-xs">
                    Contato 1
                  </TableHead>
                )}

                {/* 13. xRota */}
                <SortableHeader
                  column="x_na_rota"
                  label="xRota"
                  align="center"
                  className="w-[80px]"
                />

                {/* 14. Pedido (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="text-center font-bold text-xs w-[80px]">
                    Pedido
                  </TableHead>
                )}

                {/* 15. Data */}
                <SortableHeader
                  column="data_acerto"
                  label="Data"
                  align="center"
                  className="min-w-[90px]"
                />

                {/* NEW: Dias de Acerto */}
                <TableHead className="text-center font-bold text-xs w-[60px]">
                  Dias
                </TableHead>

                {/* 16. Status */}
                <TableHead className="w-[100px] text-center font-bold text-xs">
                  Status
                </TableHead>

                {/* 17. Boleto (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="w-[60px] text-center font-bold text-xs">
                    Boleto
                  </TableHead>
                )}

                {/* 18. Agregado (Toggleable) */}
                {!isSelectionMode && (
                  <TableHead className="w-[70px] text-center font-bold text-xs">
                    Agreg.
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSelectionMode ? 14 : 20}
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
                        // Dark Green for Completed (Activity during route)
                        'bg-green-200 hover:bg-green-300 dark:bg-green-800 dark:hover:bg-green-700':
                          row.is_completed,
                        'bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-950/10 dark:hover:bg-orange-950/20':
                          row.has_pendency && !row.is_completed,
                      },
                    )}
                  >
                    {/* 1. Débito */}
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

                    {/* NEW: Vencimento (Rota) */}
                    <TableCell className="text-center text-[10px]">
                      {row.debito > 0 && row.vencimento_cobranca ? (
                        <span className="font-semibold text-red-600">
                          {safeFormatDate(row.vencimento_cobranca, 'dd/MM/yy')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>

                    {/* 2. Projeção */}
                    <TableCell className="text-right text-muted-foreground">
                      {row.projecao
                        ? `R$ ${formatCurrency(row.projecao)}`
                        : '-'}
                    </TableCell>

                    {/* 3. Vendedor */}
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

                    {/* 4. Rota/Grupo Rota */}
                    <TableCell
                      className="text-muted-foreground truncate max-w-[120px]"
                      title={row.client['GRUPO ROTA'] || ''}
                    >
                      {row.client['GRUPO ROTA'] || '-'}
                    </TableCell>

                    {/* 5. Consignado */}
                    <TableCell className="text-right text-muted-foreground">
                      {row.valor_consignado !== null &&
                      row.valor_consignado !== undefined
                        ? `R$ ${formatCurrency(row.valor_consignado)}`
                        : '-'}
                    </TableCell>

                    {/* 6. # */}
                    <TableCell className="text-center text-muted-foreground font-mono">
                      {row.rowNumber}
                    </TableCell>

                    {/* 7. Cliente */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="font-semibold text-sm truncate max-w-[200px] block"
                          title={row.client['NOME CLIENTE'] || ''}
                        >
                          {row.client['NOME CLIENTE']}
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-mono bg-muted px-1 rounded">
                            {row.client.CODIGO}
                          </span>
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

                    {/* 8. Município */}
                    <TableCell
                      className="truncate max-w-[120px]"
                      title={row.client.MUNICÍPIO || ''}
                    >
                      {row.client.MUNICÍPIO || '-'}
                    </TableCell>

                    {/* 9. Endereço (Toggleable) */}
                    {!isSelectionMode && (
                      <TableCell
                        className="truncate max-w-[200px]"
                        title={row.client.ENDEREÇO || ''}
                      >
                        {row.client.ENDEREÇO || '-'}
                      </TableCell>
                    )}

                    {/* 10. Tipo de Cliente */}
                    <TableCell className="truncate max-w-[120px]">
                      {row.client['TIPO DE CLIENTE'] || '-'}
                    </TableCell>

                    {/* 11. Telefone 1 (WhatsApp) (Toggleable) */}
                    {!isSelectionMode && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[90px]">
                            {row.client['FONE 1'] || '-'}
                          </span>
                          {row.client['FONE 1'] && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                              onClick={() =>
                                handleWhatsappClick(row.client['FONE 1'])
                              }
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* 12. Contato 1 (Toggleable) */}
                    {!isSelectionMode && (
                      <TableCell className="truncate max-w-[120px]">
                        {row.client['CONTATO 1'] || '-'}
                      </TableCell>
                    )}

                    {/* 13. xRota (Input) */}
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          disabled={disabled || row.is_completed}
                          // If completed, visually force 0 even if state lags slightly before refresh
                          value={row.is_completed ? 0 : row.x_na_rota}
                          onChange={(e) =>
                            onUpdateRow(
                              row.client.CODIGO,
                              'x_na_rota',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className={cn(
                            'h-7 w-[60px] text-center text-xs p-1',
                            row.x_na_rota > 3
                              ? 'bg-purple-100 text-purple-700 border-purple-200 font-bold'
                              : row.x_na_rota > 0
                                ? 'bg-secondary/50 font-medium'
                                : 'text-muted-foreground',
                          )}
                        />
                      </div>
                    </TableCell>

                    {/* 14. Pedido (Toggleable) */}
                    {!isSelectionMode && (
                      <TableCell className="text-center font-mono text-[10px]">
                        {row.numero_pedido || '-'}
                      </TableCell>
                    )}

                    {/* 15. Data */}
                    <TableCell className="text-center text-[10px]">
                      {row.data_acerto
                        ? safeFormatDate(row.data_acerto, 'dd/MM/yy')
                        : '-'}
                    </TableCell>

                    {/* NEW: Dias de Acerto */}
                    <TableCell className="text-center text-[10px] text-muted-foreground font-medium">
                      {row.data_acerto && isValid(parseISO(row.data_acerto))
                        ? differenceInDays(today, parseISO(row.data_acerto))
                        : '-'}
                    </TableCell>

                    {/* 16. Status */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {row.vencimento_status === 'VENCIDO' && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 h-4 flex items-center gap-1"
                          >
                            <AlertCircle className="w-2 h-2" /> Vencida
                          </Badge>
                        )}
                        {row.vencimento_status === 'A VENCER' && (
                          <Badge
                            variant="outline"
                            className="text-green-700 border-green-300 bg-green-100 text-[9px] px-1 h-4"
                          >
                            A Vencer
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

                    {/* 17. Boleto (Toggleable) */}
                    {!isSelectionMode && (
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
                    )}

                    {/* 18. Agregado (Toggleable) */}
                    {!isSelectionMode && (
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
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  )
}
