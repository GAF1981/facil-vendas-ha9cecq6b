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
import { ClientRow } from '@/types/client'
import { ProductRow } from '@/types/product'
import { AcertoItem } from '@/types/acerto'
import { useToast } from '@/hooks/use-toast'
import { ProductSelector } from '@/components/acerto/ProductSelector'
import { AcertoTable } from '@/components/acerto/AcertoTable'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientDetails } from '@/components/acerto/ClientDetails'

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

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Handle Client Selection
  const handleClientSelect = async (selectedClient: ClientRow) => {
    setClient(selectedClient)
    setLastAcertoDate(null)

    try {
      // Fetch last acerto
      const lastDate = await acertoService.getLastAcertoDate(
        selectedClient.CODIGO,
      )
      setLastAcertoDate(lastDate)
    } catch (error) {
      console.error(error)
      // Non-blocking error
    }
  }

  // Handle Confirmation
  const handleConfirmClient = () => {
    if (!client) return
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

    const price = product.PREÇO
      ? parseFloat(product.PREÇO.replace(',', '.'))
      : 0
    const saldoInicial = 0 // Defaults to 0 as per user story

    // Initial calculation: Quant Vendida = Saldo Inicial - Contagem
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
      saldoFinal: 0, // Defaults to 0, independent
    }

    setItems((prev) => [...prev, newItem])
  }

  // Update Contagem Logic
  const handleUpdateContagem = (uid: string, newContagem: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        const contagem = Math.max(0, newContagem) // Ensure non-negative

        // Automatic calculation for sold quantity and value based on Contagem
        // Formula: Quantidade Vendida = Saldo Inicial - CONTAGEM
        const quantVendida = item.saldoInicial - contagem
        const valorVendido = quantVendida * item.precoUnitario

        return {
          ...item,
          contagem,
          quantVendida,
          valorVendido,
          // Saldo Final is independent, so we don't change it here
        }
      }),
    )
  }

  // Update Saldo Final Logic
  const handleUpdateSaldoFinal = (uid: string, newSaldo: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item

        const saldoFinal = Math.max(0, newSaldo) // Ensure non-negative

        // Saldo Final is independent, so no other calculations here
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
      const total = items.reduce((acc, item) => acc + item.valorVendido, 0)

      await acertoService.saveAcerto({
        clienteId: client.CODIGO,
        funcionarioId: employee.id,
        valorTotal: total,
        dataAcerto: new Date().toISOString(),
        itens: items,
        observacoes: 'Acerto realizado via App',
      })

      toast({
        title: 'Sucesso',
        description: 'Acerto registrado com sucesso!',
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
        description: 'Não foi possível registrar o acerto.',
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
              Acerto de Cliente
            </h1>
            <p className="text-muted-foreground">
              Controle de estoque e vendas por cliente.
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
              <h2 className="text-lg font-semibold">Cliente Selecionado</h2>
              {isClientConfirmed && (
                <Button variant="ghost" size="sm" onClick={handleChangeClient}>
                  Trocar Cliente
                </Button>
              )}
            </div>

            <ClientDetails client={client} lastAcertoDate={lastAcertoDate} />

            {!isClientConfirmed && (
              <div className="flex justify-start pt-2">
                <Button
                  onClick={handleConfirmClient}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  ACERTO CLIENTE
                </Button>
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
            </h2>
            <ProductSelector onSelect={handleAddProduct} />
          </div>

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
            <div className="text-sm text-muted-foreground">
              * Saldo Inicial padrão é 0 para novos itens.
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
                Finalizar Acerto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
