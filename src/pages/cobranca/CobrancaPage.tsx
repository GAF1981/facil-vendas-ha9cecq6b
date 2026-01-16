import { useEffect, useState } from 'react'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt } from '@/types/cobranca'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search, RefreshCw, HandCoins, Users } from 'lucide-react'
import { DebtTable } from '@/components/cobranca/DebtTable'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function CobrancaPage() {
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<ClientDebt[]>([])
  const [filteredDebts, setFilteredDebts] = useState<ClientDebt[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  // Updated status filter to normalized 'VENCIDO'
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [cityFilter, setCityFilter] = useState<string>('todos')
  // New Filters
  const [motoqueiroFilter, setMotoqueiroFilter] = useState<string>('todos')
  const [dataCombinadaFilter, setDataCombinadaFilter] = useState<string>('')

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSimplified, setIsSimplified] = useState(false)
  const { toast } = useToast()

  const loadDebts = async () => {
    setLoading(true)
    try {
      const data = await cobrancaService.getDebts()
      setDebts(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de cobrança.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebts()
  }, [])

  // Derived Filters
  const uniqueCities = Array.from(
    new Set(
      debts.map((d) => d.city).filter((c): c is string => !!c && c !== 'N/D'),
    ),
  ).sort()

  useEffect(() => {
    let result = debts

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (d) =>
          d.clientName.toLowerCase().includes(lower) ||
          d.clientId.toString().includes(lower) ||
          d.orders.some((o) => o.orderId.toString().includes(lower)),
      )
    }

    // City Filter
    if (cityFilter !== 'todos') {
      result = result.filter((d) => d.city === cityFilter)
    }

    if (
      statusFilter !== 'todos' ||
      motoqueiroFilter !== 'todos' ||
      dataCombinadaFilter
    ) {
      result = result.filter((client) => {
        return client.orders.some((order) =>
          order.installments.some((inst) => {
            let matches = true
            if (statusFilter !== 'todos' && inst.status !== statusFilter)
              matches = false
            if (
              dataCombinadaFilter &&
              inst.dataCombinada !== dataCombinadaFilter
            )
              matches = false
            if (motoqueiroFilter !== 'todos') {
              if (
                motoqueiroFilter === 'com_rota' &&
                inst.formaCobranca !== 'MOTOQUEIRO'
              )
                matches = false
              if (
                motoqueiroFilter === 'sem_rota' &&
                inst.formaCobranca === 'MOTOQUEIRO'
              )
                matches = false
            }
            return matches
          }),
        )
      })
    }

    setFilteredDebts(result)
  }, [
    debts,
    searchTerm,
    statusFilter,
    cityFilter,
    motoqueiroFilter,
    dataCombinadaFilter,
  ])

  const handleToggleItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleToggleAll = (ids: string[]) => {
    const newSelected = new Set(selectedItems)
    const allSelected = ids.every((id) => newSelected.has(id))

    if (allSelected) {
      ids.forEach((id) => newSelected.delete(id))
    } else {
      ids.forEach((id) => newSelected.add(id))
    }
    setSelectedItems(newSelected)
  }

  const totalDebt = filteredDebts.reduce((acc, curr) => acc + curr.totalDebt, 0)
  const totalClients = filteredDebts.length

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="h-8 w-8 text-blue-600" />
            Central de Cobrança
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de inadimplência e acordos.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="simplified-mode"
              checked={isSimplified}
              onCheckedChange={setIsSimplified}
            />
            <Label htmlFor="simplified-mode">Cobrança simplificado</Label>
          </div>

          <Button variant="outline" onClick={loadDebts} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total em Débito
            </CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalClients} clientes listados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, código ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="VENCIDO">vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]">
              <Select
                value={motoqueiroFilter}
                onValueChange={setMotoqueiroFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rota Motoqueiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="com_rota">Com Rota</SelectItem>
                  <SelectItem value="sem_rota">Sem Rota</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[150px]">
              <Input
                type="date"
                value={dataCombinadaFilter}
                onChange={(e) => setDataCombinadaFilter(e.target.value)}
                className="w-full"
                placeholder="Data Combinada"
              />
            </div>
            <div className="w-full md:w-[150px]">
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Cidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Cidades</SelectItem>
                  {uniqueCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="geral" className="w-full">
            <TabsList>
              <TabsTrigger value="geral" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Geral
              </TabsTrigger>
              <TabsTrigger
                value="motoqueiro"
                className="flex items-center gap-2"
                onClick={() => setMotoqueiroFilter('com_rota')} // Auto set filter for convenience
              >
                Rota Motoqueiro
                {selectedItems.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedItems.size}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-4">
              <DebtTable
                data={filteredDebts}
                onRefresh={loadDebts}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                isCobrancaMode={false}
                onToggleAll={handleToggleAll}
                isSimplified={isSimplified}
                statusFilter={statusFilter}
                motoqueiroFilter={motoqueiroFilter}
                dataCombinadaFilter={dataCombinadaFilter}
              />
            </TabsContent>

            <TabsContent value="motoqueiro" className="mt-4">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center">
                <div className="text-sm text-blue-800">
                  <span className="font-bold">{selectedItems.size}</span> itens
                  selecionados para rota de cobrança.
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Gerar PDF Rota
                  </Button>
                  <Button size="sm">Enviar para Motoqueiro</Button>
                </div>
              </div>
              <DebtTable
                data={filteredDebts}
                onRefresh={loadDebts}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                isCobrancaMode={true}
                onToggleAll={handleToggleAll}
                isSimplified={isSimplified}
                statusFilter={statusFilter}
                motoqueiroFilter="com_rota" // Force filter here? No, let user logic prevail or just force it for this view.
                dataCombinadaFilter={dataCombinadaFilter}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
