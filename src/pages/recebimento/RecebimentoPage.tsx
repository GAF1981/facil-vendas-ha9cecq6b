import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import {
  AcertoHistoryTable,
  HistoryRow,
} from '@/components/acerto/AcertoHistoryTable'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { ClientRow } from '@/types/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { recebimentoService } from '@/services/recebimentoService'
import { acertoService } from '@/services/acertoService'
import { ArrowDownCircle, Save, Loader2, AlertCircle } from 'lucide-react'
import { PaymentEntry } from '@/types/payment'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default function RecebimentoPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()

  const [client, setClient] = useState<ClientRow | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState(0)
  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)
  const [loadingLastAcerto, setLoadingLastAcerto] = useState(false)

  // Payment State
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [historyData, setHistoryData] = useState<HistoryRow[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)

  // Selected Order State
  const [selectedOrder, setSelectedOrder] = useState<HistoryRow | null>(null)

  // Fetch data when client changes
  useEffect(() => {
    if (client) {
      setLoadingHistory(true)
      setSelectedOrder(null)

      // 1. Fetch Monthly Average
      bancoDeDadosService
        .getMonthlyAverage(client.CODIGO)
        .then((avg) => setMonthlyAverage(avg))
        .catch((err) => console.error('Error fetching monthly average', err))

      // 2. Fetch Last Acerto for ClientDetails
      setLoadingLastAcerto(true)
      bancoDeDadosService
        .getLastAcerto(client.CODIGO)
        .then((data) => setLastAcerto(data))
        .catch((err) => console.error('Error fetching last acerto', err))
        .finally(() => setLoadingLastAcerto(false))

      // 3. Fetch History to calculate Total Debt
      fetchHistory()
    } else {
      setMonthlyAverage(0)
      setLastAcerto(null)
      setHistoryData([])
      setTotalDebt(0)
      setPayments([])
      setSelectedOrder(null)
    }
  }, [client])

  const fetchHistory = () => {
    if (!client) return
    bancoDeDadosService
      .getAcertoHistory(client.CODIGO)
      .then((data) => {
        setHistoryData(data)
        // Calculate Total Debt (Sum of all positive debts)
        const debt = data.reduce((acc, row) => acc + row.debito, 0)
        setTotalDebt(debt)
      })
      .catch((err) => console.error('Error fetching history', err))
      .finally(() => setLoadingHistory(false))
  }

  const handleClientSelect = (selected: ClientRow) => {
    setClient(selected)
  }

  const handleOrderSelect = (order: HistoryRow | null) => {
    setSelectedOrder(order)
    if (order) {
      if (order.debito > 0) {
        const today = new Date()
        const dueDate = format(today, 'yyyy-MM-dd')
        const newEntry: PaymentEntry = {
          method: 'Dinheiro',
          value: order.debito,
          paidValue: order.debito,
          installments: 1,
          dueDate: dueDate,
        }
        setPayments([newEntry])
      } else {
        setPayments([])
      }
    } else {
      const debt = historyData.reduce((acc, row) => acc + row.debito, 0)
      setTotalDebt(debt)
      setPayments([])
    }
  }

  const handleSaveRecebimento = async () => {
    if (!client || !employee) {
      toast({
        title: 'Dados inválidos',
        description: 'Cliente ou funcionário não identificado.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedOrder) {
      toast({
        title: 'Pedido não selecionado',
        description:
          'Por favor, selecione um pedido no histórico abaixo para realizar o pagamento.',
        variant: 'destructive',
      })
      return
    }

    if (payments.length === 0) {
      toast({
        title: 'Pagamento vazio',
        description: 'Adicione pelo menos uma forma de pagamento.',
        variant: 'destructive',
      })
      return
    }

    const totalPaid = payments.reduce((acc, p) => acc + p.paidValue, 0)
    if (totalPaid <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'O valor pago deve ser maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await recebimentoService.saveRecebimento(
        client,
        employee,
        payments,
        selectedOrder.id,
      )

      // Generate Receipt PDF
      try {
        const now = new Date()
        const pdfData = {
          client,
          employee, // This is the vendedor associated with the transaction (passed to saveRecebimento)
          date: now.toISOString(),
          acertoTipo: 'Recebimento',
          totalVendido: selectedOrder.valorVendaTotal,
          valorDesconto: 0,
          valorAcerto: selectedOrder.saldoAPagar,
          valorPago: totalPaid,
          debito: Math.max(0, selectedOrder.debito - totalPaid),
          payments,
          history: historyData.slice(0, 12),
          monthlyAverage,
          orderNumber: selectedOrder.id,
          isReceipt: true,
          issuerName: employee.nome_completo, // Current user as issuer
        }

        const pdfBlob = await acertoService.generatePdf(pdfData, {
          preview: false,
        })

        const url = window.URL.createObjectURL(pdfBlob)
        // Automatically open in new tab instead of download
        window.open(url, '_blank')

        // Clean up URL object after a short delay to ensure it opened
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
        }, 1000)
      } catch (pdfError) {
        console.error('Error generating receipt:', pdfError)
        toast({
          title: 'Erro ao gerar Recibo',
          description:
            'O pagamento foi salvo, mas o recibo não pôde ser gerado.',
          variant: 'destructive',
        })
      }

      toast({
        title: 'Recebimento salvo',
        description: `Pagamento registrado para o pedido #${selectedOrder.id}.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      setPayments([])
      setSelectedOrder(null)
      setLoadingHistory(true)
      fetchHistory()
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description:
          error.message || 'Não foi possível registrar o recebimento.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const currentDebt = selectedOrder ? selectedOrder.debito : totalDebt

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-24 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
          <ArrowDownCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recebimentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos e consulte o histórico financeiro.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientSearch onSelect={handleClientSelect} disabled={saving} />
          </CardContent>
        </Card>

        {client && (
          <div className="space-y-6 animate-fade-in-up">
            <ClientDetails
              client={client}
              lastAcerto={lastAcerto}
              loading={loadingLastAcerto}
            />

            <div className="space-y-4">
              {selectedOrder ? (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md flex items-center justify-between animate-fade-in">
                  <span className="font-medium">
                    Pagando Pedido Selecionado:{' '}
                    <strong>#{selectedOrder.id}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOrderSelect(null)}
                    className="text-blue-800 hover:text-blue-900 hover:bg-blue-100"
                  >
                    Cancelar Seleção
                  </Button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">
                    Selecione um pedido no histórico abaixo para habilitar o
                    pagamento.
                  </span>
                </div>
              )}

              <AcertoPaymentSummary
                saldoAPagar={currentDebt}
                payments={payments}
                onPaymentsChange={setPayments}
                disabled={saving || !selectedOrder}
              />

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={handleSaveRecebimento}
                  disabled={saving || payments.length === 0 || !selectedOrder}
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Confirmar Recebimento
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Histórico de Pedidos</h3>
                <span className="text-sm text-muted-foreground">
                  Selecione um pedido para pagar individualmente
                </span>
              </div>
              <AcertoHistoryTable
                clientId={client.CODIGO}
                monthlyAverage={monthlyAverage}
                data={historyData}
                onSelectOrder={handleOrderSelect}
                selectedOrderId={selectedOrder?.id}
                hideHeader
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
