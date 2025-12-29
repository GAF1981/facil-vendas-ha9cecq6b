import { useState, useEffect, useRef } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Calendar,
  Clock,
  Save,
  ArrowLeft,
  Check,
  Copy,
  FileText,
  PenTool,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { acertoService } from '@/services/acertoService'
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { ClientRow } from '@/types/client'
import { ProductRow } from '@/types/product'
import { AcertoItem } from '@/types/acerto'
import { useToast } from '@/hooks/use-toast'
import { ProductSelector } from '@/components/acerto/ProductSelector'
import { AcertoTable } from '@/components/acerto/AcertoTable'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'
import { AcertoStockSummary } from '@/components/acerto/AcertoStockSummary'
import { AcertoSalesSummary } from '@/components/acerto/AcertoSalesSummary'
import { AcertoPaymentSummary } from '@/components/acerto/AcertoPaymentSummary'
import { AcertoHistoryTable } from '@/components/acerto/AcertoHistoryTable'
import { cn } from '@/lib/utils'
import { parseCurrency } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentEntry } from '@/types/payment'
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
import { SignatureModal } from '@/components/acerto/SignatureModal'

export default function AcertoPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [client, setClient] = useState<ClientRow | null>(null)
  const [lastAcerto, setLastAcerto] = useState<{
    date: string
    time: string
  } | null>(null)
  const [loadingLastAcerto, setLoadingLastAcerto] = useState(false)
  const [fetchingItems, setFetchingItems] = useState(false)
  const [isClientConfirmed, setIsClientConfirmed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [items, setItems] = useState<AcertoItem[]>([])
  const [saving, setSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const [mode, setMode] = useState<'ACERTO' | 'CAPTACAO'>('ACERTO')
  const [acertoTipo, setAcertoTipo] = useState<string>('ACERTO')

  // New Payment State
  const [payments, setPayments] = useState<PaymentEntry[]>([])

  // New Monthly Average State
  const [monthlyAverage, setMonthlyAverage] = useState<number>(0)

  // Confirmation Dialog State
  const [showZeroStockAlert, setShowZeroStockAlert] = useState(false)

  // Signature State
  const [signature, setSignature] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  // State for automatic order number
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)
  // Ref for automatic Item ID generation (sequential)
  const nextItemIdRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Effect to fetch last acerto (date and time) when client is selected
  useEffect(() => {
    if (client) {
      setLastAcerto(null) // Reset while fetching
      setLoadingLastAcerto(true)
      bancoDeDadosService
        .getLastAcerto(client.CODIGO)
        .then((data) => setLastAcerto(data))
        .catch((err) => console.error('Error fetching last acerto', err))
        .finally(() => setLoadingLastAcerto(false))
    } else {
      setLastAcerto(null)
      setLoadingLastAcerto(false)
    }
  }, [client])

  // Effect to fetch next order number and max item ID when client is confirmed
  useEffect(() => {
    if (isClientConfirmed) {
      // Only reset if we didn't just load items (which would set nextItemIdRef)
      if (items.length === 0) {
        nextItemIdRef.current = null
      }
      setNextOrderNumber(null)

      // Fetch Next Order Number
      bancoDeDadosService
        .getNextNumeroPedido()
        .then((num) => setNextOrderNumber(num))
        .catch((err) => {
          console.error('Error fetching next order number:', err)
          toast({
            title: 'Erro',
            description: 'Não foi possível obter o número do pedido.',
            variant: 'destructive',
          })
        })

      // Fetch Max Item ID for sequential generation IF not already set by data loading
      if (items.length === 0) {
        bancoDeDadosService
          .getMaxIdVendaItens()
          .then((max) => {
            nextItemIdRef.current = max + 1
          })
          .catch((err) => {
            console.error('Error fetching max item ID:', err)
            toast({
              title: 'Erro',
              description: 'Não foi possível inicializar o gerador de IDs.',
              variant: 'destructive',
            })
          })
      }

      // Fetch Monthly Average
      if (client) {
        bancoDeDadosService
          .getMonthlyAverage(client.CODIGO)
          .then((avg) => setMonthlyAverage(avg))
          .catch((err) => console.error('Error fetching monthly average', err))
      }
    } else {
      setNextOrderNumber(null)
      nextItemIdRef.current = null
      setMonthlyAverage(0)
    }
  }, [isClientConfirmed, toast, client])

  const handleClientSelect = (selectedClient: ClientRow) => {
    setClient(selectedClient)
  }

  const handleConfirmClient = async (selectedMode: 'ACERTO' | 'CAPTACAO') => {
    if (!client) return

    setFetchingItems(true)
    try {
      if (selectedMode === 'ACERTO' && lastAcerto) {
        const { items: loadedItems, nextId } =
          await bancoDeDadosService.getAcertoItemsAsNewTransaction(
            client.CODIGO,
            lastAcerto.date,
            lastAcerto.time,
          )

        if (loadedItems.length > 0) {
          setItems(loadedItems)
          nextItemIdRef.current = nextId
          toast({
            title: 'Itens carregados',
            description: `${loadedItems.length} itens foram recuperados do último acerto.`,
            className: 'bg-blue-50 border-blue-200 text-blue-900',
          })
        } else {
          toast({
            title: 'Nenhum item encontrado',
            description:
              'Não foi possível encontrar itens para o último acerto.',
            variant: 'warning',
          })
        }
      }

      setMode(selectedMode)
      setAcertoTipo(selectedMode === 'CAPTACAO' ? 'CAPTAÇÃO' : 'ACERTO')
      if (selectedMode === 'CAPTACAO') {
        setPayments([])
      }
      setIsClientConfirmed(true)
    } catch (error) {
      console.error('Error confirming client:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao preparar o acerto. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setFetchingItems(false)
    }
  }

  const handleChangeClient = () => {
    if (items.length > 0) {
      const confirmChange = window.confirm(
        'Trocar de cliente irá limpar a lista de produtos. Deseja continuar?',
      )
      if (!confirmChange) return
    }
    setClient(null)
    setIsClientConfirmed(false)
    setItems([])
    setMode('ACERTO')
    setAcertoTipo('ACERTO')
    setPayments([])
    setSignature(null)
  }

  const handleAddProducts = async (products: ProductRow[]) => {
    // Filter out items already in the list
    const productsToAdd = products.filter(
      (p) => !items.some((i) => i.produtoId === p.ID),
    )

    if (productsToAdd.length === 0) {
      toast({
        title:
          products.length === 1
            ? 'Produto já adicionado'
            : 'Produtos já adicionados',
        description: 'Todos os produtos selecionados já constam na lista.',
        variant: 'destructive',
      })
      return
    }

    if (productsToAdd.length < products.length) {
      toast({
        title: 'Produtos duplicados ignorados',
        description: `Adicionados ${productsToAdd.length} de ${products.length} produtos selecionados.`,
        variant: 'warning',
      })
    }

    // Generate unique sequential IDs for the batch
    let currentId = nextItemIdRef.current
    if (currentId === null) {
      try {
        const max = await bancoDeDadosService.getMaxIdVendaItens()
        currentId = max + 1
      } catch (e) {
        console.error('Failed to fetch fallback max ID', e)
        currentId = 1 // Fallback
      }
    }

    const newItems: AcertoItem[] = []

    for (const product of productsToAdd) {
      const price = parseCurrency(product.PREÇO)
      const saldoInicial = 0
      const contagem = 0
      const quantVendida = saldoInicial - contagem
      const valorVendido = quantVendida * price

      const newItem: AcertoItem = {
        uid: Math.random().toString(36).substr(2, 9),
        produtoId: product.ID,
        produtoCodigo: product.CODIGO,
        produtoNome: product.PRODUTO || 'Sem nome',
        tipo: product.TIPO || '',
        precoUnitario: price,
        saldoInicial: saldoInicial,
        contagem: contagem,
        quantVendida: quantVendida,
        valorVendido: valorVendido,
        saldoFinal: 0,
        idVendaItens: currentId, // Assign generated ID
      }

      newItems.push(newItem)
      currentId++
    }

    nextItemIdRef.current = currentId
    setItems((prev) => [...prev, ...newItems])

    toast({
      title: 'Produtos adicionados',
      description: `${newItems.length} produto(s) adicionado(s) à lista.`,
      className: 'bg-green-50 border-green-200 text-green-900',
    })
  }

  const handleUpdateContagem = (uid: string, newContagem: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        const contagem = Math.max(0, newContagem)
        const quantVendida = item.saldoInicial - contagem
        const valorVendido = quantVendida * item.precoUnitario

        return {
          ...item,
          contagem,
          quantVendida,
          valorVendido,
        }
      }),
    )
  }

  const handleUpdateSaldoFinal = (uid: string, newSaldo: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item
        return {
          ...item,
          saldoFinal: Math.max(0, newSaldo),
        }
      }),
    )
  }

  const handleRemoveItem = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }

  const handleRepeatCountToFinalBalance = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        saldoFinal: item.contagem,
      })),
    )
    toast({
      title: 'Saldo Final Atualizado',
      description: 'O saldo final foi igualado à contagem para todos os itens.',
      className: 'bg-blue-50 border-blue-200 text-blue-900',
    })
  }

  // Calculate totals for summary and saving
  const totalVendido = items.reduce((acc, item) => acc + item.valorVendido, 0)
  const descontoStr = client?.Desconto || '0'
  const descontoVal = parseCurrency(descontoStr.replace('%', ''))
  const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
  const valorDesconto = totalVendido * discountFactor
  const valorAcerto = totalVendido - valorDesconto

  // Use registered value (p.value) for validation against "Saldo a Pagar"
  const totalRegistered = payments.reduce((acc, p) => acc + p.value, 0)
  const totalPaid = payments.reduce((acc, p) => acc + p.paidValue, 0)

  // Validation Logic
  const validateAcerto = () => {
    if (!client || !employee) {
      toast({
        title: 'Dados incompletos',
        description: 'Verifique cliente e funcionário.',
        variant: 'destructive',
      })
      return false
    }

    if (items.length === 0) {
      toast({
        title: 'Lista vazia',
        description: 'Adicione produtos antes de salvar.',
        variant: 'destructive',
      })
      return false
    }

    // STRICT VALIDATION
    // 1. Mandatory Payment (Skipped for CAPTAÇÃO)
    const isCaptacao = acertoTipo === 'CAPTAÇÃO' || mode === 'CAPTACAO'

    if (!isCaptacao && payments.length === 0) {
      toast({
        title: 'Pagamento Obrigatório',
        description:
          'É necessário selecionar pelo menos uma forma de pagamento e atribuir um valor.',
        variant: 'destructive',
      })
      return false
    }

    // 2. Negative Debt Check (Overpayment)
    // Only applied if payments exist (which is 0 for Captação, so safe)
    if (totalRegistered > valorAcerto + 0.01) {
      toast({
        title: 'Débito Negativo',
        description:
          'O valor total registrado não pode exceder o saldo a pagar. O débito não pode ser negativo.',
        variant: 'destructive',
      })
      return false
    }

    // 3. STRICT Validation for Negative Debt caused by Paid Value
    // If Total Paid > Total Acerto, Debito becomes negative.
    if (!isCaptacao && totalPaid > valorAcerto + 0.01) {
      toast({
        title: 'Pagamento Excedente',
        description:
          'O valor total pago não pode exceder o valor do acerto. O débito não pode ser menor que zero.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const preparePdfData = async (now: Date) => {
    // Fetch history
    let historyForPdf: any[] = []
    try {
      const history = await bancoDeDadosService.getAcertoHistory(client!.CODIGO)
      historyForPdf = history.slice(0, 12)
    } catch (e) {
      console.error('Failed to fetch history for PDF', e)
    }

    return {
      client,
      employee,
      items,
      date: now.toISOString(),
      acertoTipo,
      // Financials
      totalVendido,
      valorDesconto,
      valorAcerto,
      valorPago: totalPaid,
      debito: Math.max(0, valorAcerto - totalPaid),
      // Payments
      payments,
      // New fields for PDF
      history: historyForPdf,
      monthlyAverage,
    }
  }

  const handlePreviewPdf = async () => {
    if (!validateAcerto()) return

    setGeneratingPdf(true)
    try {
      const now = new Date()
      const data = await preparePdfData(now)

      const pdfBlob = await acertoService.generatePdf(data, {
        preview: true,
        signature: null, // Preview doesn't need signature yet? Or maybe it does? Requirement implies signature captured first, then preview? No, preview usually before signing or independent. I'll pass null for now.
      })

      const url = window.URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error generating PDF preview:', error)
      toast({
        title: 'Erro no Preview',
        description: 'Não foi possível gerar a visualização do PDF.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleSaveClick = () => {
    if (!validateAcerto()) return

    // Zero-Stock Validation
    const totalSaldoFinal = items.reduce(
      (acc, item) => acc + item.saldoFinal,
      0,
    )
    if (totalSaldoFinal <= 0) {
      setShowZeroStockAlert(true)
      return
    }

    // Proceed to save
    executeSave()
  }

  const executeSave = async () => {
    setSaving(true)
    try {
      if (!client || !employee) return

      const now = new Date()

      // 1. Save to Database
      await bancoDeDadosService.saveTransaction(
        client,
        employee,
        items,
        now,
        acertoTipo,
        payments,
      )

      // 2. Generate and Download PDF
      try {
        const data = await preparePdfData(now)
        const pdfBlob = await acertoService.generatePdf(data, {
          preview: false,
          signature: signature,
        })

        // Trigger Download
        const url = window.URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Pedido_${client.CODIGO}_${format(now, 'yyyyMMdd_HHmm')}.pdf`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError)
        toast({
          title: 'Erro ao gerar PDF',
          description: 'O pedido foi salvo, mas o PDF não pôde ser gerado.',
          variant: 'destructive',
        })
      }

      // 3. Success Message (Required Text)
      toast({
        title: 'Pedido realizado com Sucesso',
        description: 'Operação finalizada e pagamentos registrados.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      // 4. Redirect
      setItems([])
      setClient(null)
      setIsClientConfirmed(false)
      setPayments([])
      setSignature(null)
      navigate('/')
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description:
          error.message ||
          'Não foi possível registrar os dados ou o pagamento.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl)
    toast({
      title: 'Assinatura salva',
      description: 'A assinatura foi capturada com sucesso.',
      className: 'bg-green-50 border-green-200 text-green-900',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Controle de Vendas
            </h1>
            <p className="text-muted-foreground">
              Gerencie acertos e captações de clientes.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {format(currentTime, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{format(currentTime, 'HH:mm:ss')}</span>
          </div>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">Funcionário:</span>
            <span className="font-mono bg-background px-2 py-1 rounded border">
              {employee?.id || '---'}
            </span>
            <span className="font-medium">
              {employee?.nome_completo || 'Não identificado'}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!isClientConfirmed && <ClientSearch onSelect={handleClientSelect} />}

        {client && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Cliente Selecionado</h2>
              </div>
              {isClientConfirmed && (
                <Button variant="ghost" size="sm" onClick={handleChangeClient}>
                  Trocar Cliente
                </Button>
              )}
            </div>

            <ClientDetails
              client={client}
              lastAcerto={lastAcerto}
              loading={loadingLastAcerto}
            />

            {!isClientConfirmed && (
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {loadingLastAcerto ? (
                  <>
                    <Skeleton className="h-11 w-[160px] rounded-md" />
                  </>
                ) : (
                  <>
                    {/*
                      Visibility Logic:
                      - If Last Acerto exists -> Show ACERTO CLIENTE only
                      - If Last Acerto does NOT exist -> Show CAPTAÇÃO only
                    */}
                    {lastAcerto ? (
                      <Button
                        onClick={() => handleConfirmClient('ACERTO')}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                        size="lg"
                        disabled={fetchingItems}
                      >
                        {fetchingItems ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-5 w-5" />
                        )}
                        ACERTO CLIENTE
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleConfirmClient('CAPTACAO')}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-900 min-w-[160px]"
                        size="lg"
                        disabled={fetchingItems}
                      >
                        <Check className="mr-2 h-5 w-5" />
                        CAPTAÇÃO
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isClientConfirmed && (
        <div className="space-y-6 animate-fade-in pt-4 border-t">
          {/* Automatic Order Number Field - Directly above Resumo da Contagem */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 pb-2">
              <Label className="text-sm font-bold text-muted-foreground uppercase w-32">
                Número de Pedido
              </Label>
              <Input
                value={nextOrderNumber !== null ? nextOrderNumber : '...'}
                readOnly
                className="w-24 h-9 font-mono text-center font-bold bg-muted"
              />
            </div>
          </div>

          <div className="flex justify-end mb-1">
            <Button
              onClick={handleRepeatCountToFinalBalance}
              variant="outline"
              size="sm"
              disabled={items.length === 0}
            >
              <Copy className="mr-2 h-4 w-4" />
              Repetir a Contagem no Saldo Final
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Resumo da Contagem
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({items.length} itens)
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border',
                  mode === 'ACERTO'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200',
                )}
              >
                {mode === 'ACERTO' ? 'Modo Acerto' : 'Modo Captação'}
              </span>
            </h2>
            <ProductSelector onSelect={handleAddProducts} />
          </div>

          {/* Table */}
          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            mode={mode}
            acertoTipo={acertoTipo}
          />

          {/* New Sales Summary */}
          <AcertoSalesSummary items={items} client={client} />

          {/* Stock Summary */}
          <AcertoStockSummary items={items} />

          {/* New Payment Summary */}
          <AcertoPaymentSummary
            saldoAPagar={valorAcerto}
            payments={payments}
            onPaymentsChange={setPayments}
            disabled={acertoTipo === 'CAPTAÇÃO' || mode === 'CAPTACAO'}
          />

          {/* New History Table (Replacing Settlement Summary) */}
          <AcertoHistoryTable
            clientId={client!.CODIGO}
            monthlyAverage={monthlyAverage}
          />

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm sticky bottom-4 z-50">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowSignatureModal(true)}
                className={cn(
                  'border border-muted-foreground/20',
                  signature && 'bg-green-100 text-green-800 border-green-300',
                )}
              >
                <PenTool className="mr-2 h-4 w-4" />
                {signature ? 'Assinatura Capturada' : 'Assinatura'}
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewPdf}
                disabled={generatingPdf || items.length === 0}
              >
                {generatingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {valorAcerto.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <Separator
                orientation="vertical"
                className="h-10 hidden sm:block"
              />
              <Button
                size="lg"
                className="w-full sm:w-auto min-w-[150px]"
                onClick={handleSaveClick}
                disabled={saving || items.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Finalizar {mode === 'ACERTO' ? 'Acerto' : 'Captação'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Zero Stock Warning Dialog */}
      <AlertDialog
        open={showZeroStockAlert}
        onOpenChange={setShowZeroStockAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação Necessária</AlertDialogTitle>
            <AlertDialogDescription className="text-red-600 font-bold text-base">
              O Acerto esta sendo Finalizado e o cliente está sem estoque de
              mercadorias ATENÇÃO
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSave}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar e Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Signature Modal */}
      <SignatureModal
        open={showSignatureModal}
        onOpenChange={setShowSignatureModal}
        onSave={handleSignatureSave}
      />
    </div>
  )
}
