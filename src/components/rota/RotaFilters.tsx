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
import { Switch } from '@/components/ui/switch'

interface RotaFiltersProps {
  filters: RotaFilterState
  setFilters: (filters: RotaFilterState) => void
  sellers: Employee[]
  municipios: string[]
  routes: string[]
  isSelectionMode: boolean
  toggleSelectionMode: (value: boolean) => void
  isFiltrosActive: boolean
  toggleFiltros: (value: boolean) => void
  isGerencialActive: boolean
  toggleGerencial: (value: boolean) => void
  activeRotaId?: number
  onDataChange?: () => void
}

export function RotaFilters({
  filters,
  setFilters,
  sellers,
  municipios,
  routes,
  isSelectionMode,
  toggleSelectionMode,
  isFiltrosActive,
  toggleFiltros,
  isGerencialActive,
  toggleGerencial,
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
      proximo_vendedor: 'todos',
      municipio: 'todos',
      grupo_rota: 'todos',
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '',
      estoque_min: '',
      estoque_max: '',
      vencimento_status: 'todos',
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
      <CardContent className="p-2">
        <div className="flex flex-col gap-2">
          {/* Switches */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="selection-mode"
                checked={isSelectionMode}
                onCheckedChange={toggleSelectionMode}
                className="scale-75"
              />
              <Label
                htmlFor="selection-mode"
                className="text-xs cursor-pointer"
              >
                Simplificado
              </Label>
            </div>

            <div className="flex items-center space-x-2 border-l pl-4">
              <Switch
                id="filtros-mode"
                checked={isFiltrosActive}
                onCheckedChange={toggleFiltros}
                className="scale-75"
              />
              <Label htmlFor="filtros-mode" className="text-xs cursor-pointer">
                Filtros
              </Label>
            </div>

            <div className="flex items-center space-x-2 border-l pl-4">
              <Switch
                id="gerencial-mode"
                checked={isGerencialActive}
                onCheckedChange={toggleGerencial}
                className="scale-75"
              />
              <Label
                htmlFor="gerencial-mode"
                className="text-xs cursor-pointer"
              >
                Gerencial
              </Label>
            </div>
          </div>

          {/* Filters Row */}
          {!isFiltrosActive && (
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t">
              {/* Search */}
              <div className="relative flex-1 min-w-[150px] max-w-[240px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar Cliente..."
                  value={filters.search}
                  onChange={(e) => handleChange('search', e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Rota */}
              <div className="w-[100px]">
                <Select
                  value={filters.grupo_rota}
                  onValueChange={(v) => handleChange('grupo_rota', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Rota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Rota: Todas</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vendedor */}
              <div className="w-[120px]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-8 w-full justify-between text-xs px-2"
                    >
                      {filters.vendedor.length === 0 ? (
                        <span className="text-muted-foreground">Vendedor</span>
                      ) : filters.vendedor.length === sellers.length ? (
                        'Todos'
                      ) : filters.vendedor.length <= 1 ? (
                        sellers
                          .find((s) => s.id.toString() === filters.vendedor[0])
                          ?.nome_completo.split(' ')[0]
                      ) : (
                        `${filters.vendedor.length} sel.`
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
                              onSelect={() =>
                                toggleSeller(seller.id.toString())
                              }
                            >
                              <div
                                className={cn(
                                  'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                                  filters.vendedor.includes(
                                    seller.id.toString(),
                                  )
                                    ? 'bg-primary text-primary-foreground'
                                    : 'opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className={cn('h-4 w-4')} />
                              </div>
                              <div className="flex flex-col">
                                <span>{seller.nome_completo}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Próximo Filter */}
              <div className="w-[120px]">
                <Select
                  value={filters.proximo_vendedor}
                  onValueChange={(v) => handleChange('proximo_vendedor', v)}
                >
                  <SelectTrigger className="h-8 text-xs px-2 border-dashed border-purple-300">
                    <SelectValue placeholder="Próx. Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Próx: Todos</SelectItem>
                    {sellers.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.nome_completo.split(' ')[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="w-[90px]">
                <Select
                  value={filters.vencimento_status}
                  onValueChange={(v) => handleChange('vencimento_status', v)}
                >
                  <SelectTrigger className="h-8 text-xs px-2">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Status: Todos</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                    <SelectItem value="A VENCER">A Vencer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Municipio */}
              <div className="w-[100px]">
                <Select
                  value={filters.municipio}
                  onValueChange={(v) => handleChange('municipio', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Município" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Mun: Todos</SelectItem>
                    {municipios.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* xRota */}
              <div className="w-[80px]">
                <Select
                  value={filters.x_na_rota}
                  onValueChange={(v) => handleChange('x_na_rota', v)}
                >
                  <SelectTrigger className="h-8 text-xs px-2">
                    <SelectValue placeholder="xRota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">xRota: All</SelectItem>
                    <SelectItem value="1">1ª</SelectItem>
                    <SelectItem value="2">2ª</SelectItem>
                    <SelectItem value="3">3ª</SelectItem>
                    <SelectItem value=">3">&gt;3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                title="Limpar filtros"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
