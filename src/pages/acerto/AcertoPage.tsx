import { useState, useEffect } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
import { cn } from '@/lib/utils'
import { parseCurrency } from '@/lib/formatters'

export default function AcertoPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  // State
  const [client, setClient] = useState<ClientRow | null>(null)
  const [isClientConfirmed, setIsClientConfirmed] = useState(false)
  const [lastAcertoDate, setLastAcertoDate] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [items, setItems] = useState<AcertoItem[]>([])
  const [saving, setSaving] = useState(false)

  // New State for Mode and Logic
  const [mode, setMode] = useState<'ACERTO' | 'CAPTACAO'>('ACERTO')
  const [canCaptacao, setCanCaptacao] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Handle Client Selection with Real-time Database Verification
  const handleClientSelect = async (selectedClient: ClientRow) => {
    setClient(selectedClient)
    setLastAcertoDate(null)
    setLoadingStatus(true)
    setCanCaptacao(false)

    try {
      // Fetch last acerto (legacy check for UI info)
      const lastDate = await acertoService.getLastAcertoDate(
        selectedClient.CODIGO,
      )
      setLastAcertoDate(lastDate)

      // Determine Eligibility for CAPTACAO based on DB history
      const hasBalance = await bancoDeDadosService.hasOutstandingBalance(
        selectedClient.CODIGO,
      )
      setCanCaptacao(hasBalance)
    } catch (error) {
      console.error(error)
      setCanCaptacao(false)
    } finally {
      setLoadingStatus(false)
    }
  }

  // Handle Confirmation with Mode Selection
  const handleConfirmClient = (selectedMode: 'ACERTO' | 'CAPTACAO') => {
    if (!client) return
    setMode(selectedMode)
    setIsClientConfirmed(true)
  }

  // Handle Change Client
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
    setLastAcertoDate(null)
    setCanCaptacao(false)
    setMode('ACERTO') // Reset mode
  }

  // Add Product
  const handleAddProduct = (product: ProductRow) => {
    // Check if exists
    if (items.some((i) => i.produtoId === product.ID)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Este produto já está na lista.',
        variant: 'destructive',
      })
      return
    }

    const price = parseCurrency(product.PREÇO)
    const saldoInicial = 0 // Defaults to 0 as per user story

    // For new items:
    // ACERTO: Contagem starts at 0. QuantVendida = 0.
    // CAPTACAO: Contagem starts at 0 (and is locked). QuantVendida = 0.
    const contagem = 0
    const quantVendida = saldoInicial - contagem
    const valorVendido = quantVendida * price

    const newItem: AcertoItem = {
      uid: Math.random().toString(36).substr(2, 9),
      produtoId: product.ID,
      produtoNome: product.PRODUTO || 'Sem nome',
      tipo: product.TIPO || '',
      precoUnitario: price,
      saldoInicial: saldoInicial,
      contagem: contagem,
      quantVendida: quantVendida,
      valorVendido: valorVendido,
      saldoFinal: 0,
    }

    setItems((prev) => [...prev, newItem])
  }

  // Update Contagem Logic
  const handleUpdateContagem = (uid: string, newContagem: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        // Mode check: In CAPTACAO, contagem should be locked, handled in UI.
        const contagem = Math.max(0, newContagem)

        // Automatic calculation for sold quantity and value based on Contagem
        // Formula: Quantidade Vendida = Saldo Inicial - CONTAGEM
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

  // Update Saldo Final Logic
  const handleUpdateSaldoFinal = (uid: string, newSaldo: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        const saldoFinal = Math.max(0, newSaldo)

        // Saldo Final is independent in terms of UI display for "Valor Vendido",
        // but "Novas Consignações" logic happens at Save/DB service level.
        return {
          ...item,
          saldoFinal,
        }
      }),
    )
  }

  // Remove Item
  const handleRemoveItem = (uid: string) => {
    setItems((prev) => prev.filter((i) => i.uid !== uid))
  }

  // Save Acerto
  const handleSave = async () => {
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

    setSaving(true)
    try {
      // Capture exact time for the batch
      const now = new Date()

      await bancoDeDadosService.saveTransaction(client, employee, items, now)

      toast({
        title: 'Sucesso',
        description: `${mode === 'CAPTACAO' ? 'Captação' : 'Acerto'} registrado com sucesso!`,
        className: 'bg-green-50 border-green-200 text-green-900',
      })

      // Reset
      setItems([])
      setClient(null)
      setIsClientConfirmed(false)
      setLastAcertoDate(null)
      navigate('/dashboard')
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
            <Link to="/dashboard">
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

      {/* Employee Info */}
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

      {/* Client Selection Section */}
      <div className="space-y-4">
        {!isClientConfirmed && <ClientSearch onSelect={handleClientSelect} />}

        {client && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Cliente Selecionado</h2>
                {loadingStatus && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {isClientConfirmed && (
                <Button variant="ghost" size="sm" onClick={handleChangeClient}>
                  Trocar Cliente
                </Button>
              )}
            </div>

            <ClientDetails client={client} lastAcertoDate={lastAcertoDate} />

            {/* Conditional Button Rendering based on Mode */}
            {!isClientConfirmed && !loadingStatus && (
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button
                  onClick={() => handleConfirmClient('ACERTO')}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  ACERTO CLIENTE
                </Button>

                {canCaptacao && (
                  <Button
                    onClick={() => handleConfirmClient('CAPTACAO')}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[160px]"
                    size="lg"
                  >
                    <Check className="mr-2 h-5 w-5" />
                    CAPTAÇÃO/RECOLOCAÇÃO
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Section (Only visible when confirmed) */}
      {isClientConfirmed && (
        <div className="space-y-4 animate-fade-in pt-4 border-t">
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

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            mode={mode}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
            <div className="text-sm text-muted-foreground">
              {mode === 'CAPTACAO'
                ? '* Em modo Captação, apenas o Saldo Final é editável.'
                : '* Saldo Inicial padrão é 0 para novos itens.'}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Valor Total Vendido
                </p>
                <p className="text-2xl font-bold text-green-600">
                  R${' '}
                  {items
                    .reduce((acc, item) => acc + item.valorVendido, 0)
                    .toFixed(2)
                    .replace('.', ',')}
                </p>
              </div>
              <Separator
                orientation="vertical"
                className="h-10 hidden sm:block"
              />
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleSave}
                disabled={saving || items.length === 0}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Finalizar {mode === 'ACERTO' ? 'Acerto' : 'Captação'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
