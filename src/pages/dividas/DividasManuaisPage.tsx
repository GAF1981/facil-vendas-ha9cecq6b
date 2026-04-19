import { useEffect, useState, useMemo } from 'react'
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
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { DividaManualFormDialog } from '@/components/dividas/DividaManualFormDialog'
import { DividasManuaisTable } from '@/components/dividas/DividasManuaisTable'
import { formatCurrency } from '@/lib/formatters'
import {
  CreditCard,
  Plus,
  Search,
  FileText,
  Banknote,
  Eraser,
  Filter,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DividasManuaisPage() {
  const { dividas, fetchDividas } = useDividasManuaisStore()

  const [search, setSearch] = useState('')
  const [tipoClienteFilter, setTipoClienteFilter] = useState('todos')
  const [valorParcFilter, setValorParcFilter] = useState('todos')
  const [formaCobrancaFilter, setFormaCobrancaFilter] = useState('todos')
  const [dataCombinadaFilter, setDataCombinadaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([
    'a vencer',
    'vencido',
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    )
  }

  useEffect(() => {
    fetchDividas()
  }, [fetchDividas])

  const uniqueTipos = useMemo(() => {
    const tipos = new Set<string>()
    dividas.forEach((d) => {
      if (d.CLIENTES?.['TIPO DE CLIENTE']) {
        tipos.add(d.CLIENTES['TIPO DE CLIENTE'])
      }
    })
    return Array.from(tipos).sort()
  }, [dividas])

  const uniqueValores = useMemo(() => {
    const vals = new Set<number>()
    dividas.forEach((d) => vals.add(d.valor_parcela))
    return Array.from(vals).sort((a, b) => a - b)
  }, [dividas])

  const uniqueFormasCobranca = useMemo(() => {
    const formas = new Set<string>()
    dividas.forEach((d) => {
      if (d.forma_cobranca) formas.add(d.forma_cobranca)
    })
    return Array.from(formas).sort()
  }, [dividas])

  const filteredData = useMemo(() => {
    return dividas.filter((d) => {
      const cName = (d.CLIENTES?.['NOME CLIENTE'] || '').toLowerCase()
      const matchesSearch =
        search === '' ||
        cName.includes(search.toLowerCase()) ||
        d.cliente_id.toString().includes(search)

      const matchesTipo =
        tipoClienteFilter === 'todos' ||
        d.CLIENTES?.['TIPO DE CLIENTE'] === tipoClienteFilter

      const matchesValor =
        valorParcFilter === 'todos' ||
        d.valor_parcela.toString() === valorParcFilter

      const matchesForma =
        formaCobrancaFilter === 'todos' ||
        (formaCobrancaFilter === 'VAZIO' && !d.forma_cobranca) ||
        d.forma_cobranca === formaCobrancaFilter

      const matchesDataComb =
        dataCombinadaFilter === '' || d.data_combinada === dataCombinadaFilter

      const isPaid = d.valor_pago >= d.valor_parcela
      const isOverdue =
        !isPaid &&
        new Date(d.vencimento) < new Date(new Date().setHours(0, 0, 0, 0))
      const status = isPaid ? 'pago' : isOverdue ? 'vencido' : 'a vencer'

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(status)

      return (
        matchesSearch &&
        matchesTipo &&
        matchesValor &&
        matchesForma &&
        matchesDataComb &&
        matchesStatus
      )
    })
  }, [
    dividas,
    search,
    tipoClienteFilter,
    valorParcFilter,
    formaCobrancaFilter,
    dataCombinadaFilter,
    statusFilter,
  ])

  const { saldoTotal, valorPagoTotal } = useMemo(() => {
    let saldo = 0
    let pago = 0
    filteredData.forEach((d) => {
      saldo += Math.max(0, d.valor_parcela - d.valor_pago)
      pago += d.valor_pago
    })
    return { saldoTotal: saldo, valorPagoTotal: pago }
  }, [filteredData])

  const resetFilters = () => {
    setSearch('')
    setTipoClienteFilter('todos')
    setValorParcFilter('todos')
    setFormaCobrancaFilter('todos')
    setDataCombinadaFilter('')
    setStatusFilter(['a vencer', 'vencido'])
  }

  const openNew = () => {
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Central de Dívida
          </h1>
          <p className="text-muted-foreground">
            Gestão de dívidas manuais, inclusão e parcelamento de acordos.
          </p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Incluir Dívida Manual
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo de Dívida
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {formatCurrency(saldoTotal)}
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
              R$ {formatCurrency(valorPagoTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center bg-muted/30 p-2 rounded-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={tipoClienteFilter}
              onValueChange={setTipoClienteFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {uniqueTipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={valorParcFilter} onValueChange={setValorParcFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Valor Parc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Valores</SelectItem>
                {uniqueValores.map((v) => (
                  <SelectItem key={v} value={v.toString()}>
                    R$ {formatCurrency(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formaCobrancaFilter}
              onValueChange={setFormaCobrancaFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Forma Cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Formas</SelectItem>
                <SelectItem value="VAZIO">VAZIO</SelectItem>
                {uniqueFormasCobranca.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[160px]">
              <Input
                type="date"
                value={dataCombinadaFilter}
                onChange={(e) => setDataCombinadaFilter(e.target.value)}
                title="Filtro Data Combinada"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] justify-between font-normal"
                >
                  <span className="truncate">
                    Status{' '}
                    {statusFilter.length > 0 ? `(${statusFilter.length})` : ''}
                  </span>
                  <Filter className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[160px]">
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('a vencer')}
                  onCheckedChange={() => toggleStatus('a vencer')}
                >
                  A Vencer
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('vencido')}
                  onCheckedChange={() => toggleStatus('vencido')}
                >
                  Vencido
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter.includes('pago')}
                  onCheckedChange={() => toggleStatus('pago')}
                >
                  Pago
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={resetFilters}
              title="Limpar Filtros"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <DividasManuaisTable data={filteredData as any} loading={false} />
        </CardContent>
      </Card>

      <DividaManualFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        debt={null}
      />
    </div>
  )
}
