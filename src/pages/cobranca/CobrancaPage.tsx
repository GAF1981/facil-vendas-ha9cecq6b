import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  Search,
  RefreshCw,
  Loader2,
  Filter,
  Calendar,
} from 'lucide-react'
import { DebtTable } from '@/components/cobranca/DebtTable'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt } from '@/types/cobranca'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { parseISO, isSameDay } from 'date-fns'

export default function CobrancaPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ClientDebt[]>([])
  const [filteredData, setFilteredData] = useState<ClientDebt[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [vencimentoFilter, setVencimentoFilter] = useState<string>('') // New Date Filter
  const { toast } = useToast()

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const result = await cobrancaService.getDebts()
      setData(result)
      applyFilters(
        result,
        searchTerm,
        statusFilter,
        typeFilter,
        vencimentoFilter,
      )
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar cobranças',
        description: 'Não foi possível carregar a lista de débitos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebts()
  }, [])

  const applyFilters = (
    source: ClientDebt[],
    search: string,
    status: string,
    type: string,
    vencimento: string,
  ) => {
    let res = [...source]

    // 1. Pre-filtering orders inside clients if necessary?
    // The DebtTable flattens data. Filtering clients implies removing clients or filtering their orders?
    // Usually filters apply to the visible rows.
    // Since DebtTable shows Orders, we should filter Clients to only include those with matching Orders,
    // OR filter orders inside clients.
    // Let's filter Clients based on their content, but for "Vencimento" it's tricky if we don't modify the orders array.
    // The best approach is to filter `orders` inside each client, then remove clients with empty orders.

    // We clone the data structure to avoid mutation issues
    res = res.map((client) => ({
      ...client,
      orders: [...client.orders],
    }))

    // Filter Orders first based on Vencimento
    if (vencimento) {
      const targetDate = parseISO(vencimento)
      res.forEach((client) => {
        client.orders = client.orders.filter((order) => {
          // Check payment details for matching due date
          // Or verify if `oldestOverdueDate` matches?
          // Prompt says "Data de Vencimento" filter.
          // Orders have `paymentDetails` with due dates.
          // We check if ANY installment matches the date?
          // Or if the MAIN due date matches?
          // Let's check if any scheduled payment matches the date.
          const hasMatch = order.paymentDetails.some((p) => {
            if (p.dueDate && isSameDay(parseISO(p.dueDate), targetDate))
              return true
            if (p.details)
              return p.details.some((d) =>
                isSameDay(parseISO(d.dueDate), targetDate),
              )
            return false
          })
          return hasMatch
        })
      })
      // Remove clients with no matching orders
      res = res.filter((c) => c.orders.length > 0)
    }

    if (search.trim()) {
      const lowerSearch = search.toLowerCase()
      res = res.filter(
        (c) =>
          c.clientName.toLowerCase().includes(lowerSearch) ||
          c.clientId.toString().includes(lowerSearch),
      )
    }

    if (status !== 'todos') {
      if (status === 'SEM DÉBITO') {
        // Show clients/orders with 'SEM DÉBITO' status
        res.forEach((client) => {
          client.orders = client.orders.filter((o) => o.status === 'SEM DÉBITO')
        })
      } else {
        // For 'A VENCER' or 'VENCIDO'
        res.forEach((client) => {
          client.orders = client.orders.filter((o) => o.status === status)
        })
      }
      res = res.filter((c) => c.orders.length > 0)
    }

    if (type !== 'all') {
      res = res.filter((c) => c.clientType === type)
    }

    setFilteredData(res)
  }

  // Handle filter changes
  useEffect(() => {
    applyFilters(data, searchTerm, statusFilter, typeFilter, vencimentoFilter)
  }, [searchTerm, statusFilter, typeFilter, vencimentoFilter, data])

  // Summary Metrics based on filtered orders
  const totalReceivable = filteredData.reduce(
    (acc, c) => acc + c.orders.reduce((oAcc, o) => oAcc + o.remainingValue, 0),
    0,
  )

  const countVencidos = filteredData.reduce(
    (acc, c) => acc + c.orders.filter((o) => o.status === 'VENCIDO').length,
    0,
  )

  // Count total displayed orders (rows)
  const totalOrders = filteredData.reduce((acc, c) => acc + c.orders.length, 0)

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-lg shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cobrança</h1>
            <p className="text-muted-foreground">
              Gestão de inadimplência e monitoramento de débitos.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchDebts} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total a Receber (Filtro)
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalReceivable)}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma dos débitos listados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Listados
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">Pedidos encontrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pedidos Vencidos
            </CardTitle>
            <div className="h-4 w-4 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {countVencidos}
            </div>
            <p className="text-xs text-muted-foreground">Status VENCIDO</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Refine a lista para focar nas cobranças prioritárias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="A VENCER">A Vencer</SelectItem>
                  <SelectItem value="VENCIDO">Vencido</SelectItem>
                  <SelectItem value="SEM DÉBITO">Sem Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[180px]">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8"
                  value={vencimentoFilter}
                  onChange={(e) => setVencimentoFilter(e.target.value)}
                  placeholder="Vencimento"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && data.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DebtTable data={filteredData} />
      )}
    </div>
  )
}
