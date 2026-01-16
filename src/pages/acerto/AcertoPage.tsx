import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoTable } from '@/components/acerto/AcertoTable'
import { AcertoStockSummary } from '@/components/acerto/AcertoStockSummary'
import { AcertoSalesSummary } from '@/components/acerto/AcertoSalesSummary'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { AcertoFiscalSection } from '@/components/acerto/AcertoFiscalSection'
import { AcertoPrintOptions } from '@/components/acerto/AcertoPrintOptions'
import { SignatureModal } from '@/components/acerto/SignatureModal'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { ProductSelector } from '@/components/acerto/ProductSelector'
import { ZeroStockAlert } from '@/components/acerto/ZeroStockAlert'
import { ClientRow } from '@/types/client'
import { Employee } from '@/types/employee'
import { AcertoItem, PendingStockAdjustment } from '@/types/acerto'
import { PaymentEntry } from '@/types/payment'
import { ProductRow } from '@/types/product'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { acertoService } from '@/services/acertoService'
import { employeesService } from '@/services/employeesService'
import { inativarClientesService } from '@/services/inativarClientesService'
import { cobrancaService } from '@/services/cobrancaService'
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
import { Save, Printer, Loader2, Copy } from 'lucide-react'
import { parseCurrency } from '@/lib/formatters'
import { fechamentoService } from '@/services/fechamentoService'
import { rotaService } from '@/services/rotaService'
import { useNavigate } from 'react-router-dom'

export default function AcertoPage() {
  const { employee: loggedInUser } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  // State
  const [client, setClient] = useState<ClientRow | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [items, setItems] = useState<AcertoItem[]>([])
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [notaFiscal, setNotaFiscal] = useState<string>('')
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [zeroStockDialogOpen, setZeroStockDialogOpen] = useState(false)
  const [isCaptacao, setIsCaptacao] = useState(false)

  // Default to 80mm as per user story requirement for thermal printer optimization
  const [pdfFormat, setPdfFormat] = useState<'A4' | '80mm'>('80mm')

  // Pending Stock Adjustments Queue
  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingStockAdjustment[]
  >([])

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
    employeesService
      .getEmployees(1, 100)
      .then(({ data }) => {
        const activeEmployees = data.filter((e) => e.situacao === 'ATIVO')
        setEmployees(activeEmployees)
      })
      .catch((err) => console.error('Failed to fetch employees', err))
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

      // 0. Check for History (Captação Logic)
      bancoDeDadosService
        .checkClientHasOrders(client.CODIGO)
        .then((hasOrders) => {
          setIsCaptacao(!hasOrders)
        })
        .catch((e) => console.error('History check error', e))

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
          setPendingAdjustments([])
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
        .catch((e) => console.error('Avg error', e))

      // 4. Get Next Order Number (Preview)
      bancoDeDadosService
        .getNextNumeroPedido()
        .then(setNextOrderNumber)
        .catch((e) => console.error('Next order error', e))

      // 5. NF Logic: If 'Nota Fiscal Cadastro' is NO or 0, set Venda to NO automatically
      if (client['NOTA FISCAL'] === 'NÃO' || client['NOTA FISCAL'] === '0') {
        setNotaFiscal('NÃO')
      } else {
        setNotaFiscal('') // Reset if SIM or other
      }
    } else {
      setItems([])
      setLastAcerto(null)
      setMonthlyAverage(0)
      setNextOrderNumber(null)
      setPayments([])
      setSignature(null)
      setNotaFiscal('')
      setPendingAdjustments([])
      setIsCaptacao(false)
    }
  }, [client])

  // Calculations
  const totalSalesValue = items.reduce(
    (acc, item) => acc + item.valorVendido,
    0,
  )

  const discountStr = client?.Desconto || '0'
  const discountVal = parseCurrency(discountStr.replace('%', ''))
  const discountFactor = discountVal > 1 ? discountVal / 100 : discountVal
  const discountAmount = totalSalesValue * discountFactor
  const amountToPay = totalSalesValue - discountAmount

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

  const handleUpdateSaldoInicial = (uid: string, newSaldo: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.uid === uid) {
          const quantVendida = newSaldo - item.contagem
          const valorVendido = quantVendida * item.precoUnitario
          return {
            ...item,
            saldoInicial: newSaldo,
            quantVendida,
            valorVendido,
          }
        }
        return item
      }),
    )
  }

  const handleQueueAdjustment = (adjustment: PendingStockAdjustment) => {
    setPendingAdjustments((prev) => [...prev, adjustment])
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
      idVendaItens: null,
    }))

    setItems((prev) => [...prev, ...newItems])
    toast({
      title: 'Produtos Adicionados',
      description: `${newProducts.length} produto(s) incluído(s) na lista.`,
    })
  }

  const handleRepeatCount = () => {
    if (items.length === 0) return
    if (
      confirm(
        'Tem certeza que deseja copiar a CONTAGEM para o SALDO FINAL de todos os itens?',
      )
    ) {
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          saldoFinal: item.contagem,
        })),
      )
      toast({
        title: 'Atualizado',
        description: 'Saldo Final atualizado com valores da Contagem.',
      })
    }
  }

  const handleGeneratePreview = async () => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) return

    setGeneratingPdf(true)
    try {
      const history = await bancoDeDadosService.getAcertoHistory(client.CODIGO)

      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items,
          date: new Date().toISOString(),
          acertoTipo: isCaptacao ? 'Captação' : 'Acerto',
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
          history: history.slice(0, 10),
        },
        { preview: true, signature, format: pdfFormat },
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

  const handlePreSaveValidation = async () => {
    if (!client) return

    // Inactivity Check
    if (client['TIPO DE CLIENTE'] !== 'ATIVO') {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Não é possível realizar Acerto em um cliente Inativo! Favor ATIVAR o cliente no cadastro!',
        variant: 'destructive',
      })
      return
    }

    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) {
      toast({
        title: 'Funcionário obrigatório',
        description: 'Selecione um funcionário responsável.',
        variant: 'destructive',
      })
      return
    }

    try {
      const activeRota = await rotaService.getActiveRota()
      if (activeRota) {
        const closureStatus = await fechamentoService.getClosureStatus(
          activeRota.id,
          emp.id,
        )
        if (closureStatus === 'Aberto' || closureStatus === 'Fechado') {
          toast({
            title: 'Ação Bloqueada',
            description:
              'Seu Caixa está fechado para a Rota !!! Você deve aguardar abrir uma Nova Rota !!!',
            variant: 'destructive',
          })
          return
        }
      }
    } catch (error) {
      console.error('Error checking closure status:', error)
    }

    if (!notaFiscal) {
      toast({
        title: 'Nota Fiscal Obrigatória',
        description:
          'Por favor, selecione SIM ou NÃO para a Nota Fiscal Venda.',
        variant: 'destructive',
      })
      return
    }

    const totalPaid = payments.reduce((acc, p) => acc + p.paidValue, 0)
    const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)

    // Feature 4: Zero Balance Validation for Captação
    if (isCaptacao && totalPaid !== 0) {
      toast({
        title: 'Erro de Validação',
        description:
          'Para finalizar é necessário que o total selecionado de pagamento seja igual a 0',
        variant: 'destructive',
      })
      return
    }

    // STRICT VALIDATION for Normal Acerto
    // The "Total Selecionado" (totalRegistered) value must be exactly equal to "Saldo a Pagar" (amountToPay)
    // This implies that "Restante" must be 0
    if (!isCaptacao) {
      // Using 0.01 epsilon for float comparison safety
      if (Math.abs(totalRegistered - amountToPay) > 0.01) {
        toast({
          title: 'Erro de Validação',
          description:
            'O Total Selecionado deve ser igual ao total do saldo a pagar.',
          variant: 'destructive',
        })
        return
      }
    }

    // Financial Validation: Paid Amount > Due Amount Check
    // Use a small epsilon for floating point comparison safety
    if (totalPaid > amountToPay + 0.01) {
      toast({
        title: 'Erro Financeiro',
        description: `O valor pago (R$ ${totalPaid.toFixed(2)}) não pode ser maior que o saldo a pagar (R$ ${amountToPay.toFixed(2)}).`,
        variant: 'destructive',
      })
      return
    }

    if (payments.length === 0 && amountToPay > 0.01 && !isCaptacao) {
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

    // Zero-Stock Inactivity Alert Check
    const totalStock = items.reduce(
      (acc, item) => acc + (item.saldoFinal || 0),
      0,
    )
    if (totalStock === 0) {
      setZeroStockDialogOpen(true)
    } else {
      executeSave()
    }
  }

  const handleZeroStockConfirm = () => {
    setZeroStockDialogOpen(false)
    // Pass true to flag for inactivation in the new table
    executeSave(true)
  }

  const executeSave = async (flagInactivation: boolean = false) => {
    if (!client) return
    const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
    if (!emp) return

    setSaving(true)
    try {
      const now = new Date()
      // 1. Save Transaction and get final Order Number
      const finalOrderNumber = await bancoDeDadosService.saveTransaction(
        client,
        emp,
        items,
        now,
        isCaptacao ? 'Captação' : 'Acerto',
        payments,
        notaFiscal,
      )

      // 2. Process Pending Stock Adjustments
      if (pendingAdjustments.length > 0) {
        for (const adj of pendingAdjustments) {
          try {
            await bancoDeDadosService.logInitialBalanceAdjustment({
              ...adj,
              numero_pedido: finalOrderNumber,
            })
          } catch (logError) {
            console.error('Failed to log adjustment', adj, logError)
          }
        }
      }

      // 3. Handle Inactivation Flagging (New Requirement)
      if (flagInactivation) {
        const valorPagoTotal = payments.reduce((acc, p) => acc + p.paidValue, 0)
        // Fetch total accumulated debt for accuracy
        let totalDebt = 0
        try {
          totalDebt = await cobrancaService.getClientDebtSummary(client.CODIGO)
        } catch (e) {
          console.error('Error fetching total debt for inactivation:', e)
          // Fallback to current order calculation if fetch fails, though ideal is total
          totalDebt = Math.max(0, amountToPay - valorPagoTotal)
        }

        await inativarClientesService.create({
          pedido_id: finalOrderNumber,
          funcionario_nome: emp.nome_completo,
          cliente_codigo: client.CODIGO,
          cliente_nome: client['NOME CLIENTE'],
          valor_venda: totalSalesValue,
          saldo_a_pagar: amountToPay,
          valor_pago: valorPagoTotal,
          debito: totalDebt,
        })
      }

      // 4. Fetch History for PDF
      const history = await bancoDeDadosService.getAcertoHistory(client.CODIGO)

      // 5. Generate Final PDF
      const pdfBlob = await acertoService.generatePdf(
        {
          client,
          employee: emp,
          items,
          date: now.toISOString(),
          acertoTipo: isCaptacao ? 'Captação' : 'Acerto',
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
          orderNumber: finalOrderNumber,
          issuerName: loggedInUser?.nome_completo,
          history: history.slice(0, 10),
        },
        { preview: false, signature, format: pdfFormat },
      )

      const url = window.URL.createObjectURL(pdfBlob)

      const a = document.createElement('a')
      a.href = url
      a.download = `Pedido_${finalOrderNumber}_${client['NOME CLIENTE']}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => {
        window.open(url, '_blank')
      }, 100)

      toast({
        title: isCaptacao ? 'Captação Realizada' : 'Acerto Realizado',
        description: 'Pedido salvo e PDF gerado com sucesso.',
        className: 'bg-green-600 text-white',
      })

      // Reset or Redirect
      setClient(null)
      setPendingAdjustments([])

      if (flagInactivation) {
        // Redirect to Inativar Clientes as per user story
        navigate('/inativar-clientes')
      }
    } catch (err: any) {
      console.error(err)
      const errorMessage = err.message || 'Falha ao processar o acerto.'

      toast({
        title: 'Erro ao salvar',
        description: errorMessage,
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

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleRepeatCount}
              title="Copiar Contagem para Saldo Final em todos os itens"
            >
              <Copy className="mr-2 h-4 w-4" />
              Repetir Contagem
            </Button>
            <ProductSelector onSelect={handleAddProducts} />
          </div>

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            onUpdateSaldoInicial={handleUpdateSaldoInicial}
            onQueueAdjustment={handleQueueAdjustment}
            loading={loadingAcerto}
            mode={isCaptacao ? 'CAPTACAO' : 'ACERTO'}
            acertoTipo={isCaptacao ? 'Captação' : 'Acerto'}
            clientId={client.CODIGO}
            clientName={client['NOME CLIENTE'] || 'Desconhecido'}
            orderNumber={nextOrderNumber}
            isCaptacao={isCaptacao}
          />

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AcertoStockSummary items={items} />
              <AcertoSalesSummary items={items} client={client} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AcertoPaymentSummary
                  saldoAPagar={amountToPay}
                  payments={payments}
                  onPaymentsChange={setPayments}
                  disabled={saving || isCaptacao} // Feature 3: Disable payment fields in Captacao
                />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-6">
                <AcertoFiscalSection
                  clientNotaFiscal={client['NOTA FISCAL']}
                  notaFiscalVenda={notaFiscal}
                  onNotaFiscalVendaChange={setNotaFiscal}
                  disabled={saving}
                />
                <AcertoPrintOptions
                  format={pdfFormat}
                  onFormatChange={setPdfFormat}
                  disabled={saving}
                />
              </div>
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
              onClick={handlePreSaveValidation}
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
                  {isCaptacao ? 'Finalizar Captação' : 'Finalizar Acerto'}
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

      <ZeroStockAlert
        open={zeroStockDialogOpen}
        onOpenChange={setZeroStockDialogOpen}
        onConfirm={handleZeroStockConfirm}
        onCancel={() => setZeroStockDialogOpen(false)}
      />
    </div>
  )
}
