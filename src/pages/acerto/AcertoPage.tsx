import { useState, useEffect, useRef } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Calendar, Clock, Save, ArrowLeft, Check } from 'lucide-react'
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
import { parseCurrency, formatCurrency } from '@/lib/formatters'
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

  const [mode, setMode] = useState<'ACERTO' | 'CAPTACAO'>('ACERTO')
  const [acertoTipo, setAcertoTipo] = useState<string>('ACERTO')

  // New Payment State
  const [payments, setPayments] = useState<PaymentEntry[]>([])

  // New Monthly Average State
  const [monthlyAverage, setMonthlyAverage] = useState<number>(0)

  // Confirmation Dialog State
  const [showZeroStockAlert, setShowZeroStockAlert] = useState(false)

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
  }

  const handleAcertoTipoChange = (value: string) => {
    setAcertoTipo(value)
    // Automatically switch mode if needed for consistency, but keep as ACERTO for COMPLEMENTO
    if (value === 'CAPTAÇÃO') {
      setMode('CAPTACAO')
    } else {
      setMode('ACERTO')
    }
  }

  const handleAddProduct = async (product: ProductRow) => {
    if (items.some((i) => i.produtoId === product.ID)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Este produto já está na lista.',
        variant: 'destructive',
      })
      return
    }

    // Generate unique sequential ID
    let newId = nextItemIdRef.current
    if (newId === null) {
      try {
        const max = await bancoDeDadosService.getMaxIdVendaItens()
        newId = max + 1
      } catch (e) {
        console.error('Failed to fetch fallback max ID', e)
        newId = 1 // Fallback
      }
      nextItemIdRef.current = newId + 1
    } else {
      nextItemIdRef.current = newId + 1
    }

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
      idVendaItens: newId, // Assign generated ID
    }

    setItems((prev) => [...prev, newItem])
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

  // Calculate totals for summary and saving
  const totalVendido = items.reduce((acc, item) => acc + item.valorVendido, 0)
  const descontoStr = client?.Desconto || '0'
  const descontoVal = parseCurrency(descontoStr.replace('%', ''))
  const discountFactor = descontoVal > 1 ? descontoVal / 100 : descontoVal
  const valorDesconto = totalVendido * discountFactor
  const valorAcerto = totalVendido - valorDesconto

  const totalPaid = payments.reduce((acc, p) => acc + p.value, 0)

  const handleSaveClick = () => {
    if (!client || !employee) {
      toast({
        title: 'Dados incompletos',
        description: 'Verifique cliente e funcionário.',
        variant: 'destructive',
      })
      return
    }

    if (items.length === 0) {
      toast({
        title: 'Lista vazia',
        description: 'Adicione produtos antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    // STRICT VALIDATION
    // 1. Mandatory Payment
    if (payments.length === 0) {
      toast({
        title: 'Pagamento Obrigatório',
        description:
          'É necessário selecionar pelo menos uma forma de pagamento e atribuir um valor.',
        variant: 'destructive',
      })
      return
    }

    // 2. Negative Debt Check (Overpayment)
    // Debt = Valor Acerto - Total Paid
    // "The debt cannot be negative" means Total Paid cannot be > Valor Acerto
    // Note: Use a small epsilon for float comparison logic
    if (totalPaid > valorAcerto + 0.01) {
      toast({
        title: 'Débito Negativo',
        description:
          'O valor total pago não pode exceder o saldo a pagar. O débito não pode ser negativo.',
        variant: 'destructive',
      })
      return
    }

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
        const paymentString =
          payments
            .map((p) => `${p.method}: R$ ${formatCurrency(p.value)}`)
            .join(' | ') || acertoTipo

        const pdfBlob = await acertoService.generatePdf({
          client,
          employee,
          items,
          date: now.toISOString(),
          acertoTipo,
          total: totalVendido,
          // Pass new calculated values if backend supports it in future
          discount: valorDesconto,
          finalValue: valorAcerto,
          paymentMethod: paymentString,
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
        description: 'Operação finalizada.',
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      // 4. Redirect
      setItems([])
      setClient(null)
      setIsClientConfirmed(false)
      setPayments([])
      navigate('/')
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar os dados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
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

            <div className="flex items-center gap-3 pb-2">
              <Label className="text-sm font-bold text-muted-foreground uppercase w-32">
                Acerto Tipo
              </Label>
              <Select value={acertoTipo} onValueChange={handleAcertoTipoChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACERTO">ACERTO</SelectItem>
                  <SelectItem value="CAPTAÇÃO">CAPTAÇÃO</SelectItem>
                  <SelectItem value="COMPLEMENTO">COMPLEMENTO</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <ProductSelector onSelect={handleAddProduct} />
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
          />

          {/* New History Table (Replacing Settlement Summary) */}
          <AcertoHistoryTable
            clientId={client!.CODIGO}
            monthlyAverage={monthlyAverage}
          />

          {/* Bottom Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
            <div className="text-sm text-muted-foreground">
              {acertoTipo === 'CAPTAÇÃO' || acertoTipo === 'COMPLEMENTO'
                ? '* A Contagem é preenchida automaticamente para este tipo de operação.'
                : '* Verifique os totais antes de finalizar.'}
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
                className="w-full sm:w-auto"
                onClick={handleSaveClick}
                disabled={saving || items.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF...
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
    </div>
  )
}
