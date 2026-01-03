import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { Button } from '@/components/ui/button'
import { Eraser, Search, Check, ChevronsUpDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

interface RotaFiltersProps {
  filters: RotaFilterState
  setFilters: (filters: RotaFilterState) => void
  sellers: Employee[]
  municipios: string[]
  routes: string[]
}

export function RotaFilters({
  filters,
  setFilters,
  sellers,
  municipios,
  routes,
}: RotaFiltersProps) {
  const handleChange = (key: keyof RotaFilterState, value: any) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      x_na_rota: 'todos',
      agregado: 'todos',
      vendedor: [],
      municipio: 'todos',
      grupo_rota: 'todos',
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '',
      estoque_min: '',
      estoque_max: '',
    })
  }

  const toggleSeller = (sellerId: string) => {
    const current = filters.vendedor
    if (current.includes(sellerId)) {
      handleChange(
        'vendedor',
        current.filter((id) => id !== sellerId),
      )
    } else {
      handleChange('vendedor', [...current, sellerId])
    }
  }

  const selectAllSellers = () => {
    handleChange(
      'vendedor',
      sellers.map((s) => s.id.toString()),
    )
  }

  const deselectAllSellers = () => {
    handleChange('vendedor', [])
  }

  return (
    <Card className="w-full bg-card border-b shadow-sm rounded-none sm:rounded-md">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-3 items-end">
          {/* Search + Clear */}
          <div className="col-span-2 md:col-span-4 lg:col-span-3 xl:col-span-3 flex flex-col gap-1.5">
            <Label htmlFor="search" className="text-xs font-semibold">
              Buscar Cliente
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, Código ou Referência..."
                  value={filters.search}
                  onChange={(e) => handleChange('search', e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-9 shrink-0 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                title="Limpar todos os filtros"
              >
                <Eraser className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Rota */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Rota</Label>
            <Select
              value={filters.grupo_rota}
              onValueChange={(v) => handleChange('grupo_rota', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {routes.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendedor */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Vendedor(es)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-9 w-full justify-between text-xs px-2"
                >
                  {filters.vendedor.length === 0 ? (
                    <span className="text-muted-foreground">Nenhum</span>
                  ) : filters.vendedor.length === sellers.length ? (
                    'Todos'
                  ) : filters.vendedor.length <= 2 ? (
                    sellers
                      .filter((s) => filters.vendedor.includes(s.id.toString()))
                      .map((s) => s.nome_completo.split(' ')[0])
                      .join(', ')
                  ) : (
                    `${filters.vendedor.length} selecionados`
                  )}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar vendedor..." />
                  <CommandList>
                    <CommandEmpty>Vendedor não encontrado.</CommandEmpty>
                    <CommandGroup>
                      <div className="flex items-center gap-2 p-2 border-b">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 w-full"
                          onClick={selectAllSellers}
                        >
                          Todos
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 w-full"
                          onClick={deselectAllSellers}
                        >
                          Nenhum
                        </Button>
                      </div>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.nome_completo}
                          onSelect={() => toggleSeller(seller.id.toString())}
                        >
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                              filters.vendedor.includes(seller.id.toString())
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50 [&_svg]:invisible',
                            )}
                          >
                            <Check className={cn('h-4 w-4')} />
                          </div>
                          <div className="flex flex-col">
                            <span>{seller.nome_completo}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {seller.situacao || 'ATIVO'}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Debito Filter - NEW */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">
              Débito Min (R$)
            </Label>
            <Input
              className="h-9 text-xs text-center"
              placeholder="0.00"
              type="number"
              value={filters.debito_min}
              onChange={(e) => handleChange('debito_min', e.target.value)}
            />
          </div>

          {/* Projeção Min */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">
              Projeção Min (R$)
            </Label>
            <Input
              className="h-9 text-xs text-center"
              placeholder="Min"
              type="number"
              value={filters.projecao_min}
              onChange={(e) => handleChange('projecao_min', e.target.value)}
            />
          </div>

          {/* X na Rota */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">xRota</Label>
            <Select
              value={filters.x_na_rota}
              onValueChange={(v) => handleChange('x_na_rota', v)}
            >
              <SelectTrigger className="h-9 text-xs px-2">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="1">1ª</SelectItem>
                <SelectItem value="2">2ª</SelectItem>
                <SelectItem value="3">3ª</SelectItem>
                <SelectItem value=">3">&gt;3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agregado */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold truncate">Agreg.</Label>
            <Select
              value={filters.agregado}
              onValueChange={(v) => handleChange('agregado', v)}
            >
              <SelectTrigger className="h-9 text-xs px-2">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="SIM">Sim</SelectItem>
                <SelectItem value="NÃO">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Município */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1 flex flex-col gap-1.5">
            <Label className="text-xs font-semibold">Município</Label>
            <Select
              value={filters.municipio}
              onValueChange={(v) => handleChange('municipio', v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {municipios.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
