import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoTable } from '@/components/acerto/AcertoTable'
import { AcertoStockSummary } from '@/components/acerto/AcertoStockSummary'
import { AcertoSalesSummary } from '@/components/acerto/AcertoSalesSummary'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { AcertoFiscalSection } from '@/components/acerto/AcertoFiscalSection'
import { SignatureModal } from '@/components/acerto/SignatureModal'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { ProductSelector } from '@/components/acerto/ProductSelector' // Imported
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { AcertoItem } from '@/types/acerto'
import { PaymentEntry } from '@/types/payment'
import { ProductRow } from '@/types/product' // Imported
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { acertoService } from '@/services/acertoService'
import { employeesService } from '@/services/employeesService'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Save, Printer, Loader2 } from 'lucide-react'
import { parseCurrency } from '@/lib/formatters'
import { format } from 'date-fns'

export default function AcertoPage() {
  const { employee: loggedInUser } = useUserStore()
  const { toast } = useToast()

  // State
  const [client, setClient] = useState<ClientRow | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [items, setItems] = useState<AcertoItem[]>([])
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [notaFiscal, setNotaFiscal] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureOpen, setSignatureOpen] = useState(false)

  // Loading States
  const [loadingAcerto, setLoadingAcerto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Context Data
  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)
  const [monthlyAverage, setMonthlyAverage] = useState(0)
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)

  // Initialization
  useEffect(() => {
    employeesService.getEmployees(1, 100).then(({ data }) => {
      const activeEmployees = data.filter((e) => e.situacao === 'ATIVO')
      setEmployees(activeEmployees)
    })
  }, [])

  // Auto-select logged in employee
  useEffect(() => {
    if (loggedInUser && !selectedEmployeeId) {
      setSelectedEmployeeId(loggedInUser.id.toString())
    }
  }, [loggedInUser])

  // Client Selection Effect
  useEffect(() => {
    if (client) {
      setLoadingAcerto(true)
      // 1. Get Last Acerto Info
      bancoDeDadosService
        .getLastAcerto(client.CODIGO)
        .then((data) => {
          setLastAcerto(data)
          // 2. If we have last acerto, fetch items as new transaction
          if (data && data.date && data.time) {
            return bancoDeDadosService.getAcertoItemsAsNewTransaction(
              client.CODIGO,
              data.date,
              data.time,
            )
          }
          return { items: [], nextId: 1 }
        })
        .then(({ items: newItems }) => {
          setItems(newItems)
        })
        .catch((err) => {
          console.error(err)
          toast({
            title: 'Erro ao carregar dados',
            description: 'Falha ao buscar itens do último acerto.',
            variant: 'destructive',
          })
        })
        .finally(() => setLoadingAcerto(false))

      // 3. Get Monthly Average
      bancoDeDadosService
        .getMonthlyAverage(client.CODIGO)
        .then(setMonthlyAverage)

      // 4. Get Next Order Number (Preview)
      bancoDeDadosService.getNextNumeroPedido().then(setNextOrderNumber)
    } else {
      setItems([])
      setLastAcerto(null)
      setMonthlyAverage(0)
      setNextOrderNumber(null)
      setPayments([])
      setSignature(null)
    }
  }, [client])

  // Calculations
  const totalSalesValue = items.reduce(
    (acc, item) => acc + item.valorVendido,
    0,
  )

  // Discount Logic using consistent service logic
  const discountStr = client?.Desconto || '0'
  const discountVal = parseCurrency(discountStr.replace('%', ''))
  const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal
  const discountAmount = totalSalesValue * discountFactor
  const amountToPay = totalSalesValue - discountAmount

  // Auto-select PIX logic (Requirement: Default to PIX)
  useEffect(() => {
    // Only auto-add if:
    // 1. We have a payable amount > 0
    // 2. No payments are currently selected
    // 3. We are not loading (client data is ready)
    if (
      amountToPay > 0.01 &&
      payments.length === 0 &&
      !loadingAcerto &&
      client
    ) {
      setPayments([
        {
          method: 'Pix',
          value: Number(amountToPay.toFixed(2)),
          paidValue: 0, // Initially 0, user confirms or auto-fills
          installments: 1,
          dueDate: format(new Date(), 'yyyy-MM-dd'),
        },
      ])
    }
  }, [amountToPay, loadingAcerto, client])

  // Handlers for AcertoTable
  const handleUpdateContagem = (uid: string, newContagem: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uid === uid) {
          const quantVendida = item.saldoInicial - newContagem
          const valorVendido = quantVendida * item.precoUnitario
          return {
            ...item,
            contagem: newContagem,
            quantVendida,
            valorVendido,
          }
        }
        return item
      }),
    )
  }

  const handleUpdateSaldoFinal = (uid: string, newSaldo: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.uid === uid ? { ...item, saldoFinal: newSaldo } : item,
      ),
    )
  }

  const handleRemoveItem = (uid: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.uid !== uid))
  }

  const handleClientSelect = (c: ClientRow) => {
    setClient(c)
  }

  const handleAddProducts = (newProducts: ProductRow[]) => {
    const newItems: AcertoItem[] = newProducts.map((p) => ({
      uid: Math.random().toString(36).substr(2, 9),
      produtoId: p.ID,
      produtoCodigo: p.CODIGO,
      produtoNome: p.PRODUTO || 'Sem nome',
      tipo: p.TIPO,
      precoUnitario: parseCurrency(p.PREÇO),
      saldoInicial: 0,
      contagem: 0,
      quantVendida: 0,
      valorVendido: 0,
      saldoFinal: 0,
      idVendaItens: null, // New items don't have this yet
    }))

    setItems((prev) => [...prev, ...newItems])
    toast({
      title: 'Produtos Adicionados',
      description: `${newProducts.length} produto(s) incluído(s) na lista.`,
    })
  }

  const handleGeneratePreview = async () => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) return

    setGeneratingPdf(true)
    try {
      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items,
          date: new Date().toISOString(),
          acertoTipo: 'Acerto',
          totalVendido: totalSalesValue,
          valorDesconto: discountAmount,
          valorAcerto: amountToPay,
          valorPago: payments.reduce((acc, p) => acc + p.paidValue, 0),
          debito: Math.max(
            0,
            amountToPay - payments.reduce((acc, p) => acc + p.paidValue, 0),
          ),
          payments,
          monthlyAverage,
          orderNumber: nextOrderNumber,
          issuerName: loggedInUser?.nome_completo,
        },
        { preview: true, signature },
      )

      const url = window.URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro no PDF',
        description: 'Não foi possível gerar a prévia.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSave = async () => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) {
      toast({
        title: 'Funcionário obrigatório',
        description: 'Selecione um funcionário responsável.',
        variant: 'destructive',
      })
      return
    }

    // Payment Validation
    if (payments.length === 0 && amountToPay > 0.01) {
      toast({
        title: 'Pagamento Obrigatório',
        description:
          'Selecione pelo menos uma forma de pagamento para finalizar.',
        variant: 'destructive',
      })
      return
    }

    if (!signature) {
      toast({
        title: 'Assinatura necessária',
        description: 'A assinatura do cliente é obrigatória.',
        variant: 'destructive',
      })
      setSignatureOpen(true)
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      // Save Transaction
      await bancoDeDadosService.saveTransaction(
        client,
        emp,
        items,
        now,
        'Acerto',
        payments,
        notaFiscal,
      )

      // Generate Final PDF
      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items,
          date: now.toISOString(),
          acertoTipo: 'Acerto',
          totalVendido: totalSalesValue,
          valorDesconto: discountAmount,
          valorAcerto: amountToPay,
          valorPago: payments.reduce((acc, p) => acc + p.paidValue, 0),
          debito: Math.max(
            0,
            amountToPay - payments.reduce((acc, p) => acc + p.paidValue, 0),
          ),
          payments,
          monthlyAverage,
          orderNumber: nextOrderNumber,
          issuerName: loggedInUser?.nome_completo,
        },
        { preview: false, signature },
      )

      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Pedido_${nextOrderNumber}_${client['NOME CLIENTE']}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()

      toast({
        title: 'Acerto Realizado',
        description: 'Pedido salvo e PDF gerado com sucesso.',
        className: 'bg-green-600 text-white',
      })

      // Reset
      setClient(null)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao processar o acerto.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-24 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Realizar Acerto</h1>
          <p className="text-muted-foreground">
            Lançamento de conferência e vendas da rota.
          </p>
        </div>
        <div className="w-full sm:w-[300px]">
          <Label className="text-xs mb-1 block">Funcionário Responsável</Label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cliente</CardTitle>
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
            loading={loadingAcerto}
          />

          <div className="flex justify-end">
            <ProductSelector onSelect={handleAddProducts} />
          </div>

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            loading={loadingAcerto}
            mode="ACERTO"
            acertoTipo="Acerto"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <AcertoStockSummary items={items} />
              <AcertoSalesSummary items={items} client={client} />
            </div>
            <div className="space-y-6">
              <AcertoPaymentSummary
                saldoAPagar={amountToPay}
                payments={payments}
                onPaymentsChange={setPayments}
                disabled={saving}
              />
              <AcertoFiscalSection
                clientNotaFiscal={client['NOTA FISCAL']}
                notaFiscalVenda={notaFiscal}
                onNotaFiscalVendaChange={setNotaFiscal}
                disabled={saving}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setSignatureOpen(true)}
              className={signature ? 'border-green-500 text-green-600' : ''}
            >
              {signature ? 'Assinatura Capturada' : 'Coletar Assinatura'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleGeneratePreview}
              disabled={generatingPdf || saving}
            >
              {generatingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Pré-visualizar PDF
            </Button>

            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving || items.length === 0}
              className="min-w-[200px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Finalizar Acerto
                </>
              )}
            </Button>
          </div>

          <div className="pt-8">
            <h3 className="text-lg font-semibold mb-4">Histórico Recente</h3>
            <AcertoHistoryTable
              clientId={client.CODIGO}
              monthlyAverage={monthlyAverage}
            />
          </div>
        </div>
      )}

      <SignatureModal
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSave={setSignature}
      />
    </div>
  )
}
