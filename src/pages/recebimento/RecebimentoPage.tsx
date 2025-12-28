import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { ClientRow } from '@/types/client'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { recebimentoService } from '@/services/recebimentoService'
import { ArrowDownCircle, Save, Loader2 } from 'lucide-react'
import { PaymentEntry } from '@/types/payment'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

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
  const [historyData, setHistoryData] = useState<any[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch data when client changes
  useEffect(() => {
    if (client) {
      setLoadingHistory(true)

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
      bancoDeDadosService
        .getAcertoHistory(client.CODIGO)
        .then((data) => {
          setHistoryData(data)
          // Calculate Total Debt (Sum of all positive debts + negative credits)
          const debt = data.reduce((acc, row) => acc + row.debito, 0)
          setTotalDebt(Math.max(0, debt)) // Ensure not negative display? Or show negative as credit?
          // Usually "Saldo a Pagar" is debt. If negative, it's credit.
          // Let's keep the raw value, but PaymentSummary expects positive usually.
          // If total debt is negative (client has credit), user might still want to add payment? Unlikely.
          // But user might want to register a negative payment (refund)? No, payment entry doesn't support negative.
          // Let's stick to simple debt.
          setTotalDebt(debt)
        })
        .catch((err) => console.error('Error fetching history', err))
        .finally(() => setLoadingHistory(false))
    } else {
      setMonthlyAverage(0)
      setLastAcerto(null)
      setHistoryData([])
      setTotalDebt(0)
      setPayments([])
    }
  }, [client])

  const handleClientSelect = (selected: ClientRow) => {
    setClient(selected)
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
      await recebimentoService.saveRecebimento(client, employee, payments)

      toast({
        title: 'Recebimento salvo',
        description: 'Pagamento registrado com sucesso.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      // Refresh history and clear payments
      setPayments([])
      setLoadingHistory(true)
      bancoDeDadosService
        .getAcertoHistory(client.CODIGO)
        .then((data) => {
          setHistoryData(data)
          const debt = data.reduce((acc, row) => acc + row.debito, 0)
          setTotalDebt(debt)
        })
        .finally(() => setLoadingHistory(false))
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

            {/* Payment Section - Reusing AcertoPaymentSummary */}
            <div className="space-y-4">
              <AcertoPaymentSummary
                saldoAPagar={totalDebt}
                payments={payments}
                onPaymentsChange={setPayments}
                disabled={saving}
              />

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={handleSaveRecebimento}
                  disabled={saving || payments.length === 0}
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
              <AcertoHistoryTable
                clientId={client.CODIGO}
                monthlyAverage={monthlyAverage}
                data={historyData} // Pass pre-fetched data
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
