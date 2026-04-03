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

import { DividaManualAcoesSheet } from '@/components/dividas/DividaManualAcoesSheet'
import { DividaManual } from '@/types/divida-manual'
import { supabase } from '@/lib/supabase/client'

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
  isDividaManual?: boolean
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
    isDividaManual?: boolean
  }>({
    open: false,
    orderId: '',
    clientId: 0,
    clientName: '',
    receivableId: 0,
    isDividaManual: false,
  })

  const [actionsDebt, setActionsDebt] = useState<DividaManual | null>(null)

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
                isDividaManual: false,
              })
            }
          })
        })
      })

      // Fetch Dividas Manuais marked for Rota Motoqueiro
      const { data: dividas } = await supabase
        .from('dividas_manuais')
        .select('*, CLIENTES(*)')
        .eq('rota_motoqueiro', true)

      if (dividas) {
        dividas.forEach((d: any) => {
          const debito = Math.max(0, d.valor_parcela - d.valor_pago)
          if (debito > 0.05) {
            motoqueiroItems.push({
              uniqueId: `divida-${d.id}`,
              clientId: d.cliente_id,
              clientName:
                d.CLIENTES?.['NOME CLIENTE'] || 'Cliente não encontrado',
              orderId: d.cobranca_seq,
              vencimento: d.vencimento,
              valorParc: d.valor_parcela,
              pago: d.valor_pago,
              debito: debito,
              dataCombinada: d.data_combinada,
              status:
                debito > 0 && new Date(d.vencimento) < new Date()
                  ? 'vencido'
                  : 'a vencer',
              address: d.CLIENTES?.ENDEREÇO || null,
              neighborhood: d.CLIENTES?.BAIRRO || null,
              city: d.CLIENTES?.MUNICÍPIO || null,
              phone: d.CLIENTES?.['FONE 1'] || null,
              telefone_cobranca: d.CLIENTES?.telefone_cobranca || null,
              email_cobranca: d.CLIENTES?.email_cobranca || null,
              clientStatus: d.CLIENTES?.situacao || null,
              motivo: d.motivo || null,
              receivableId: d.id,
              paymentHistory: [],
              isDividaManual: true,
            })
          }
        })
      }

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

  const handleAction = async (item: MotoqueiroItem, showForm: boolean) => {
    if (item.isDividaManual) {
      const { data } = await supabase
        .from('dividas_manuais')
        .select('*, CLIENTES(*)')
        .eq('id', item.receivableId)
        .single()
      if (data) {
        setActionsDebt(data as DividaManual)
      }
    } else {
      setActionSheet({
        open: true,
        orderId: item.orderId.toString(),
        clientId: item.clientId,
        clientName: item.clientName,
        showForm,
      })
    }
  }

  const handleRegisterReceipt = (item: MotoqueiroItem) => {
    setReceiptDialog({
      open: true,
      orderId: item.orderId.toString(),
      clientId: item.clientId,
      clientName: item.clientName,
      receivableId: item.receivableId,
      isDividaManual: !!item.isDividaManual,
    })
  }

  const handleUnmark = async (item: MotoqueiroItem) => {
    const text = item.isDividaManual ? 'dívida' : `pedido #${item.orderId}`
    if (!confirm(`Deseja retirar a ${text} da rota do motoqueiro?`)) {
      return
    }

    try {
      if (item.isDividaManual) {
        await supabase
          .from('dividas_manuais')
          .update({ rota_motoqueiro: false })
          .eq('id', item.receivableId)
      } else {
        await cobrancaService.updateReceivableField(
          item.receivableId,
          item.orderId,
          'forma_cobranca',
          null,
        )
      }
      toast({
        title: 'Removido',
        description: `${item.isDividaManual ? 'Dívida' : 'Pedido'} retirado da rota com sucesso.`,
      })
      await fetchData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao retirar da rota.',
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
      if (receiptDialog.isDividaManual) {
        const { data: debt } = await supabase
          .from('dividas_manuais')
          .select('*')
          .eq('id', receiptDialog.receivableId)
          .single()

        if (debt) {
          const newPago = Number(debt.valor_pago) + amount
          await supabase
            .from('dividas_manuais')
            .update({ valor_pago: newPago })
            .eq('id', debt.id)

          await supabase.from('dividas_manuais_acoes').insert({
            divida_id: debt.id,
            funcionario_id: employee.id,
            acao: `Pagamento recebido (Motoqueiro): R$ ${amount} via ${method}`,
            data_acao: new Date().toISOString(),
          })
        }
      } else {
        await cobrancaService.registerReceipt({
          orderId: Number(receiptDialog.orderId),
          clientId: receiptDialog.clientId,
          employeeId: employee.id,
          value: amount,
          method,
          date,
          receivableId: receiptDialog.receivableId,
        })
      }

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

      {actionsDebt && (
        <DividaManualAcoesSheet
          open={!!actionsDebt}
          onOpenChange={(op) => !op && setActionsDebt(null)}
          debt={actionsDebt}
        />
      )}
    </div>
  )
}
