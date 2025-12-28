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
import { AcertoItem, LastAcertoInfo } from '@/types/acerto'
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

  const [client, setClient] = useState<ClientRow | null>(null)
  const [isClientConfirmed, setIsClientConfirmed] = useState(false)
  const [lastAcerto, setLastAcerto] = useState<LastAcertoInfo | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [items, setItems] = useState<AcertoItem[]>([])
  const [saving, setSaving] = useState(false)

  const [mode, setMode] = useState<'ACERTO' | 'CAPTACAO'>('ACERTO')
  const [acertoTipo, setAcertoTipo] = useState<string>('ACERTO')
  const [loadingStatus, setLoadingStatus] = useState(false)

  // State for automatic order number
  const [nextOrderNumber, setNextOrderNumber] = useState<number | null>(null)
  // Ref for automatic Item ID generation (sequential)
  const nextItemIdRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Effect to fetch next order number and max item ID when client is confirmed
  useEffect(() => {
    if (isClientConfirmed) {
      setNextOrderNumber(null)
      nextItemIdRef.current = null

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

      // Fetch Max Item ID for sequential generation
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
    } else {
      setNextOrderNumber(null)
      nextItemIdRef.current = null
    }
  }, [isClientConfirmed, toast])

  const handleClientSelect = async (selectedClient: ClientRow) => {
    setClient(selectedClient)
    setLastAcerto(null)
    setLoadingStatus(true)

    try {
      const info = await acertoService.getLastAcerto(selectedClient.CODIGO)
      setLastAcerto(info)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar o último acerto.',
        variant: 'destructive',
      })
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleConfirmClient = (selectedMode: 'ACERTO' | 'CAPTACAO') => {
    if (!client) return
    setMode(selectedMode)
    setAcertoTipo(selectedMode === 'CAPTACAO' ? 'CAPTAÇÃO' : 'ACERTO')
    setIsClientConfirmed(true)
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
    setLastAcerto(null)
    setMode('ACERTO')
    setAcertoTipo('ACERTO')
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
      const now = new Date()

      // 1. Save to Database
      await bancoDeDadosService.saveTransaction(
        client,
        employee,
        items,
        now,
        acertoTipo,
      )

      // 2. Generate and Download PDF
      try {
        const total = items.reduce((acc, item) => acc + item.valorVendido, 0)

        const pdfBlob = await acertoService.generatePdf({
          client,
          employee,
          items,
          date: now.toISOString(),
          acertoTipo,
          total,
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
      setLastAcerto(null)
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

            <ClientDetails client={client} lastAcerto={lastAcerto} />

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

                <Button
                  onClick={() => handleConfirmClient('CAPTACAO')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900 min-w-[160px]"
                  size="lg"
                >
                  <Check className="mr-2 h-5 w-5" />
                  CAPTAÇÃO
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isClientConfirmed && (
        <div className="space-y-4 animate-fade-in pt-4 border-t">
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

          <AcertoTable
            items={items}
            onUpdateContagem={handleUpdateContagem}
            onUpdateSaldoFinal={handleUpdateSaldoFinal}
            onRemoveItem={handleRemoveItem}
            mode={mode}
            acertoTipo={acertoTipo}
          />

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card border p-4 rounded-lg shadow-sm">
            <div className="text-sm text-muted-foreground">
              {acertoTipo === 'CAPTAÇÃO' || acertoTipo === 'COMPLEMENTO'
                ? '* A Contagem é preenchida automaticamente para este tipo de operação.'
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
    </div>
  )
}
