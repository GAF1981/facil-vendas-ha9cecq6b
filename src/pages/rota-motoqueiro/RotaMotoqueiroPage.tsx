import { useState, useEffect } from 'react'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt, PaymentHistoryDetail } from '@/types/cobranca'
import { Loader2, Bike, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RotaMotoqueiroCardItem } from '@/components/rota-motoqueiro/RotaMotoqueiroCardItem'
import { CollectionActionsSheet } from '@/components/cobranca/CollectionActionsSheet'
import { MotoqueiroReceiptDialog } from '@/components/rota-motoqueiro/MotoqueiroReceiptDialog'
import { KmManagementSection } from '@/components/rota-motoqueiro/KmManagementSection'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/useUserStore'

interface MotoqueiroItem {
  uniqueId: string
  clientId: number
  clientName: string
  orderId: number
  vencimento: string | null
  valorParc: number
  pago: number
  debito: number
  dataCombinada: string | null
  status: string
  address: string | null
  neighborhood: string | null
  city: string | null
  phone: string | null
  telefone_cobranca?: string | null
  email_cobranca?: string | null
  clientStatus?: string | null
  motivo?: string | null
  receivableId: number
  paymentHistory?: PaymentHistoryDetail[]
}

export default function RotaMotoqueiroPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MotoqueiroItem[]>([])
  const [filteredItems, setFilteredItems] = useState<MotoqueiroItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const { employee } = useUserStore()

  const [actionSheet, setActionSheet] = useState<{
    open: boolean
    orderId: string
    clientId: number
    clientName: string
    showForm: boolean
  }>({
    open: false,
    orderId: '',
    clientId: 0,
    clientName: '',
    showForm: false,
  })

  const [receiptDialog, setReceiptDialog] = useState<{
    open: boolean
    orderId: string
    clientId: number
    clientName: string
    receivableId: number
  }>({
    open: false,
    orderId: '',
    clientId: 0,
    clientName: '',
    receivableId: 0,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const allDebts = await cobrancaService.getDebts()
      const motoqueiroItems: MotoqueiroItem[] = []

      allDebts.forEach((client: ClientDebt) => {
        client.orders.forEach((order) => {
          order.installments.forEach((inst, idx) => {
            const fc = inst.formaCobranca?.toUpperCase()
            const debito = Math.max(0, inst.valorRegistrado - inst.valorPago)

            if (fc === 'MOTOQUEIRO' && debito > 0.05) {
              const uniqueId = `${client.clientId}-${order.orderId}-${inst.id || idx}`
              motoqueiroItems.push({
                uniqueId,
                clientId: client.clientId,
                clientName: client.clientName,
                orderId: order.orderId,
                vencimento: inst.vencimento,
                valorParc: inst.valorRegistrado,
                pago: inst.valorPago,
                debito: debito,
                dataCombinada: inst.dataCombinada,
                status: inst.status,
                address: client.address,
                neighborhood: client.neighborhood,
                city: client.city,
                phone: client.phone,
                telefone_cobranca: client.telefone_cobranca,
                email_cobranca: client.email_cobranca,
                clientStatus: client.situacao,
                motivo: inst.motivo || null,
                receivableId: inst.id,
                paymentHistory: inst.paymentHistory || [],
              })
            }
          })
        })
      })

      motoqueiroItems.sort((a, b) => {
        const dateA = a.dataCombinada || a.vencimento || '9999-99-99'
        const dateB = b.dataCombinada || b.vencimento || '9999-99-99'
        return dateA.localeCompare(dateB)
      })

      setItems(motoqueiroItems)
      setFilteredItems(motoqueiroItems)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a rota do motoqueiro.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const lower = searchTerm.toLowerCase()
    const filtered = items.filter(
      (item) =>
        item.clientName.toLowerCase().includes(lower) ||
        item.clientId.toString().includes(lower) ||
        item.orderId.toString().includes(lower),
    )
    setFilteredItems(filtered)
  }, [searchTerm, items])

  const handleAction = (item: MotoqueiroItem, showForm: boolean) => {
    setActionSheet({
      open: true,
      orderId: item.orderId.toString(),
      clientId: item.clientId,
      clientName: item.clientName,
      showForm,
    })
  }

  const handleRegisterReceipt = (item: MotoqueiroItem) => {
    setReceiptDialog({
      open: true,
      orderId: item.orderId.toString(),
      clientId: item.clientId,
      clientName: item.clientName,
      receivableId: item.receivableId,
    })
  }

  const handleUnmark = async (item: MotoqueiroItem) => {
    if (
      !confirm(
        `Deseja retirar o pedido #${item.orderId} da rota do motoqueiro?`,
      )
    ) {
      return
    }

    try {
      await cobrancaService.updateReceivableField(
        item.receivableId,
        item.orderId,
        'forma_cobranca',
        null,
      )
      toast({
        title: 'Removido',
        description: 'Pedido retirado da rota com sucesso.',
      })
      await fetchData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao retirar o pedido da rota.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmReceipt = async (
    amount: number,
    method: string,
    date: string,
  ) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Funcionário não identificado.',
        variant: 'destructive',
      })
      return
    }

    try {
      await cobrancaService.registerReceipt({
        orderId: Number(receiptDialog.orderId),
        clientId: receiptDialog.clientId,
        employeeId: employee.id,
        value: amount,
        method,
        date,
        receivableId: receiptDialog.receivableId,
      })

      toast({
        title: 'Sucesso',
        description: 'Recebimento registrado. Atualizando lista...',
        className: 'bg-green-600 text-white',
      })

      await fetchData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar recebimento.',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-24 md:pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Bike className="h-6 w-6 text-primary" />
                Rota Motoqueiro
              </h1>
              <p className="text-sm text-muted-foreground">
                Lista de cobranças designadas.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={cn('h-5 w-5', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="relative">
          <Input
            placeholder="Buscar por cliente, código ou pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando rota...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center border-2 border-dashed rounded-lg bg-muted/10">
          <div className="p-4 bg-muted rounded-full">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Nenhum item encontrado</h3>
            <p className="text-muted-foreground max-w-xs">
              Não há registros de cobrança para motoqueiro com os filtros
              atuais.
            </p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            Tentar Novamente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <RotaMotoqueiroCardItem
              key={item.uniqueId}
              item={item}
              onConsult={() => handleAction(item, false)}
              onRegisterAction={() => handleAction(item, true)}
              onRegisterReceipt={() => handleRegisterReceipt(item)}
              onUnmark={() => handleUnmark(item)}
            />
          ))}
        </div>
      )}

      <KmManagementSection />

      <CollectionActionsSheet
        isOpen={actionSheet.open}
        onClose={() => setActionSheet((prev) => ({ ...prev, open: false }))}
        orderId={actionSheet.orderId}
        clientId={actionSheet.clientId}
        clientName={actionSheet.clientName}
        defaultShowForm={actionSheet.showForm}
        onActionAdded={fetchData}
      />

      <MotoqueiroReceiptDialog
        open={receiptDialog.open}
        onClose={() => setReceiptDialog((prev) => ({ ...prev, open: false }))}
        orderId={receiptDialog.orderId}
        clientId={receiptDialog.clientId}
        clientName={receiptDialog.clientName}
        onConfirm={handleConfirmReceipt}
      />
    </div>
  )
}
