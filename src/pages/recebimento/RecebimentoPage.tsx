import { useEffect, useState, useMemo } from 'react'
import { recebimentoService } from '@/services/recebimentoService'
import { Button } from '@/components/ui/button'
import { RotateCcw, CheckSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConsolidatedRecebimento } from '@/types/recebimento'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { useAuth } from '@/hooks/use-auth'
import { useUserStore } from '@/stores/useUserStore'
import { RecebimentoFilters } from '@/components/recebimento/RecebimentoFilters'
import { RecebimentoTable } from '@/components/recebimento/RecebimentoTable'
import { DateRange } from 'react-day-picker'
import { useSearchParams } from 'react-router-dom'
import { fechamentoService } from '@/services/fechamentoService'
import { rotaService } from '@/services/rotaService'

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ConsolidatedRecebimento[]>([])
  const [searchParams] = useSearchParams()

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'PENDENTE' | 'PAGO' | 'TODOS'
  >('PENDENTE')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Selection
  // Tracks the ID of the specific INSTALLMENT (RECEBIMENTOS.id), NOT the Order ID anymore
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<
    number | null
  >(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()
  const { employee } = useUserStore()

  useEffect(() => {
    const search = searchParams.get('search')
    const orderId = searchParams.get('orderId')

    if (search) {
      setSearchTerm(search)
    }
    if (orderId) {
      setOrderFilter(orderId)
    }
  }, [searchParams])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await recebimentoService.getConsolidatedRecebimentos({
        search: searchTerm,
        status: statusFilter,
        orderId: orderFilter,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      })
      setItems(data)

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
        description: 'Não foi possível carregar os recebimentos.',
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

  const handleClearFilters = () => {
    setSearchTerm('')
    setOrderFilter('')
    setStatusFilter('PENDENTE')
    setDateRange(undefined)
  }

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedInstallmentId) || null
  }, [items, selectedInstallmentId])

  const handleProcessPayment = async (
    installmentId: number,
    amount: number,
    date: string,
    method: string,
    pixDetails?: { nome: string; banco: string },
  ) => {
    // Re-verify selection
    const target = items.find((i) => i.id === installmentId)
    if (!target) return

    try {
      // 1. Process Integrity Validation
      if (employee) {
        const activeRota = await rotaService.getActiveRota()
        if (activeRota) {
          const closureStatus = await fechamentoService.getClosureStatus(
            activeRota.id,
            employee.id,
          )
          // Strict status check: 'Aberto' or 'Fechado' implies blocked for processing
          if (closureStatus === 'Aberto' || closureStatus === 'Fechado') {
            toast({
              title: 'Ação Bloqueada',
              description:
                'Ações bloqueadas: o caixa para esta rota está fechado ou em processo de fechamento.',
              variant: 'destructive',
            })
            return
          }
        }
      }

      const userName = employee?.nome_completo || user?.email || 'Sistema'

      // We pass the installmentId to link the payment specifically to this installment
      const result = await recebimentoService.processOrderPayment(
        target.venda_id,
        target.cliente_id,
        amount,
        date,
        method,
        pixDetails,
        userName,
        employee?.id,
        installmentId, // New Param
      )

      if (result.syncWarning) {
        toast({
          title: 'Pagamento Registrado',
          description:
            'O pagamento foi salvo, mas houve um atraso na sincronização com o histórico (Sync Delay).',
          className: 'bg-yellow-600 text-white',
        })
      } else {
        toast({
          title: 'Sucesso',
          description: 'Recebimento processado com sucesso.',
          className: 'bg-green-600 text-white',
        })
      }

      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao processar pagamento.',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleGenerateReceipt = async (inst: ConsolidatedRecebimento) => {
    try {
      toast({ title: 'Gerando comprovante...', duration: 2000 })
      const blob = await recebimentoService.generateReceiptPdf(inst)

      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
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
            Gerencie pagamentos e parcelas dos pedidos.
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
            onClear={handleClearFilters}
          />
        </CardHeader>
        <CardContent className="p-0">
          <RecebimentoTable
            loading={loading}
            installments={items}
            selectedVendaId={selectedInstallmentId}
            onSelectVenda={handleSelectInstallment}
            onGenerateReceipt={handleGenerateReceipt}
          />
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        installment={selectedItem}
        onConfirm={handleProcessPayment}
      />
    </div>
  )
}
