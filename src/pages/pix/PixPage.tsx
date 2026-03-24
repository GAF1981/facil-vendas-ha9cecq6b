import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw, Loader2, QrCode, ArrowLeft, X } from 'lucide-react'
import { PixTable } from '@/components/pix/PixTable'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { pixService } from '@/services/pixService'
import { PixReceiptRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/formatters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PixPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PixReceiptRow[]>([])

  // Filters
  const [filterClienteCodigo, setFilterClienteCodigo] = useState('')
  const [filterClienteNome, setFilterClienteNome] = useState('')
  const [filterPedido, setFilterPedido] = useState('')
  const [filterValor, setFilterValor] = useState<string>('all')

  const [selectedReceipt, setSelectedReceipt] = useState<PixReceiptRow | null>(
    null,
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'created_at', direction: 'desc' })

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixReceipts()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os recebimentos via Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const unconfirmedValues = useMemo(() => {
    const vals = data
      .filter((r) => !r.confirmado_por && r.valor_pago)
      .map((r) => r.valor_pago)
    return Array.from(new Set(vals)).sort((a, b) => a - b)
  }, [data])

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    if (filterClienteCodigo) {
      const lower = filterClienteCodigo.toLowerCase()
      result = result.filter((row) => row.cliente_id.toString().includes(lower))
    }

    if (filterClienteNome) {
      const lower = filterClienteNome.toLowerCase()
      result = result.filter(
        (row) =>
          row.cliente_nome.toLowerCase().includes(lower) ||
          (row.nome_no_pix && row.nome_no_pix.toLowerCase().includes(lower)),
      )
    }

    if (filterPedido) {
      const lower = filterPedido.toLowerCase()
      result = result.filter((row) => row.venda_id.toString().includes(lower))
    }

    if (filterValor !== 'all') {
      const val = parseFloat(filterValor)
      result = result.filter(
        (row) => row.valor_pago === val && !row.confirmado_por,
      )
    }

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof PixReceiptRow]
      let valB: any = b[sortConfig.key as keyof PixReceiptRow]

      if (valA === null || valA === undefined) valA = ''
      if (valB === null || valB === undefined) valB = ''

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [
    data,
    filterClienteCodigo,
    filterClienteNome,
    filterPedido,
    filterValor,
    sortConfig,
  ])

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleConfer = (receipt: PixReceiptRow) => {
    setSelectedReceipt(receipt)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Conferência de Pix
            </h1>
            <p className="text-muted-foreground">
              Validação e conferência de recebimentos via Pix.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recebimentos Pix</CardTitle>
          <CardDescription>
            Lista de recebimentos pendentes de conferência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código Cliente..."
                className="pl-8"
                value={filterClienteCodigo}
                onChange={(e) => setFilterClienteCodigo(e.target.value)}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome Cliente..."
                className="pl-8"
                value={filterClienteNome}
                onChange={(e) => setFilterClienteNome(e.target.value)}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Número Pedido..."
                className="pl-8"
                value={filterPedido}
                onChange={(e) => setFilterPedido(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterValor} onValueChange={setFilterValor}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Valor pendente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os valores</SelectItem>
                  {unconfirmedValues.map((v) => (
                    <SelectItem key={v} value={v.toString()}>
                      R$ {formatCurrency(v)} (Pendente)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(filterClienteCodigo ||
                filterClienteNome ||
                filterPedido ||
                filterValor !== 'all') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFilterClienteCodigo('')
                    setFilterClienteNome('')
                    setFilterPedido('')
                    setFilterValor('all')
                  }}
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PixTable
              data={filteredAndSortedData}
              onConfer={handleConfer}
              onSort={handleSort}
              sortConfig={sortConfig}
            />
          )}
        </CardContent>
      </Card>

      <PixConferenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        receipt={selectedReceipt}
        onSuccess={loadData}
      />
    </div>
  )
}
