import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DividasManuaisTable } from '@/components/dividas/DividasManuaisTable'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RotateCcw, FilterX, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import { NovaDividaModal } from '@/components/dividas/NovaDividaModal'

export default function DividasManuaisPage() {
  const [searchParams] = useSearchParams()
  const clienteIdParam = searchParams.get('cliente')

  const { dividas, fetchDividas, loading } = useDividasManuaisStore()
  const [search, setSearch] = useState(clienteIdParam || '')

  const [filterTipoCliente, setFilterTipoCliente] = useState('todos')
  const [filterValorParcela, setFilterValorParcela] = useState('todos')
  const [filterFormaCobranca, setFilterFormaCobranca] = useState('todos')
  const [filterDataCombinada, setFilterDataCombinada] = useState('')
  const [isNovaDividaOpen, setIsNovaDividaOpen] = useState(false)

  useEffect(() => {
    fetchDividas()
  }, [fetchDividas])

  const uniqueTipos = Array.from(
    new Set(
      dividas.map((d) => d.CLIENTES?.['TIPO DE CLIENTE']).filter(Boolean),
    ),
  ).sort()
  const uniqueValores = Array.from(
    new Set(
      dividas
        .map((d) => d.valor_parcela)
        .filter((v) => v !== null && v !== undefined),
    ),
  ).sort((a, b) => Number(a) - Number(b))
  const uniqueFormas = Array.from(
    new Set(dividas.map((d) => d.forma_cobranca).filter(Boolean)),
  ).sort()

  const filtered = dividas.filter((d) => {
    const matchSearch =
      String(d.cliente_id).includes(search) ||
      d.CLIENTES?.['NOME CLIENTE']
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      String(d.cobranca_seq).includes(search)

    const matchTipo =
      filterTipoCliente === 'todos' ||
      d.CLIENTES?.['TIPO DE CLIENTE'] === filterTipoCliente

    const matchValor =
      filterValorParcela === 'todos' ||
      String(d.valor_parcela) === filterValorParcela

    const matchForma =
      filterFormaCobranca === 'todos' ||
      (filterFormaCobranca === 'VAZIO' && !d.forma_cobranca) ||
      d.forma_cobranca === filterFormaCobranca

    const matchData =
      !filterDataCombinada || d.data_combinada === filterDataCombinada

    return matchSearch && matchTipo && matchValor && matchForma && matchData
  })

  const clearFilters = () => {
    setSearch('')
    setFilterTipoCliente('todos')
    setFilterValorParcela('todos')
    setFilterFormaCobranca('todos')
    setFilterDataCombinada('')
    fetchDividas()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Dívidas (Inclusão Manual)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie dívidas manuais e acompanhe boletos conferidos.
          </p>
        </div>
        <Button
          onClick={() => setIsNovaDividaOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Dívida
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-lg border">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] max-w-[300px]">
            <Input
              placeholder="Buscar cliente, código ou seq..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            value={filterTipoCliente}
            onValueChange={setFilterTipoCliente}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tipos (Todos)</SelectItem>
              {uniqueTipos.map((t) => (
                <SelectItem key={t as string} value={t as string}>
                  {t as string}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterValorParcela}
            onValueChange={setFilterValorParcela}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Valor Parcela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Valores (Todos)</SelectItem>
              {uniqueValores.map((v) => (
                <SelectItem key={String(v)} value={String(v)}>
                  R$ {formatCurrency(v as number)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterFormaCobranca}
            onValueChange={setFilterFormaCobranca}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Forma Cobrança" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Formas (Todas)</SelectItem>
              <SelectItem value="VAZIO">VAZIO</SelectItem>
              {uniqueFormas
                .filter((f) => f !== 'VAZIO' && f !== null && f !== undefined)
                .map((f) => (
                  <SelectItem key={f as string} value={f as string}>
                    {f as string}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filterDataCombinada}
              onChange={(e) => setFilterDataCombinada(e.target.value)}
              className="w-[140px]"
              title="Data Combinada"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={clearFilters}
              variant="outline"
              size="icon"
              title="Limpar Filtros"
            >
              <FilterX className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => fetchDividas()}
              variant="outline"
              size="icon"
              disabled={loading}
              title="Atualizar"
            >
              <RotateCcw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </div>

      <DividasManuaisTable data={filtered} loading={loading} />

      <NovaDividaModal
        open={isNovaDividaOpen}
        onOpenChange={setIsNovaDividaOpen}
        onSuccess={fetchDividas}
      />
    </div>
  )
}
