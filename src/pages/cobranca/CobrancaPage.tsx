import { useEffect, useState, useMemo } from 'react'
import { cobrancaService } from '@/services/cobrancaService'
import { boletoService } from '@/services/boletoService'
import { configService } from '@/services/configService'
import { ClientDebt } from '@/types/cobranca'
import { Boleto } from '@/types/boleto'
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
import {
  Loader2,
  Search,
  RefreshCw,
  HandCoins,
  Users,
  Banknote,
  CreditCard,
  FileText,
  Eraser,
  Trash2,
  CalendarX,
  AlertTriangle,
} from 'lucide-react'
import { DebtTable } from '@/components/cobranca/DebtTable'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { MultiSelect } from '@/components/common/MultiSelect'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { format, parseISO, isValid, startOfDay } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function CobrancaPage() {
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<ClientDebt[]>([])
  const [filteredDebts, setFilteredDebts] = useState<ClientDebt[]>([])
  const [boletos, setBoletos] = useState<Boleto[]>([])

  const [clientFilter, setClientFilter] = useState('')
  const [orderFilter, setOrderFilter] = useState('')

  const [clientTypeFilter, setClientTypeFilter] = useState<string>('ATIVO')
  const [formaPagamentoFilter, setFormaPagamentoFilter] =
    useState<string>('todos')

  const [statusFilter, setStatusFilter] = useState<string[]>([
    'VENCIDO',
    'A VENCER',
  ])
  const [cityFilter, setCityFilter] = useState<string>('todos')
  const [motoqueiroFilter, setMotoqueiroFilter] = useState<string>('todos')

  const [dataCombinadaRange, setDataCombinadaRange] = useState<
    DateRange | undefined
  >()
  const [vencimentoRange, setVencimentoRange] = useState<
    DateRange | undefined
  >()

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSimplified, setIsSimplified] = useState(true)
  const [activeTab, setActiveTab] = useState('geral')

  // Inactivity Alert State
  const [inactiveThreshold, setInactiveThreshold] = useState(10)
  const [inactiveClients, setInactiveClients] = useState<
    { clientId: number; clientName: string; days: number }[]
  >([])

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [debtsData, boletosData, thresholdStr] = await Promise.all([
        cobrancaService.getDebts(),
        boletoService.getAll(),
        configService.getConfig('dias_sem_acao_cobranca'),
      ])

      setDebts(debtsData)
      setBoletos(boletosData)

      const threshold = thresholdStr ? parseInt(thresholdStr, 10) : 10
      setInactiveThreshold(threshold)

      // Identify inactive clients
      const clientIds = debtsData
        .filter((d) => d.totalDebt > 0)
        .map((d) => d.clientId)

      if (clientIds.length > 0) {
        const { data: actions } = await supabase
          .from('acoes_cobranca')
          .select('cliente_id, data_acao, nova_data_combinada')
          .in('cliente_id', clientIds)

        const clientMaxDateMap = new Map<number, number>()

        const safeGetTime = (dStr: string | null | undefined) => {
          if (!dStr) return 0
          const d = parseISO(dStr)
          return isValid(d) ? startOfDay(d).getTime() : 0
        }

        actions?.forEach((a) => {
          const t1 = safeGetTime(a.data_acao)
          const t2 = safeGetTime(a.nova_data_combinada)
          const maxT = Math.max(t1, t2)

          if (maxT > 0) {
            const current = clientMaxDateMap.get(a.cliente_id) || 0
            if (maxT > current) {
              clientMaxDateMap.set(a.cliente_id, maxT)
            }
          }
        })

        const now = startOfDay(new Date()).getTime()
        const inactiveList: any[] = []

        debtsData.forEach((client) => {
          if (client.totalDebt <= 0) return

          let maxDateForClient = clientMaxDateMap.get(client.clientId) || 0

          client.orders.forEach((order) => {
            order.installments.forEach((inst) => {
              if (inst.status !== 'PAGO') {
                const tVenc = safeGetTime(inst.vencimento)
                const tComb = safeGetTime(inst.dataCombinada)
                if (tVenc > maxDateForClient) maxDateForClient = tVenc
                if (tComb > maxDateForClient) maxDateForClient = tComb
              }
            })
          })

          if (maxDateForClient > 0) {
            const diffDays = Math.floor(
              (now - maxDateForClient) / (1000 * 60 * 60 * 24),
            )
            if (diffDays > threshold) {
              inactiveList.push({
                clientId: client.clientId,
                clientName: client.clientName,
                days: diffDays,
              })
            }
          }
        })

        setInactiveClients(inactiveList.sort((a, b) => b.days - a.days))
      } else {
        setInactiveClients([])
      }
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
    const channel = supabase
      .channel('cobranca-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debitos_historico' },
        (payload) => {
          console.log('Debitos updated, refreshing...', payload)
          setTimeout(() => loadData(), 500)
        },
      )
      .subscribe()

    loadData()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const uniqueCities = Array.from(
    new Set(
      debts.map((d) => d.city).filter((c): c is string => !!c && c !== 'N/D'),
    ),
  ).sort()

  useEffect(() => {
    let result = debts

    if (clientFilter) {
      const lower = clientFilter.toLowerCase()
      result = result.filter(
        (d) =>
          d.clientName.toLowerCase().includes(lower) ||
          d.clientId.toString().includes(lower),
      )
    }

    if (orderFilter) {
      const lower = orderFilter.toLowerCase()
      result = result.filter((d) =>
        d.orders.some((o) => o.orderId.toString().includes(lower)),
      )
    }

    if (cityFilter !== 'todos') {
      result = result.filter((d) => d.city === cityFilter)
    }

    if (clientTypeFilter !== 'all') {
      result = result.filter((d) => d.clientType === clientTypeFilter)
    }

    const shouldIgnoreMotoqueiroFilter = activeTab === 'motoqueiro'

    if (
      statusFilter.length > 0 ||
      (!shouldIgnoreMotoqueiroFilter && motoqueiroFilter !== 'todos') ||
      dataCombinadaRange?.from ||
      vencimentoRange?.from
    ) {
      const fromStr = dataCombinadaRange?.from
        ? format(dataCombinadaRange.from, 'yyyy-MM-dd')
        : null
      const toStr = dataCombinadaRange?.to
        ? format(dataCombinadaRange.to, 'yyyy-MM-dd')
        : fromStr

      const vFromStr = vencimentoRange?.from
        ? format(vencimentoRange.from, 'yyyy-MM-dd')
        : null
      const vToStr = vencimentoRange?.to
        ? format(vencimentoRange.to, 'yyyy-MM-dd')
        : vFromStr

      result = result.filter((client) => {
        return client.orders.some((order) =>
          order.installments.some((inst) => {
            let matches = true

            if (statusFilter.length > 0 && !statusFilter.includes(inst.status))
              matches = false

            if (!shouldIgnoreMotoqueiroFilter && motoqueiroFilter !== 'todos') {
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

            if (fromStr) {
              if (!inst.dataCombinada) matches = false
              else if (
                inst.dataCombinada < fromStr ||
                inst.dataCombinada > toStr!
              )
                matches = false
            }

            if (vFromStr) {
              if (!inst.vencimento) matches = false
              else {
                const instVenc = inst.vencimento.substring(0, 10)
                if (instVenc < vFromStr || instVenc > vToStr!) matches = false
              }
            }

            return matches
          }),
        )
      })
    }

    setFilteredDebts(result)
  }, [
    debts,
    clientFilter,
    orderFilter,
    statusFilter,
    cityFilter,
    motoqueiroFilter,
    activeTab,
    clientTypeFilter,
    dataCombinadaRange,
    vencimentoRange,
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

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'motoqueiro') {
      setMotoqueiroFilter('todos')
    }
  }

  const { totalSaldoPagar, totalValorPago, totalDebito } = useMemo(() => {
    let saldo = 0
    let paid = 0
    let debt = 0

    const shouldIgnoreMotoqueiroFilter = activeTab === 'motoqueiro'
    const fromStr = dataCombinadaRange?.from
      ? format(dataCombinadaRange.from, 'yyyy-MM-dd')
      : null
    const toStr = dataCombinadaRange?.to
      ? format(dataCombinadaRange.to, 'yyyy-MM-dd')
      : fromStr

    const vFromStr = vencimentoRange?.from
      ? format(vencimentoRange.from, 'yyyy-MM-dd')
      : null
    const vToStr = vencimentoRange?.to
      ? format(vencimentoRange.to, 'yyyy-MM-dd')
      : vFromStr

    filteredDebts.forEach((client) => {
      client.orders.forEach((order) => {
        if (orderFilter && !order.orderId.toString().includes(orderFilter))
          return

        order.installments.forEach((inst) => {
          let matches = true

          if (statusFilter.length > 0 && !statusFilter.includes(inst.status))
            matches = false

          if (!shouldIgnoreMotoqueiroFilter && motoqueiroFilter !== 'todos') {
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

          if (fromStr) {
            if (!inst.dataCombinada) matches = false
            else if (
              inst.dataCombinada < fromStr ||
              inst.dataCombinada > toStr!
            )
              matches = false
          }

          if (vFromStr) {
            if (!inst.vencimento) matches = false
            else {
              const instVenc = inst.vencimento.substring(0, 10)
              if (instVenc < vFromStr || instVenc > vToStr!) matches = false
            }
          }

          if (matches) {
            const currentDebt = Math.max(
              0,
              inst.valorRegistrado - inst.valorPago,
            )
            saldo += inst.valorRegistrado
            paid += inst.valorPago
            debt += currentDebt
          }
        })
      })
    })

    return {
      totalSaldoPagar: saldo,
      totalValorPago: paid,
      totalDebito: debt,
    }
  }, [
    filteredDebts,
    orderFilter,
    statusFilter,
    motoqueiroFilter,
    activeTab,
    dataCombinadaRange,
    vencimentoRange,
  ])

  const handleBulkClearMotoqueiro = async () => {
    if (selectedItems.size === 0) return
    if (!confirm('Deseja remover "Motoqueiro" dos itens selecionados?')) return

    const items = Array.from(selectedItems).map((id) => {
      const [, orderId, receivableId] = id.split('-')
      return {
        receivableId: parseInt(receivableId),
        orderId: parseInt(orderId),
      }
    })

    try {
      await cobrancaService.bulkUpdateReceivables(items, {
        forma_cobranca: null,
      })
      toast({ title: 'Sucesso', description: 'Motoqueiro removido.' })
      setSelectedItems(new Set())
      loadData()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar.',
        variant: 'destructive',
      })
    }
  }

  const handleBulkClearDate = async () => {
    if (selectedItems.size === 0) return
    if (!confirm('Deseja limpar "Data Combinada" dos itens selecionados?'))
      return

    const items = Array.from(selectedItems).map((id) => {
      const [, orderId, receivableId] = id.split('-')
      return {
        receivableId: parseInt(receivableId),
        orderId: parseInt(orderId),
      }
    })

    try {
      await cobrancaService.bulkUpdateReceivables(items, {
        data_combinada: null,
      })
      toast({ title: 'Sucesso', description: 'Data combinada removida.' })
      setSelectedItems(new Set())
      loadData()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar.',
        variant: 'destructive',
      })
    }
  }

  const handleRefreshCourierRoute = async () => {
    await loadData()
    toast({
      title: 'Rota Atualizada',
      description: 'O painel do motoqueiro está sincronizado.',
    })
  }

  const statusOptions = [
    { label: 'Vencido', value: 'VENCIDO' },
    { label: 'A Vencer', value: 'A VENCER' },
    { label: 'Pago', value: 'PAGO' },
  ]

  const resetFilters = () => {
    setClientFilter('')
    setOrderFilter('')
    setStatusFilter(['VENCIDO', 'A VENCER'])
    setCityFilter('todos')
    setMotoqueiroFilter('todos')
    setClientTypeFilter('ATIVO')
    setFormaPagamentoFilter('todos')
    setDataCombinadaRange(undefined)
    setVencimentoRange(undefined)
  }

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

          <Button
            variant="outline"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {inactiveClients.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50/50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 font-bold">
            Ação Necessária: Clientes sem acompanhamento
          </AlertTitle>
          <AlertDescription className="mt-2 text-amber-900">
            <p className="mb-2">
              Os clientes abaixo estão sem ação de cobrança a mais de{' '}
              {inactiveThreshold} dias!
            </p>
            <div className="max-h-[120px] overflow-y-auto pr-2 space-y-1">
              {inactiveClients.map((c) => (
                <div
                  key={c.clientId}
                  className="text-sm bg-white/60 px-2 py-1 rounded border border-amber-200 flex justify-between"
                >
                  <span className="font-medium">
                    {c.clientName} (Cód: {c.clientId})
                  </span>
                  <span className="text-amber-700 font-bold">
                    {c.days} dias
                  </span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo a Pagar</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {formatCurrency(totalSaldoPagar)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {formatCurrency(totalValorPago)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Débito</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {formatCurrency(totalDebito)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 flex-wrap items-center">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente ou Código"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative w-full sm:w-[200px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nº Pedido"
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full md:w-[150px]">
              <Select
                value={clientTypeFilter}
                onValueChange={setClientTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                  <SelectItem value="INATIVO - ROTA">Inativo - Rota</SelectItem>
                  <SelectItem value="INATIVO-COBRANÇA">
                    Inativo - Cobrança
                  </SelectItem>
                  <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-[180px]">
              <Select
                value={formaPagamentoFilter}
                onValueChange={setFormaPagamentoFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="F. Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Pagamentos</SelectItem>
                  <SelectItem value="boleto conferido">
                    Boleto Conferido
                  </SelectItem>
                  <SelectItem value="boleto conferir">
                    Boleto Conferir
                  </SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-[200px]">
              <MultiSelect
                options={statusOptions}
                selected={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
                className="w-full"
              />
            </div>

            <div className="w-full md:w-[250px]">
              <DateRangePicker
                date={vencimentoRange}
                setDate={setVencimentoRange}
                placeholder="Filtro Vencimento"
              />
            </div>

            <div className="w-full md:w-[250px]">
              <DateRangePicker
                date={dataCombinadaRange}
                setDate={setDataCombinadaRange}
                placeholder="Filtro Data Combinada"
              />
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
            <Button
              variant="ghost"
              size="icon"
              onClick={resetFilters}
              title="Limpar filtros"
              className="text-muted-foreground hover:text-foreground"
            >
              <Eraser className="h-5 w-5" />
            </Button>
          </div>

          <Tabs
            defaultValue="geral"
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="geral" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Geral
              </TabsTrigger>
              <TabsTrigger
                value="motoqueiro"
                className="flex items-center gap-2"
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
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedItems.size > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkClearMotoqueiro}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Motoqueiro ({selectedItems.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkClearDate}
                    >
                      <CalendarX className="mr-2 h-4 w-4" />
                      Limpar Data ({selectedItems.size})
                    </Button>
                  </>
                )}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCourierRoute}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar Rota Motoqueiro
                  </Button>
                </div>
              </div>
              <DebtTable
                data={filteredDebts}
                boletos={boletos}
                onRefresh={loadData}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                isCobrancaMode={false}
                onToggleAll={handleToggleAll}
                isSimplified={isSimplified}
                statusFilter={statusFilter}
                motoqueiroFilter={motoqueiroFilter}
                orderFilter={orderFilter}
                showOnlySelected={false}
                formaPagamentoFilter={formaPagamentoFilter}
                dataCombinadaRange={dataCombinadaRange}
                vencimentoRange={vencimentoRange}
              />
            </TabsContent>

            <TabsContent value="motoqueiro" className="mt-4">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-md flex justify-between items-center">
                <div className="text-sm text-blue-800">
                  <span className="font-bold">{selectedItems.size}</span> itens
                  selecionados para rota de cobrança.
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshCourierRoute}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Atualizar Rota
                  </Button>
                  <Button size="sm" variant="outline">
                    Gerar PDF Rota
                  </Button>
                  <Button size="sm">Enviar para Motoqueiro</Button>
                </div>
              </div>
              <DebtTable
                data={filteredDebts}
                boletos={boletos}
                onRefresh={loadData}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                isCobrancaMode={true}
                onToggleAll={handleToggleAll}
                isSimplified={isSimplified}
                statusFilter={statusFilter}
                motoqueiroFilter={motoqueiroFilter}
                orderFilter={orderFilter}
                showOnlySelected={true}
                formaPagamentoFilter={formaPagamentoFilter}
                dataCombinadaRange={dataCombinadaRange}
                vencimentoRange={vencimentoRange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
