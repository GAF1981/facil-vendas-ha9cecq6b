import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Bell,
  History,
  ArrowLeft,
  X,
  ArrowRightLeft,
  Users,
  Star,
  MapPin,
  LocateFixed,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { differenceInDays, parseISO, isValid } from 'date-fns'
import { ClientAlertsDialog } from './ClientAlertsDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'

interface RotaTableProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled?: boolean
  onSort: (key: string, e: React.MouseEvent) => void
  sortConfig: SortConfig
  loading?: boolean
  isSelectionMode: boolean
  onBulkTransfer?: () => void
  onBulkClear?: () => void
  onBulkFill?: () => void
  onTransferRow?: (row: RotaRow) => void
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
  onBulkTransfer,
  onBulkClear,
  onBulkFill,
  onTransferRow,
}: RotaTableProps) {
  const navigate = useNavigate()
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [selectedAlertRow, setSelectedAlertRow] = useState<RotaRow | null>(null)

  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyClientId, setHistoryClientId] = useState<number | null>(null)
  const [historyClientName, setHistoryClientName] = useState<string>('')

  const handleOpenAlert = (row: RotaRow) => {
    setSelectedAlertRow(row)
    setAlertDialogOpen(true)
  }

  const handleOpenHistory = (clientId: number, clientName: string) => {
    setHistoryClientId(clientId)
    setHistoryClientName(clientName)
    setHistoryDialogOpen(true)
  }

  const getSortIcon = (columnKey: string) => {
    const sortIndex = sortConfig.findIndex((s) => s.key === columnKey)
    if (sortIndex === -1)
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />

    const sort = sortConfig[sortIndex]
    const Icon = sort.direction === 'asc' ? ArrowUp : ArrowDown

    return (
      <div className="flex items-center">
        <Icon className="h-3 w-3 ml-1 text-primary" />
        {sortConfig.length > 1 && (
          <span className="text-[10px] ml-0.5 font-bold text-primary leading-none">
            {sortIndex + 1}
          </span>
        )}
      </div>
    )
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
        'cursor-pointer hover:bg-muted/50 transition-colors select-none',
        className,
        {
          'text-right': align === 'right',
          'text-center': align === 'center',
        },
      )}
      onClick={(e) => onSort(column, e)}
      title="Clique para ordenar. Shift+Clique para ordenação múltipla."
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

  const handleSaveTask = async (clientId: number, task: string) => {
    await onUpdateRow(clientId, 'tarefas', task)
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

  const colSpanCount = 22 - (isSelectionMode ? 7 : 0)

  return (
    <>
      <div className="rounded-md border bg-card overflow-hidden shadow-sm flex flex-col h-full mt-2">
        <div className="flex-1 overflow-auto">
          <div className="relative w-max min-w-full">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-bold text-xs">
                    #
                  </TableHead>

                  <SortableHeader
                    column="client_nome"
                    label="Cliente"
                    align="left"
                    className="min-w-[200px] font-bold text-xs"
                  />

                  <SortableHeader
                    column="municipio"
                    label="Município"
                    align="left"
                    className="min-w-[120px]"
                  />

                  <SortableHeader
                    column="debito"
                    label="Valor a Pagar"
                    align="right"
                    className="min-w-[100px]"
                  />

                  <TableHead
                    className="min-w-[90px] bg-muted/50 cursor-pointer hover:bg-muted/50 transition-colors text-center select-none"
                    onClick={(e) => onSort('vencimento_cobranca', e)}
                    title="Clique para ordenar. Shift+Clique para ordenação múltipla."
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

                  <SortableHeader
                    column="projecao"
                    label="Projeção"
                    align="right"
                    className="min-w-[100px]"
                  />

                  <SortableHeader
                    column="vendedor_nome"
                    label="Vendedor"
                    align="left"
                    className="min-w-[140px] font-bold text-xs"
                  />

                  <TableHead className="min-w-[200px] font-bold text-xs bg-muted/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">Próxima</span>
                      <div className="flex items-center gap-1">
                        {onBulkFill && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                            onClick={onBulkFill}
                            title="Preencher Todos"
                          >
                            <Users className="h-3 w-3" />
                          </Button>
                        )}
                        {onBulkTransfer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-purple-600 hover:bg-purple-100 hover:text-purple-800"
                            onClick={onBulkTransfer}
                            title="Transferir Todos (Batch)"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                          </Button>
                        )}
                        {onBulkClear && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-red-400 hover:bg-red-100 hover:text-red-600"
                            onClick={onBulkClear}
                            title="Limpar Todos (Batch)"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableHead>

                  <SortableHeader
                    column="grupo_rota"
                    label="Rota/Grupo"
                    align="left"
                    className="min-w-[120px]"
                  />

                  <SortableHeader
                    column="valor_consignado"
                    label="Consignado"
                    align="right"
                    className="min-w-[100px]"
                  />

                  {!isSelectionMode && (
                    <TableHead className="min-w-[200px] font-bold text-xs">
                      Endereço
                    </TableHead>
                  )}

                  {!isSelectionMode && (
                    <TableHead className="min-w-[120px] font-bold text-xs">
                      Tipo
                    </TableHead>
                  )}

                  {!isSelectionMode && (
                    <TableHead className="min-w-[130px] font-bold text-xs">
                      Telefone 1
                    </TableHead>
                  )}

                  {!isSelectionMode && (
                    <TableHead className="min-w-[120px] font-bold text-xs">
                      Contato 1
                    </TableHead>
                  )}

                  <SortableHeader
                    column="x_na_rota"
                    label="xRota"
                    align="center"
                    className="w-[80px]"
                  />

                  {!isSelectionMode && (
                    <TableHead className="text-center font-bold text-xs w-[80px]">
                      Pedido
                    </TableHead>
                  )}

                  <SortableHeader
                    column="data_acerto"
                    label="Data"
                    align="center"
                    className="min-w-[90px]"
                  />

                  <TableHead className="text-center font-bold text-xs w-[60px]">
                    Dias
                  </TableHead>

                  <TableHead className="w-[100px] text-center font-bold text-xs">
                    Status
                  </TableHead>

                  {!isSelectionMode && (
                    <TableHead className="w-[60px] text-center font-bold text-xs">
                      Boleto
                    </TableHead>
                  )}

                  {!isSelectionMode && (
                    <TableHead className="w-[70px] text-center font-bold text-xs">
                      Agreg.
                    </TableHead>
                  )}

                  <SortableHeader
                    column="cep"
                    label="CEP"
                    align="center"
                    className="w-[100px]"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={colSpanCount}
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
                  rows.map((row) => {
                    let rowClass =
                      'hover:bg-muted/30 transition-colors border-b text-xs'
                    let textClass = ''

                    if (row.is_completed) {
                      rowClass =
                        'bg-green-800 hover:bg-green-700 text-white dark:bg-green-900 dark:hover:bg-green-800 border-b text-xs'
                      textClass = 'text-green-100'
                    } else if (row.vencimento_status === 'VENCIDO') {
                      rowClass =
                        'bg-red-200 hover:bg-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 border-b text-xs'
                      textClass = 'text-red-900 dark:text-red-100'
                    } else if (row.x_na_rota > 3) {
                      rowClass =
                        'bg-[#4c1d95] hover:bg-[#5b21b6] text-white border-b text-xs'
                      textClass = 'text-purple-100'
                    }

                    const cleanTarefas = row.tarefas
                      ? row.tarefas.replace(/\[PROX:\d+\]/g, '').trim()
                      : ''

                    const hasAlerts =
                      (row.pendency_details &&
                        row.pendency_details.length > 0) ||
                      !!row.client['OBSERVAÇÃO FIXA'] ||
                      !!cleanTarefas

                    const hasCoords =
                      row.client.latitude &&
                      row.client.longitude &&
                      row.client.latitude !== 0 &&
                      row.client.longitude !== 0

                    return (
                      <TableRow key={row.client.CODIGO} className={rowClass}>
                        <TableCell
                          className={cn(
                            'text-center font-mono',
                            textClass || 'text-muted-foreground',
                          )}
                        >
                          {row.rowNumber}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-6 w-6 shrink-0 rounded-full',
                                row.favorito
                                  ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50/50 hover:bg-yellow-100/50'
                                  : row.is_completed || row.x_na_rota > 3
                                    ? 'text-white/40 hover:text-yellow-400'
                                    : 'text-muted-foreground/40 hover:text-yellow-500',
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                onUpdateRow(
                                  row.client.CODIGO,
                                  'favorito',
                                  !row.favorito,
                                )
                              }}
                              title={
                                row.favorito
                                  ? 'Remover dos Favoritos'
                                  : 'Marcar como Favorito'
                              }
                            >
                              <Star
                                className={cn(
                                  'h-4 w-4',
                                  row.favorito && 'fill-current',
                                )}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-6 w-6 shrink-0 rounded-full',
                                hasAlerts
                                  ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100 bg-yellow-50 animate-pulse'
                                  : row.is_completed || row.x_na_rota > 3
                                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                                    : 'text-muted-foreground hover:text-primary',
                              )}
                              onClick={() => handleOpenAlert(row)}
                              title="Alertas, Pendências e Tarefas"
                            >
                              <Bell
                                className={cn(
                                  'h-4 w-4',
                                  hasAlerts && 'fill-current',
                                )}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-6 w-6 shrink-0 rounded-full',
                                row.is_completed || row.x_na_rota > 3
                                  ? 'text-white/70 hover:text-white hover:bg-white/20'
                                  : 'text-muted-foreground hover:text-primary',
                              )}
                              onClick={() =>
                                handleOpenHistory(
                                  row.client.CODIGO,
                                  row.client['NOME CLIENTE'],
                                )
                              }
                              title="Ver Histórico de Acertos"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            {hasCoords && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  'h-6 w-6 shrink-0 rounded-full',
                                  row.is_completed || row.x_na_rota > 3
                                    ? 'text-white/70 hover:text-white hover:bg-white/20'
                                    : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50',
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${row.client.latitude},${row.client.longitude}`,
                                    '_blank',
                                  )
                                }}
                                title="Iniciar Navegação"
                              >
                                <MapPin className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'h-6 w-6 shrink-0 rounded-full',
                                row.is_completed || row.x_na_rota > 3
                                  ? 'text-white/70 hover:text-white hover:bg-white/20'
                                  : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50',
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/clientes/${row.client.CODIGO}?autoGeocode=true`)
                              }}
                              title="Atualizar Localização"
                            >
                              <LocateFixed className="h-4 w-4" />
                            </Button>
                            <div className="flex flex-col gap-0.5">
                              <span
                                className="font-semibold text-sm truncate max-w-[160px] block"
                                title={row.client['NOME CLIENTE'] || ''}
                              >
                                {row.client['NOME CLIENTE']}
                              </span>
                              <div
                                className={cn(
                                  'flex flex-wrap gap-1.5 text-[10px]',
                                  textClass || 'text-muted-foreground',
                                )}
                              >
                                <span
                                  className={cn(
                                    'font-mono px-1 rounded',
                                    row.is_completed || row.x_na_rota > 3
                                      ? 'bg-white/20'
                                      : 'bg-muted',
                                  )}
                                >
                                  {row.client.CODIGO}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell
                          className="truncate max-w-[120px]"
                          title={row.client.MUNICÍPIO || ''}
                        >
                          {row.client.MUNICÍPIO || '-'}
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn({
                                'text-red-600 font-bold':
                                  row.debito > 10 &&
                                  !row.is_completed &&
                                  row.vencimento_status !== 'VENCIDO' &&
                                  row.x_na_rota <= 3,
                                'text-white font-bold':
                                  row.debito > 10 &&
                                  (row.is_completed || row.x_na_rota > 3),
                                'text-red-900 font-bold':
                                  row.debito > 10 &&
                                  row.vencimento_status === 'VENCIDO' &&
                                  !row.is_completed,
                                'text-muted-foreground':
                                  row.debito <= 0 &&
                                  !row.is_completed &&
                                  row.x_na_rota <= 3,
                                [textClass]: true,
                              })}
                            >
                              {row.debito > 0
                                ? `R$ ${formatCurrency(row.debito)}`
                                : 'R$ 0,00'}
                            </span>
                            {row.quant_debito > 1 && (
                              <span
                                className={cn(
                                  'text-[9px] px-1 rounded-full',
                                  row.is_completed || row.x_na_rota > 3
                                    ? 'text-white bg-white/20'
                                    : 'text-muted-foreground bg-muted',
                                )}
                              >
                                {row.quant_debito} compras
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-[10px]">
                          {row.debito > 0 && row.vencimento_cobranca ? (
                            <div className="flex flex-col items-center">
                              <span
                                className={cn('font-semibold', {
                                  'text-red-600':
                                    row.vencimento_status === 'VENCIDO' &&
                                    !row.is_completed &&
                                    row.x_na_rota <= 3,
                                  'text-green-600':
                                    row.vencimento_status === 'A VENCER' &&
                                    !row.is_completed &&
                                    row.x_na_rota <= 3,
                                  'text-white':
                                    row.is_completed || row.x_na_rota > 3,
                                  'text-red-900':
                                    row.vencimento_status === 'VENCIDO' &&
                                    !row.is_completed &&
                                    row.x_na_rota <= 3,
                                })}
                              >
                                {safeFormatDate(
                                  row.vencimento_cobranca,
                                  'dd/MM/yy',
                                )}
                              </span>
                              <span
                                className={cn(
                                  'text-[9px] font-bold uppercase',
                                  {
                                    'text-red-600':
                                      row.vencimento_status === 'VENCIDO' &&
                                      !row.is_completed &&
                                      row.x_na_rota <= 3,
                                    'text-green-600':
                                      row.vencimento_status === 'A VENCER' &&
                                      !row.is_completed &&
                                      row.x_na_rota <= 3,
                                    'text-white':
                                      row.is_completed || row.x_na_rota > 3,
                                  },
                                )}
                              >
                                {row.vencimento_status === 'VENCIDO'
                                  ? 'Vencida'
                                  : 'A Vencer'}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>

                        <TableCell
                          className={cn(
                            'text-right',
                            textClass || 'text-muted-foreground',
                          )}
                        >
                          {row.projecao
                            ? `R$ ${formatCurrency(row.projecao)}`
                            : '-'}
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
                                  ? 'font-medium'
                                  : 'text-muted-foreground',
                                row.is_completed || row.x_na_rota > 3
                                  ? 'bg-white/20 border-white/30 text-white placeholder:text-white/70'
                                  : 'text-foreground',
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

                        <TableCell className="bg-muted/10 p-1">
                          <div className="flex items-center gap-1">
                            <Select
                              disabled={disabled}
                              value={
                                row.proximo_vendedor_id?.toString() || 'none'
                              }
                              onValueChange={(val) =>
                                onUpdateRow(
                                  row.client.CODIGO,
                                  'proximo_vendedor_id',
                                  val === 'none' ? null : parseInt(val),
                                )
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  'h-7 w-full text-xs truncate border-dashed flex-1',
                                  row.proximo_vendedor_id
                                    ? 'font-medium text-purple-600 bg-purple-50 border-purple-200'
                                    : 'text-muted-foreground/70',
                                  row.is_completed || row.x_na_rota > 3
                                    ? 'bg-white/10 border-white/30 text-white/90 placeholder:text-white/50'
                                    : '',
                                )}
                              >
                                <SelectValue placeholder="Próximo..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="none"
                                  className="text-muted-foreground"
                                >
                                  Manter Atual
                                </SelectItem>
                                {sellers.map((s) => (
                                  <SelectItem
                                    key={s.id}
                                    value={s.id.toString()}
                                  >
                                    {s.nome_completo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {row.proximo_vendedor_id && (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-6 w-6',
                                    row.is_completed || row.x_na_rota > 3
                                      ? 'text-white/70 hover:bg-white/20 hover:text-white'
                                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
                                  )}
                                  onClick={() =>
                                    onTransferRow && onTransferRow(row)
                                  }
                                  title="Transferir para Vendedor Atual"
                                >
                                  <ArrowLeft className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    'h-6 w-6',
                                    row.is_completed || row.x_na_rota > 3
                                      ? 'text-white/70 hover:bg-white/20 hover:text-white'
                                      : 'text-red-400 hover:text-red-600 hover:bg-red-50',
                                  )}
                                  onClick={() =>
                                    onUpdateRow(
                                      row.client.CODIGO,
                                      'proximo_vendedor_id',
                                      null,
                                    )
                                  }
                                  title="Limpar (Manter Atual)"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            'truncate max-w-[120px]',
                            textClass || 'text-muted-foreground',
                          )}
                          title={row.client['GRUPO ROTA'] || ''}
                        >
                          {row.client['GRUPO ROTA'] || '-'}
                        </TableCell>

                        <TableCell
                          className={cn(
                            'text-right',
                            textClass || 'text-muted-foreground',
                          )}
                        >
                          {row.valor_consignado !== null &&
                          row.valor_consignado !== undefined
                            ? `R$ ${formatCurrency(row.valor_consignado)}`
                            : '-'}
                        </TableCell>

                        {!isSelectionMode && (
                          <TableCell
                            className="truncate max-w-[200px]"
                            title={row.client.ENDEREÇO || ''}
                          >
                            {row.client.ENDEREÇO || '-'}
                          </TableCell>
                        )}

                        {!isSelectionMode && (
                          <TableCell className="truncate max-w-[120px]">
                            {row.client['TIPO DE CLIENTE'] || '-'}
                          </TableCell>
                        )}

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
                                  className={cn(
                                    'h-6 w-6 rounded-full',
                                    row.is_completed || row.x_na_rota > 3
                                      ? 'text-white hover:bg-white/20'
                                      : 'text-green-600 hover:text-green-700 hover:bg-green-50',
                                  )}
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

                        {!isSelectionMode && (
                          <TableCell className="truncate max-w-[120px]">
                            {row.client['CONTATO 1'] || '-'}
                          </TableCell>
                        )}

                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <Input
                              type="number"
                              min={0}
                              max={99}
                              disabled={disabled || row.is_completed}
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
                                row.x_na_rota > 3 && !row.is_completed
                                  ? 'bg-[#4c1d95] text-white border-purple-900 font-bold'
                                  : row.x_na_rota > 0
                                    ? 'bg-secondary/50 font-medium text-foreground'
                                    : 'text-muted-foreground',
                                row.is_completed &&
                                  'bg-green-700 text-white border-green-500',
                              )}
                            />
                          </div>
                        </TableCell>

                        {!isSelectionMode && (
                          <TableCell className="text-center font-mono text-[10px]">
                            {row.numero_pedido || '-'}
                          </TableCell>
                        )}

                        <TableCell className="text-center text-[10px]">
                          {row.data_acerto
                            ? safeFormatDate(row.data_acerto, 'dd/MM/yy')
                            : '-'}
                        </TableCell>

                        <TableCell
                          className={cn(
                            'text-center text-[10px] font-medium',
                            textClass || 'text-muted-foreground',
                          )}
                        >
                          {row.data_acerto && isValid(parseISO(row.data_acerto))
                            ? differenceInDays(today, parseISO(row.data_acerto))
                            : '-'}
                        </TableCell>

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

                        {!isSelectionMode && (
                          <TableCell className="text-center">
                            <Checkbox
                              checked={row.boleto}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                onUpdateRow(
                                  row.client.CODIGO,
                                  'boleto',
                                  checked,
                                )
                              }
                              className={cn(
                                'h-4 w-4',
                                (row.is_completed || row.x_na_rota > 3) &&
                                  'border-white data-[state=checked]:bg-white data-[state=checked]:text-primary',
                              )}
                            />
                          </TableCell>
                        )}

                        {!isSelectionMode && (
                          <TableCell className="text-center">
                            <Checkbox
                              checked={row.agregado}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                onUpdateRow(
                                  row.client.CODIGO,
                                  'agregado',
                                  checked,
                                )
                              }
                              className={cn(
                                'h-4 w-4',
                                (row.is_completed || row.x_na_rota > 3) &&
                                  'border-white data-[state=checked]:bg-white data-[state=checked]:text-primary',
                              )}
                            />
                          </TableCell>
                        )}

                        <TableCell
                          className={cn(
                            'text-center font-mono text-[10px]',
                            textClass || 'text-muted-foreground',
                          )}
                        >
                          {row.client['CEP OFICIO'] || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </table>
          </div>
        </div>
      </div>

      {selectedAlertRow && (
        <ClientAlertsDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          row={selectedAlertRow}
          onSaveTask={handleSaveTask}
        />
      )}

      {historyClientId && (
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico: {historyClientName}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AcertoHistoryTable clientId={historyClientId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
