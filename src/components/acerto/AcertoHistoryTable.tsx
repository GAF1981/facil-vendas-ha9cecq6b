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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { acertoService } from '@/services/acertoService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileClock,
  Loader2,
  AlertCircle,
  Search,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
    id: number
    method: string
    value: number
    registeredValue?: number
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
}: AcertoHistoryTableProps) {
  const { employee: loggedInUser } = useUserStore()
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [printingId, setPrintingId] = useState<number | null>(null)
  const { toast } = useToast()

  // State for Payment Details Modal
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<
    | {
        id: number
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

  // Reversal State
  const [reversing, setReversing] = useState(false)
  const [reverseConfirmOpen, setReverseConfirmOpen] = useState(false)
  const [paymentToReverse, setPaymentToReverse] = useState<{
    id: number
    value: number
  } | null>(null)

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await bancoDeDadosService.getAcertoHistory(clientId)
      setHistory(data)
      setError(false)
    } catch (err) {
      console.error('Failed to fetch history', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (externalData) {
      setHistory(externalData)
      return
    }

    if (clientId) {
      loadHistory()
    }
  }, [clientId, externalData])

  const handleShowDetails = (order: HistoryRow) => {
    setSelectedPaymentDetails(order.paymentDetails || [])
    setSelectedOrderRef(order.id)
    setDetailsOpen(true)
  }

  const handleReprintOrder = async (order: HistoryRow) => {
    setPrintingId(order.id)
    try {
      const pdfBlob = await acertoService.reprintOrder(
        order.id,
        loggedInUser?.nome_completo,
        '80mm', // Always 80mm for receipt as per User Story
      )
      downloadPdf(pdfBlob, `Recibo_Pedido_${order.id}`)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro no PDF',
        description: 'Não foi possível gerar o pedido.',
        variant: 'destructive',
      })
    } finally {
      setPrintingId(null)
    }
  }

  const downloadPdf = (blob: Blob, filenamePrefix: string) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const timestamp = format(new Date(), 'yyyyMMdd_HHmm')
    a.download = `${filenamePrefix}_${timestamp}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    window.open(url, '_blank')
  }

  const handleReverseClick = (payment: { id: number; value: number }) => {
    setPaymentToReverse(payment)
    setReverseConfirmOpen(true)
  }

  const confirmReverse = async () => {
    if (!paymentToReverse || !selectedOrderRef || !loggedInUser || !clientId) {
      return
    }

    setReversing(true)
    try {
      await acertoService.reversePayment(
        paymentToReverse.id,
        selectedOrderRef,
        loggedInUser.id,
        loggedInUser.nome_completo,
      )

      toast({
        title: 'Estorno Realizado',
        description:
          'O pagamento foi estornado e o débito reaberto para cobrança.',
        className: 'bg-green-600 text-white',
      })

      setDetailsOpen(false)
      setReverseConfirmOpen(false)
      setPaymentToReverse(null)
      loadHistory() // Refresh history to show updated values
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao Estornar',
        description: 'Não foi possível realizar o estorno. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setReversing(false)
    }
  }

  // Permission Check
  const canReverse =
    loggedInUser &&
    (Array.isArray(loggedInUser.setor)
      ? loggedInUser.setor.some((s) =>
          ['Financeiro', 'Administrador', 'Gerente', 'Administrativo'].includes(
            s,
          ),
        )
      : ['Financeiro', 'Administrador', 'Gerente', 'Administrativo'].includes(
          loggedInUser.setor || '',
        ))

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
                    <TableHead className="text-right text-blue-600 font-semibold bg-blue-50/50">
                      Saldo a Pagar
                    </TableHead>
                    <TableHead className="text-right text-green-600 font-semibold bg-green-50/50">
                      Valor Pago
                    </TableHead>
                    <TableHead className="text-right text-red-600 font-semibold">
                      Débito
                    </TableHead>
                    <TableHead className="text-center w-[100px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum histórico encontrado para este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((row) => {
                      // Per Acceptance Criteria and Screenshot visual fidelity:
                      // "Saldo a Pagar" here represents the gap between Sales and Payment in the context of the table view
                      const saldoAPagarDisplay =
                        row.valorVendaTotal - row.valorPago

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
                            R$ {formatCurrency(saldoAPagarDisplay)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-green-600 bg-green-50/30 p-2">
                            <div className="flex items-center justify-end gap-2">
                              <span>R$ {formatCurrency(row.valorPago)}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-700 hover:text-green-800 hover:bg-green-200"
                                onClick={() => handleShowDetails(row)}
                                title="Ver detalhes"
                              >
                                <Search className="h-3.5 w-3.5" />
                              </Button>
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
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleShowDetails(row)}
                                title="Ver Detalhes"
                              >
                                <Search className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleReprintOrder(row)}
                                disabled={printingId === row.id}
                                title="Gerar PDF"
                              >
                                {printingId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 text-green-600 hover:text-green-800" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
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
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">V. Registrado</TableHead>
                    <TableHead className="text-right text-green-700">
                      V. Pago
                    </TableHead>
                    {canReverse && (
                      <TableHead className="w-[80px] text-center">
                        Ação
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedPaymentDetails ||
                  selectedPaymentDetails.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canReverse ? 7 : 6}
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
                                'dd/MM/yyyy HH:mm',
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
                        {canReverse && (
                          <TableCell className="text-center">
                            {detail.value > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  handleReverseClick({
                                    id: detail.id,
                                    value: detail.value,
                                  })
                                }
                                title="Estornar Pagamento"
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Estornar
                              </Button>
                            )}
                          </TableCell>
                        )}
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

      <AlertDialog
        open={reverseConfirmOpen}
        onOpenChange={setReverseConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Confirmar Estorno
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a estornar um pagamento de{' '}
              <span className="font-bold text-foreground">
                R$ {formatCurrency(paymentToReverse?.value || 0)}
              </span>
              .
            </AlertDialogDescription>
            <AlertDialogDescription>
              Isso irá anular o pagamento e reabrir a dívida para o cliente na
              Central de Cobrança. Esta ação será registrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReverse}
              disabled={reversing}
              className="bg-red-600 hover:bg-red-700"
            >
              {reversing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Confirmar Estorno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
