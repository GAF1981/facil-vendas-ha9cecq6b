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
  const [vencimentoFilter, setVencimentoFilter] = useState<string>('')
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

    // Deep copy enough to modify nested arrays without affecting state directly
    res = res.map((client) => ({
      ...client,
      orders: client.orders.map((order) => ({
        ...order,
        installments: [...order.installments],
      })),
    }))

    // Filter Installments based on Vencimento
    if (vencimento) {
      const targetDate = parseISO(vencimento)
      res.forEach((client) => {
        client.orders.forEach((order) => {
          order.installments = order.installments.filter((inst) => {
            if (inst.vencimento) {
              return isSameDay(parseISO(inst.vencimento), targetDate)
            }
            return false
          })
        })
        // Remove orders with no matching installments
        client.orders = client.orders.filter((o) => o.installments.length > 0)
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
      res.forEach((client) => {
        client.orders.forEach((order) => {
          order.installments = order.installments.filter((inst) => {
            if (status === 'SEM DÉBITO') return inst.status === 'PAGO' // Treat as 'PAGO' in this context? Or strict
            if (status === 'A VENCER' || status === 'VENCIDO')
              return inst.status === status
            return true
          })
        })
        client.orders = client.orders.filter((o) => o.installments.length > 0)
      })
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

  // Summary Metrics based on filtered orders/installments
  const totalReceivable = filteredData.reduce(
    (acc, c) =>
      acc +
      c.orders.reduce(
        (oAcc, o) =>
          oAcc +
          o.installments.reduce(
            (iAcc, i) =>
              iAcc +
              (i.status !== 'PAGO' ? i.valorRegistrado - i.valorPago : 0),
            0,
          ),
        0,
      ),
    0,
  )

  const countVencidos = filteredData.reduce(
    (acc, c) =>
      acc +
      c.orders.reduce(
        (oAcc, o) =>
          oAcc + o.installments.filter((i) => i.status === 'VENCIDO').length,
        0,
      ),
    0,
  )

  // Count total displayed rows (installments)
  const totalRows = filteredData.reduce(
    (acc, c) =>
      acc + c.orders.reduce((oAcc, o) => oAcc + o.installments.length, 0),
    0,
  )

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
              Gestão de inadimplência e monitoramento de parcelas.
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
              Soma das parcelas em aberto listadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Itens Listados
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRows}</div>
            <p className="text-xs text-muted-foreground">
              Parcelas/Registros encontrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Parcelas Vencidas
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
                  <SelectItem value="SEM DÉBITO">Pago / Sem Débito</SelectItem>
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
        <DebtTable data={filteredData} onRefresh={fetchDebts} />
      )}
    </div>
  )
}
