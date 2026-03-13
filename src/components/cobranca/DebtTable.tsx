import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Eraser,
  MessageSquareText,
  ArrowUpDown,
  PlusCircle,
  Info,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  CircleAlert,
  Send,
  Printer,
} from 'lucide-react'
import { ClientDebt, PaymentHistoryDetail } from '@/types/cobranca'
import { Boleto } from '@/types/boleto'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { DebtDetailsDialog } from './DebtDetailsDialog'
import { CollectionActionsSheet } from './CollectionActionsSheet'
import { CollectionMessageDialog } from './CollectionMessageDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cobrancaService } from '@/services/cobrancaService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { DateRange } from 'react-day-picker'

interface DebtTableProps {
  data: ClientDebt[]
  boletos?: Boleto[]
  onRefresh?: () => void
  selectedItems: Set<string>
  onToggleItem: (id: string) => void
  isCobrancaMode: boolean
  onToggleAll?: (ids: string[]) => void
  isSimplified?: boolean
  statusFilter?: string[]
  motoqueiroFilter?: string
  orderFilter?: string
  showOnlySelected?: boolean
  formaPagamentoFilter?: string
  dataCombinadaRange?: DateRange
  vencimentoRange?: DateRange
}

interface FlatRow {
  uniqueId: string
  receivableId: number
  clientId: number
  clientName: string
  clientType: string
  employeeName: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  cep: string | null
  clientOrderCount: number
  clientTotalActions: number
  orderId: number
  orderDate: string
  vencimento: string | null
  formaPagamento: string
  valorRegistrado: number
  valorPago: number
  debito: number
  status: 'VENCIDO' | 'A VENCER' | 'PAGO'
  formaCobranca: string | null
  dataCombinada: string | null
  motivo: string | null
  telefoneCobranca: string | null
  emailCobranca: string | null
  collectionActionCount: number
  orderTotal: number
  orderPayments: { method: string; value: number; dueDate: string }[]
  source: 'NEGOTIATION' | 'RECEIPT' | 'ORIGINAL'
  paymentHistory?: PaymentHistoryDetail[]
  isConferido: boolean
  needsConferir: boolean
}

type SortConfig = {
  key: keyof FlatRow
  direction: 'asc' | 'desc'
} | null

export function DebtTable({
  data,
  boletos = [],
  onRefresh,
  selectedItems,
  onToggleItem,
  isCobrancaMode,
  onToggleAll,
  isSimplified = false,
  statusFilter = [],
  motoqueiroFilter = 'todos',
  orderFilter = '',
  showOnlySelected = false,
  formaPagamentoFilter = 'todos',
  dataCombinadaRange,
  vencimentoRange,
}: DebtTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'vencimento',
    direction: 'asc',
  })

  const [selectedOrderForActions, setSelectedOrderForActions] = useState<{
    orderId: string
    clientId: number
    clientName: string
    installment?: {
      vencimento: string | null
      formaPagamento: string | null
    }
  } | null>(null)

  const [messageData, setMessageData] = useState<FlatRow | null>(null)

  const { toast } = useToast()

  const [localUpdates, setLocalUpdates] = useState<
    Record<string, { formaCobranca?: any; dataCombinada?: any; motivo?: any }>
  >({})

  // Refs for dual scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const isScrolling = useRef(false)

  useEffect(() => {
    const tableContainer = tableContainerRef.current
    if (tableContainer) {
      setScrollWidth(tableContainer.scrollWidth)
    }
  }, [data, isSimplified, isCobrancaMode])

  const handleScrollTable = () => {
    if (isScrolling.current) return
    if (!tableContainerRef.current || !topScrollRef.current) return
    isScrolling.current = true
    topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft
    setTimeout(() => {
      isScrolling.current = false
    }, 50)
  }

  const handleScrollTop = () => {
    if (isScrolling.current) return
    if (!tableContainerRef.current || !topScrollRef.current) return
    isScrolling.current = true
    tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    setTimeout(() => {
      isScrolling.current = false
    }, 50)
  }

  const handleOpenDetails = (client: ClientDebt) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  const handleOpenActions = (
    orderId: number,
    clientId: number,
    clientName: string,
    installment?: { vencimento: string | null; formaPagamento: string | null },
  ) => {
    setSelectedOrderForActions({
      orderId: orderId.toString(),
      clientId,
      clientName,
      installment,
    })
  }

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) {
      window.open(`https://wa.me/55${cleanPhone}`, '_blank')
    }
  }

  const handleGeneratePdf = async (orderId: number) => {
    try {
      const blob = await cobrancaService.generateOrderReceipt(
        orderId,
        'settlement',
      )
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao gerar o PDF do pedido.',
        variant: 'destructive',
      })
    }
  }

  const flattenedData: FlatRow[] = useMemo(() => {
    const rows = data.flatMap((client) =>
      client.orders.flatMap((order) => {
        return order.installments.map((inst, index) => {
          const uniqueId = `${client.clientId || '0'}-${order.orderId || '0'}-${inst.id || '0'}-${index}`
          const updates = localUpdates[uniqueId] || {}

          const currentFormaCobranca =
            updates.formaCobranca !== undefined
              ? updates.formaCobranca
              : inst.formaCobranca

          const currentDataCombinada =
            updates.dataCombinada !== undefined
              ? updates.dataCombinada
              : inst.dataCombinada

          const currentMotivo =
            updates.motivo !== undefined ? updates.motivo : inst.motivo

          const debito = Math.max(0, inst.valorRegistrado - inst.valorPago)
          const bDateStr = inst.vencimento
            ? inst.vencimento.substring(0, 10)
            : null

          // Matching logic for Boletos
          const match = boletos.find(
            (b) =>
              b.cliente_codigo === client.clientId &&
              (b.vencimento ? b.vencimento.substring(0, 10) : null) ===
                bDateStr &&
              Math.abs(Number(b.valor) - debito) < 0.01,
          )

          const isConferido = !!match
          const needsConferir =
            !match && inst.formaPagamento?.toLowerCase().includes('boleto')

          return {
            uniqueId,
            receivableId: inst.id,
            clientId: client.clientId,
            clientName: client.clientName,
            clientType: client.clientType,
            employeeName: order.employeeName,
            address: client.address,
            neighborhood: client.neighborhood,
            city: client.city,
            cep: client.cep,
            clientOrderCount: client.orderCount,
            clientTotalActions: client.totalActionCount,
            orderId: order.orderId,
            orderDate: order.date,
            vencimento: inst.vencimento,
            formaPagamento: inst.formaPagamento,
            valorRegistrado: inst.valorRegistrado,
            valorPago: inst.valorPago,
            debito,
            status: inst.status,
            formaCobranca: currentFormaCobranca,
            dataCombinada: currentDataCombinada,
            motivo: currentMotivo,
            telefoneCobranca: client.telefone_cobranca || client.phone,
            emailCobranca: client.email_cobranca,
            collectionActionCount: inst.collectionActionCount,
            orderTotal: order.netValue,
            orderPayments: order.paymentsMade.map((pd) => ({
              method: 'Pagamento',
              value: pd.value,
              dueDate: pd.date,
            })),
            source: inst.source || 'ORIGINAL',
            paymentHistory: inst.paymentHistory || [],
            isConferido,
            needsConferir,
          }
        })
      }),
    )

    let filtered = rows

    if (orderFilter) {
      filtered = filtered.filter((r) =>
        r.orderId.toString().includes(orderFilter),
      )
    }

    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter((r) => statusFilter.includes(r.status))
    }

    if (!showOnlySelected && motoqueiroFilter !== 'todos') {
      if (motoqueiroFilter === 'com_rota') {
        filtered = filtered.filter((r) => r.formaCobranca === 'MOTOQUEIRO')
      } else if (motoqueiroFilter === 'sem_rota') {
        filtered = filtered.filter((r) => r.formaCobranca !== 'MOTOQUEIRO')
      }
    }

    if (showOnlySelected) {
      filtered = filtered.filter((r) => selectedItems.has(r.uniqueId))
    }

    if (formaPagamentoFilter && formaPagamentoFilter !== 'todos') {
      filtered = filtered.filter((r) => {
        if (formaPagamentoFilter === 'boleto conferido') return r.isConferido
        if (formaPagamentoFilter === 'boleto conferir') return r.needsConferir
        const lower = r.formaPagamento?.toLowerCase() || ''
        if (formaPagamentoFilter === 'pix') return lower.includes('pix')
        if (formaPagamentoFilter === 'dinheiro')
          return lower.includes('dinheiro')
        if (formaPagamentoFilter === 'cheque') return lower.includes('cheque')
        return true
      })
    }

    if (dataCombinadaRange?.from) {
      const fromStr = format(dataCombinadaRange.from, 'yyyy-MM-dd')
      const toStr = dataCombinadaRange.to
        ? format(dataCombinadaRange.to, 'yyyy-MM-dd')
        : fromStr

      filtered = filtered.filter((r) => {
        if (!r.dataCombinada) return false
        return r.dataCombinada >= fromStr && r.dataCombinada <= toStr
      })
    }

    if (vencimentoRange?.from) {
      const vFromStr = format(vencimentoRange.from, 'yyyy-MM-dd')
      const vToStr = vencimentoRange.to
        ? format(vencimentoRange.to, 'yyyy-MM-dd')
        : vFromStr

      filtered = filtered.filter((r) => {
        if (!r.vencimento) return false
        const instVenc = r.vencimento.substring(0, 10)
        return instVenc >= vFromStr && instVenc <= vToStr
      })
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [
    data,
    boletos,
    localUpdates,
    sortConfig,
    statusFilter,
    motoqueiroFilter,
    orderFilter,
    showOnlySelected,
    selectedItems,
    formaPagamentoFilter,
    dataCombinadaRange,
    vencimentoRange,
  ])

  const requestSort = (key: keyof FlatRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'asc'
    ) {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleUpdateField = async (
    row: FlatRow,
    field: 'forma_cobranca' | 'data_combinada' | 'motivo',
    value: any,
  ) => {
    setLocalUpdates((prev) => ({
      ...prev,
      [row.uniqueId]: {
        ...prev[row.uniqueId],
        [field === 'forma_cobranca'
          ? 'formaCobranca'
          : field === 'data_combinada'
            ? 'dataCombinada'
            : 'motivo']: value,
      },
    }))

    // Sync Logic: If setting to MOTOQUEIRO, ensure it's selected in Rota
    if (field === 'forma_cobranca' && value === 'MOTOQUEIRO') {
      if (!selectedItems.has(row.uniqueId)) {
        onToggleItem(row.uniqueId)
      }
    }

    try {
      await cobrancaService.updateReceivableField(
        row.receivableId,
        row.orderId,
        field,
        value,
        row.receivableId < 0 || row.source === 'NEGOTIATION'
          ? {
              valorRegistrado: row.valorRegistrado,
              vencimento: row.vencimento,
              formaPagamento: row.formaPagamento,
            }
          : undefined,
      )
      toast({
        title: 'Atualizado',
        description: 'Dados atualizados com sucesso.',
        duration: 1500,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
    }
  }

  const handleCheckboxChange = (row: FlatRow, checked: boolean) => {
    onToggleItem(row.uniqueId)
    // Sync Logic: If checked, automatically set to MOTOQUEIRO
    if (checked) {
      handleUpdateField(row, 'forma_cobranca', 'MOTOQUEIRO')
    }
  }

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey)
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/50" />
    if (sortConfig.direction === 'asc')
      return <ArrowUp className="h-3 w-3 ml-1 text-primary" />
    return <ArrowDown className="h-3 w-3 ml-1 text-primary" />
  }

  return (
    <>
      <div className="flex flex-col border rounded-md bg-card">
        <div
          ref={topScrollRef}
          onScroll={handleScrollTop}
          className="w-full overflow-x-auto border-b bg-muted/10 h-4"
          style={{ overflowY: 'hidden' }}
        >
          <div style={{ width: scrollWidth, height: '1px' }} />
        </div>

        <Table containerRef={tableContainerRef} onScroll={handleScrollTable}>
          <TableHeader className="bg-background sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="min-w-[120px] bg-background">
                Funcionário
              </TableHead>
              <TableHead className="w-[70px] bg-background">Código</TableHead>
              {!isCobrancaMode && !isSimplified && (
                <TableHead className="w-[90px] bg-background">Tipo</TableHead>
              )}
              <TableHead className="min-w-[150px] bg-background">
                Nome Cliente
              </TableHead>
              {!isCobrancaMode && !isSimplified && (
                <TableHead className="min-w-[150px] bg-background">
                  Endereço
                </TableHead>
              )}
              {!isCobrancaMode && !isSimplified && (
                <TableHead
                  className="min-w-[100px] cursor-pointer hover:bg-muted bg-background"
                  onClick={() => requestSort('neighborhood')}
                >
                  <div className="flex items-center gap-1">
                    Bairro
                    {getSortIcon('neighborhood')}
                  </div>
                </TableHead>
              )}
              {!isSimplified && (
                <TableHead
                  className="min-w-[100px] cursor-pointer hover:bg-muted bg-background"
                  onClick={() => requestSort('city')}
                >
                  <div className="flex items-center gap-1">
                    Município
                    {getSortIcon('city')}
                  </div>
                </TableHead>
              )}
              {!isSimplified && (
                <TableHead
                  className="min-w-[100px] cursor-pointer hover:bg-muted bg-background"
                  onClick={() => requestSort('cep')}
                >
                  <div className="flex items-center gap-1">
                    CEP
                    {getSortIcon('cep')}
                  </div>
                </TableHead>
              )}
              <TableHead className="min-w-[80px] text-center bg-background">
                Contador
              </TableHead>
              {!isCobrancaMode && (
                <TableHead className="w-[80px] bg-background">Pedido</TableHead>
              )}
              <TableHead
                className="bg-background cursor-pointer hover:bg-muted min-w-[100px]"
                onClick={() => requestSort('orderDate')}
              >
                <div className="flex items-center gap-1">
                  Data Acerto
                  {getSortIcon('orderDate')}
                </div>
              </TableHead>
              <TableHead
                className="bg-background cursor-pointer hover:bg-muted"
                onClick={() => requestSort('vencimento')}
              >
                <div className="flex items-center gap-1">
                  Vencimento
                  {getSortIcon('vencimento')}
                </div>
              </TableHead>
              <TableHead className="bg-background min-w-[110px]">
                F. Pagamento
              </TableHead>
              <TableHead className="text-right bg-background">
                Valor Parc.
              </TableHead>
              <TableHead className="text-right bg-background">Pago</TableHead>
              <TableHead className="text-right bg-background">Débito</TableHead>
              <TableHead className="text-center bg-background">
                Status
              </TableHead>
              <TableHead className="min-w-[150px] bg-background">
                Forma Cobrança
              </TableHead>
              <TableHead
                className="min-w-[150px] bg-background cursor-pointer hover:bg-muted"
                onClick={() => requestSort('dataCombinada')}
              >
                <div className="flex items-center gap-1">
                  Data Combinada
                  {getSortIcon('dataCombinada')}
                </div>
              </TableHead>
              <TableHead className="min-w-[150px] bg-background">
                Motivo
              </TableHead>
              <TableHead className="min-w-[150px] bg-background">
                Telefone Cobrança
              </TableHead>
              <TableHead className="min-w-[150px] bg-background">
                Email Cobrança
              </TableHead>
              <TableHead className="min-w-[80px] text-center bg-background">
                Ações
              </TableHead>
              <TableHead
                className="w-[50px] text-center bg-background"
                title="Rota Motoqueiro"
              >
                <div className="flex flex-col items-center gap-1">
                  <span>Rota</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={26}
                  className="h-24 text-center text-muted-foreground"
                >
                  {showOnlySelected
                    ? 'Nenhum item selecionado.'
                    : 'Nenhum registro encontrado.'}
                </TableCell>
              </TableRow>
            ) : (
              flattenedData.map((row) => {
                const isSelected = selectedItems.has(row.uniqueId)
                return (
                  <TableRow
                    key={row.uniqueId}
                    className={cn(
                      'hover:bg-muted/50 transition-colors',
                      isSelected && 'bg-secondary/50 hover:bg-secondary/60',
                    )}
                  >
                    <TableCell
                      className="text-xs text-muted-foreground truncate max-w-[120px]"
                      title={row.employeeName || ''}
                    >
                      {row.employeeName || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {row.clientId}
                    </TableCell>
                    {!isCobrancaMode && !isSimplified && (
                      <TableCell className="text-xs text-muted-foreground">
                        {row.clientType}
                      </TableCell>
                    )}
                    <TableCell className="font-medium text-sm">
                      {row.clientName}
                    </TableCell>
                    {!isCobrancaMode && !isSimplified && (
                      <TableCell
                        className="text-xs text-muted-foreground truncate max-w-[150px]"
                        title={row.address || ''}
                      >
                        {row.address || '-'}
                      </TableCell>
                    )}
                    {!isCobrancaMode && !isSimplified && (
                      <TableCell
                        className="text-xs text-muted-foreground truncate max-w-[100px]"
                        title={row.neighborhood || ''}
                      >
                        {row.neighborhood || '-'}
                      </TableCell>
                    )}
                    {!isSimplified && (
                      <TableCell
                        className="text-xs text-muted-foreground truncate max-w-[100px]"
                        title={row.city || ''}
                      >
                        {row.city || '-'}
                      </TableCell>
                    )}
                    {!isSimplified && (
                      <TableCell
                        className="text-xs text-muted-foreground truncate max-w-[100px]"
                        title={row.cep || ''}
                      >
                        {row.cep || '-'}
                      </TableCell>
                    )}

                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-mono text-[10px] h-5',
                          row.collectionActionCount > 0 &&
                            'bg-blue-50 text-blue-700 border-blue-200',
                        )}
                      >
                        {row.collectionActionCount}
                      </Badge>
                    </TableCell>

                    {!isCobrancaMode && (
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          {row.orderId}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGeneratePdf(row.orderId)
                            }}
                            title="Gerar PDF do Pedido"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-xs">
                      {row.orderDate
                        ? safeFormatDate(row.orderDate, 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.vencimento
                        ? format(parseISO(row.vencimento), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className="truncate max-w-[80px]"
                            title={row.formaPagamento}
                          >
                            {row.formaPagamento}
                          </span>
                          {row.source === 'NEGOTIATION' && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 h-4"
                            >
                              Negoc.
                            </Badge>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"
                              >
                                <Info className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3 text-xs">
                              <h4 className="font-semibold mb-2">
                                Detalhes do Pedido #{row.orderId}
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between border-b pb-1">
                                  <span>Total Pedido (Rota):</span>
                                  <span className="font-bold">
                                    {formatCurrency(row.orderTotal)}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {row.orderPayments.map((p, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between text-muted-foreground"
                                    >
                                      <span>{p.method}</span>
                                      <span>{formatCurrency(p.value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        {row.isConferido && (
                          <span className="text-[10px] text-green-600 font-bold">
                            conferido
                          </span>
                        )}
                        {row.needsConferir && (
                          <span className="text-[10px] text-red-600 font-bold">
                            conferir
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrency(row.valorRegistrado)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-green-600">
                      <div className="flex items-center justify-end gap-1">
                        {formatCurrency(row.valorPago)}
                        {row.paymentHistory &&
                          row.paymentHistory.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 text-green-600 hover:text-green-700"
                                >
                                  <CircleAlert className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3 text-xs">
                                <h4 className="font-semibold mb-2">
                                  Histórico de Pagamentos (Parcela)
                                </h4>
                                <div className="space-y-2">
                                  {row.paymentHistory.map((h, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between items-center border-b pb-1 last:border-0"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {safeFormatDate(h.date, 'dd/MM/yy')}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {h.employee} • {h.method}
                                        </span>
                                      </div>
                                      <span className="font-bold text-green-600">
                                        {formatCurrency(h.value)}
                                      </span>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t flex justify-between font-bold">
                                    <span>Total Pago:</span>
                                    <span>{formatCurrency(row.valorPago)}</span>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-red-600 font-bold">
                      <div className="flex items-center justify-end gap-2">
                        {formatCurrency(row.debito)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          row.status === 'VENCIDO'
                            ? 'destructive'
                            : row.status === 'PAGO'
                              ? 'secondary'
                              : 'outline'
                        }
                        className={cn(
                          'text-[10px] px-2 py-0.5 h-6 whitespace-nowrap capitalize',
                          row.status === 'PAGO' &&
                            'bg-green-100 text-green-700 hover:bg-green-200 border-transparent',
                          row.status === 'A VENCER' &&
                            'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 font-bold',
                        )}
                      >
                        {row.status === 'VENCIDO'
                          ? 'vencido'
                          : row.status === 'A VENCER'
                            ? 'a vencer'
                            : row.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={row.formaCobranca || ''}
                          onValueChange={(val) =>
                            handleUpdateField(
                              row,
                              'forma_cobranca',
                              val === '' || val === 'VAZIO' ? null : val,
                            )
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-full">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VAZIO">VAZIO</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="MOTOQUEIRO">
                              MOTOQUEIRO
                            </SelectItem>
                            <SelectItem value="BOLETO">BOLETO</SelectItem>
                            <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                            <SelectItem value="MENSAGEM">MENSAGEM</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() =>
                            handleUpdateField(row, 'forma_cobranca', null)
                          }
                          title="Limpar Forma de Cobrança"
                        >
                          <Eraser className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          className="h-7 text-xs w-full px-1"
                          value={row.dataCombinada || ''}
                          onChange={(e) =>
                            handleUpdateField(
                              row,
                              'data_combinada',
                              e.target.value || null,
                            )
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() =>
                            handleUpdateField(row, 'data_combinada', null)
                          }
                          title="Limpar Data Combinada"
                        >
                          <Eraser className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.motivo || ''}
                        onValueChange={(val) =>
                          handleUpdateField(
                            row,
                            'motivo',
                            val === '' || val === 'VAZIO' ? null : val,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAZIO">VAZIO</SelectItem>
                          <SelectItem value="Autorizou ida">
                            Autorizou ida
                          </SelectItem>
                          <SelectItem value="Avisou ida">Avisou ida</SelectItem>
                          <SelectItem value="Combinou motoqueiro">
                            Combinou motoqueiro
                          </SelectItem>
                          <SelectItem value="Sem Contato">
                            Sem Contato
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        {row.telefoneCobranca ? (
                          <>
                            <span
                              className="truncate max-w-[100px]"
                              title={row.telefoneCobranca}
                            >
                              {row.telefoneCobranca}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                              onClick={() =>
                                handleWhatsApp(row.telefoneCobranca!)
                              }
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground w-[100px] inline-block">
                            -
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full"
                          onClick={() => setMessageData(row)}
                          title="Mensagem de Cobrança"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-xs truncate max-w-[120px]"
                      title={row.emailCobranca || ''}
                    >
                      {row.emailCobranca || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:bg-blue-100"
                            onClick={() =>
                              handleOpenActions(
                                row.orderId,
                                row.clientId,
                                row.clientName,
                                {
                                  vencimento: row.vencimento,
                                  formaPagamento: row.formaPagamento,
                                },
                              )
                            }
                            title="Registrar Ação de Cobrança"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          {row.collectionActionCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-600 text-[8px] text-white">
                              {row.collectionActionCount}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() =>
                            handleOpenActions(
                              row.orderId,
                              row.clientId,
                              row.clientName,
                              {
                                vencimento: row.vencimento,
                                formaPagamento: row.formaPagamento,
                              },
                            )
                          }
                          title="Ver Histórico"
                        >
                          <MessageSquareText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const originalClient = data.find(
                              (c) => c.clientId === row.clientId,
                            )
                            if (originalClient)
                              handleOpenDetails(originalClient)
                          }}
                          title="Ver Detalhes"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) =>
                          handleCheckboxChange(row, c as boolean)
                        }
                        aria-label={`Selecionar item para rota`}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DebtDetailsDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        client={selectedClient}
      />

      {selectedOrderForActions && (
        <CollectionActionsSheet
          isOpen={!!selectedOrderForActions}
          onClose={() => setSelectedOrderForActions(null)}
          orderId={selectedOrderForActions.orderId}
          clientId={selectedOrderForActions.clientId}
          clientName={selectedOrderForActions.clientName}
          onActionAdded={() => onRefresh && onRefresh()}
          installment={selectedOrderForActions.installment}
        />
      )}

      <CollectionMessageDialog
        isOpen={!!messageData}
        onClose={() => setMessageData(null)}
        data={messageData}
      />
    </>
  )
}
