import { useEffect, useState, useMemo } from 'react'
import {
  quitarDividaService,
  QuitarDividaItem,
} from '@/services/quitarDividaService'
import { Button } from '@/components/ui/button'
import { RotateCcw, CheckSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuitarDividaPaymentDialog } from './QuitarDividaPaymentDialog'
import { QuitarDividaFilters } from './QuitarDividaFilters'
import { QuitarDividaTable } from './QuitarDividaTable'

export default function QuitarDividaPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<QuitarDividaItem[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'PENDENTE' | 'PAGO' | 'TODOS'
  >('PENDENTE')

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await quitarDividaService.getPendingDividas({
        search: searchTerm,
        status: statusFilter,
      })
      setItems(data)

      if (selectedId && !data.find((i) => i.id === selectedId)) {
        setSelectedId(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as dívidas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter])

  const handleSelect = (id: number) => {
    setSelectedId(selectedId === id ? null : id)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('PENDENTE')
  }

  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedId) || null
  }, [items, selectedId])

  const handleProcessPayment = async (
    id: number,
    amount: number,
    date: string,
    method: string,
  ) => {
    try {
      await quitarDividaService.processPayment(id, amount, date, method)
      toast({
        title: 'Sucesso',
        description: 'Quitação de dívida processada com sucesso.',
        className: 'bg-green-600 text-white',
      })
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao processar quitação.',
        variant: 'destructive',
      })
      throw error
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Quitar Dívida
          </h1>
          <p className="text-muted-foreground">
            Gerencie quitações e pagamentos de dívidas manuais.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RotateCcw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!selectedId}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Processar Pagamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <QuitarDividaFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={(v) => setStatusFilter(v as any)}
            onClear={handleClearFilters}
          />
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <QuitarDividaTable
            loading={loading}
            items={items}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </CardContent>
      </Card>

      <QuitarDividaPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        onConfirm={handleProcessPayment}
      />
    </div>
  )
}
