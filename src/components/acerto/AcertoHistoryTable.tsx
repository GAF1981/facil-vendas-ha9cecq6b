import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileClock, Loader2, AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HistoryRow {
  id: number
  data: string
  hora: string
  vendedor: string
  valorVendaTotal: number
  saldoAPagar: number
  valorPago: number
  debito: number
  mediaMensal: number | null
  methods?: string
  paymentDetails?: {
    method: string
    value: number // This is 'Valor Pago'
    registeredValue?: number // This is 'Valor Registrado'
    date?: string
    employeeName?: string
    createdAt?: string
  }[]
}

interface AcertoHistoryTableProps {
  clientId: number
  monthlyAverage?: number
  hideHeader?: boolean
  className?: string
  data?: HistoryRow[]
  onSelectOrder?: (order: HistoryRow | null) => void
  selectedOrderId?: number | null
}

export function AcertoHistoryTable({
  clientId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  monthlyAverage,
  hideHeader = false,
  className,
  data: externalData,
  onSelectOrder,
  selectedOrderId,
}: AcertoHistoryTableProps) {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // State for Payment Details Modal
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<
    | {
        method: string
        value: number
        registeredValue?: number
        date?: string
        employeeName?: string
        createdAt?: string
      }[]
    | null
  >(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrderRef, setSelectedOrderRef] = useState<number | null>(null)

  useEffect(() => {
    // If external data is provided, use it and skip fetch
    if (externalData) {
      setHistory(externalData)
      return
    }

    let mounted = true
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const data = await bancoDeDadosService.getAcertoHistory(clientId)
        if (mounted) {
          setHistory(data)
          setError(false)
        }
      } catch (err) {
        console.error('Failed to fetch history', err)
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (clientId) {
      fetchHistory()
    }

    return () => {
      mounted = false
    }
  }, [clientId, externalData])

  const handleCheckboxChange = (order: HistoryRow, checked: boolean) => {
    if (onSelectOrder) {
      if (checked) {
        onSelectOrder(order)
      } else {
        onSelectOrder(null)
      }
    }
  }

  const handleShowDetails = (order: HistoryRow) => {
    setSelectedPaymentDetails(order.paymentDetails || [])
    setSelectedOrderRef(order.id)
    setDetailsOpen(true)
  }

  // Check if any order is currently selected
  const isAnyOrderSelected =
    selectedOrderId !== null && selectedOrderId !== undefined

  if (loading && !externalData) {
    return (
      <Card
        className={cn(
          'border-muted bg-white dark:bg-card shadow-sm h-[300px] flex items-center justify-center',
          className,
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    )
  }

  return (
    <>
      <Card
        className={cn(
          'border-muted bg-white dark:bg-card shadow-sm',
          className,
        )}
      >
        {!hideHeader && (
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileClock className="h-5 w-5 text-primary" />
              Resumo de Acertos (Histórico)
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn('p-6', hideHeader && 'pt-6')}>
          {error ? (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <p>Erro ao carregar o histórico de acertos.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">Pedido</TableHead>
                    <TableHead>Data do Acerto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Média Mensal</TableHead>
                    <TableHead className="text-right">Valor da Venda</TableHead>
                    <TableHead className="text-right text-blue-600">
                      Saldo a Pagar
                    </TableHead>
                    <TableHead className="text-right text-green-600">
                      Valor Pago
                    </TableHead>
                    <TableHead className="text-right text-red-600">
                      Débito
                    </TableHead>
                    {onSelectOrder && (
                      <TableHead className="w-[50px]"></TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={onSelectOrder ? 9 : 8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum histórico encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((row) => {
                      // Logic for checkbox visibility
                      const isSelected = selectedOrderId === row.id
                      const hasDebt = row.debito > 0.005 // Use epsilon for float comparison to ensure strict > 0.00

                      // Show checkbox if:
                      // 1. It is the selected row (so it can be deselected)
                      // 2. OR (No row is selected AND it has debt)
                      const showCheckbox =
                        isSelected || (!isAnyOrderSelected && hasDebt)

                      return (
                        <TableRow key={row.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-medium text-xs text-muted-foreground">
                            #{row.id}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>
                                {row.data
                                  ? format(parseISO(row.data), 'dd/MM/yyyy', {
                                      locale: ptBR,
                                    })
                                  : '-'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {row.hora
                                  ? row.hora.split(':').slice(0, 2).join(':')
                                  : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{row.vendedor || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {row.mediaMensal !== null
                              ? `R$ ${formatCurrency(row.mediaMensal)}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {formatCurrency(row.valorVendaTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-blue-600 bg-blue-50/30">
                            R$ {formatCurrency(row.saldoAPagar)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-green-600 bg-green-50/30 p-2">
                            <div className="flex items-center justify-end gap-2">
                              <span>R$ {formatCurrency(row.valorPago)}</span>
                              {/* Always show details button if there are payment details, even if paid is 0 (installments) */}
                              {row.paymentDetails &&
                                row.paymentDetails.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-green-700 hover:text-green-800 hover:bg-green-200"
                                    onClick={() => handleShowDetails(row)}
                                    title="Ver detalhes do pagamento"
                                  >
                                    <Search className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-mono font-medium',
                              row.debito > 0.01
                                ? 'text-red-600'
                                : row.debito < -0.01
                                  ? 'text-green-600'
                                  : 'text-gray-400',
                            )}
                          >
                            R$ {formatCurrency(row.debito)}
                          </TableCell>
                          {onSelectOrder && (
                            <TableCell>
                              {showCheckbox && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(c) =>
                                    handleCheckboxChange(row, c as boolean)
                                  }
                                  aria-label={`Selecionar pedido ${row.id}`}
                                />
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
              <span>Pedido #{selectedOrderRef}</span>
              <span>
                Total Pago:{' '}
                <span className="font-bold text-green-600">
                  R${' '}
                  {formatCurrency(
                    selectedPaymentDetails?.reduce(
                      (acc, curr) => acc + curr.value,
                      0,
                    ) || 0,
                  )}
                </span>
              </span>
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Método</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Recebido por</TableHead>
                    <TableHead>Data/Hora Recebimento</TableHead>
                    <TableHead className="text-right">V. Registrado</TableHead>
                    <TableHead className="text-right text-green-700">
                      V. Pago
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedPaymentDetails ||
                  selectedPaymentDetails.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        Nenhum detalhe encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedPaymentDetails.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {detail.method}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {detail.date
                            ? format(parseISO(detail.date), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>{detail.employeeName || '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {detail.createdAt
                            ? format(
                                parseISO(detail.createdAt),
                                'dd/MM/yyyy HH:mm:ss',
                              )
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {detail.registeredValue !== undefined
                            ? `R$ ${formatCurrency(detail.registeredValue)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-green-700">
                          R$ {formatCurrency(detail.value)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
