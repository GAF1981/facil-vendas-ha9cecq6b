import { useEffect, useState, useMemo } from 'react'
import { recebimentoService } from '@/services/recebimentoService'
import { Button } from '@/components/ui/button'
import { RotateCcw, CheckSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecebimentoInstallment } from '@/types/recebimento'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { useAuth } from '@/hooks/use-auth'
import { RecebimentoFilters } from '@/components/recebimento/RecebimentoFilters'
import { RecebimentoTable } from '@/components/recebimento/RecebimentoTable'
import { DateRange } from 'react-day-picker'

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [installments, setInstallments] = useState<RecebimentoInstallment[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'PENDENTE' | 'PAGO' | 'TODOS'
  >('PENDENTE')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Selection
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<
    number | null
  >(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await recebimentoService.getInstallments({
        search: searchTerm,
        status: statusFilter,
        orderId: orderFilter,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      })
      setInstallments(data)

      if (
        selectedInstallmentId &&
        !data.find((i) => i.id === selectedInstallmentId)
      ) {
        setSelectedInstallmentId(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as parcelas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, orderFilter, dateRange])

  const handleSelectInstallment = (id: number) => {
    if (selectedInstallmentId === id) {
      setSelectedInstallmentId(null)
    } else {
      setSelectedInstallmentId(id)
    }
  }

  const selectedInstallment = useMemo(() => {
    return installments.find((i) => i.id === selectedInstallmentId) || null
  }, [installments, selectedInstallmentId])

  const handleProcessPayment = async (
    id: number,
    amount: number,
    date: string,
    method: string,
    pixDetails?: { nome: string; banco: string },
  ) => {
    if (!selectedInstallment || !user) return

    try {
      const result = await recebimentoService.processInstallmentPayment(
        id,
        amount,
        date,
        method,
        selectedInstallment.venda_id,
        pixDetails,
        user.email || 'Usuário',
      )

      if (result.syncWarning) {
        toast({
          title: 'Pagamento Registrado',
          description:
            'O pagamento foi salvo, mas houve um atraso na sincronização com o histórico de débitos (Sync Delay).',
          className: 'bg-yellow-600 text-white',
        })
      } else {
        toast({
          title: 'Sucesso',
          description: 'Pagamento processado e débito atualizado com sucesso.',
          className: 'bg-green-600 text-white',
        })
      }

      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao processar pagamento. Verifique a conexão.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleGenerateReceipt = async (inst: RecebimentoInstallment) => {
    try {
      toast({ title: 'Gerando comprovante...', duration: 2000 })
      const blob = await recebimentoService.generateReceiptPdf(inst)

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `Recibo_${inst.id}_${inst.cliente_nome}.pdf`,
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o comprovante.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie parcelas, pagamentos e emita comprovantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RotateCcw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!selectedInstallmentId}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Processar Pagamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <RecebimentoFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            orderFilter={orderFilter}
            onOrderFilterChange={setOrderFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={(v) => setStatusFilter(v as any)}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </CardHeader>
        <CardContent className="p-0">
          <RecebimentoTable
            loading={loading}
            installments={installments}
            selectedInstallmentId={selectedInstallmentId}
            onSelectInstallment={handleSelectInstallment}
            onGenerateReceipt={handleGenerateReceipt}
          />
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        installment={selectedInstallment}
        onConfirm={handleProcessPayment}
      />
    </div>
  )
}
