import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { Button } from '@/components/ui/button'
import { Eraser, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface RotaFiltersProps {
  filters: RotaFilterState
  setFilters: (filters: RotaFilterState) => void
  sellers: Employee[]
  municipios: string[]
  clientTypes: string[]
}

export function RotaFilters({
  filters,
  setFilters,
  sellers,
  municipios,
  clientTypes,
}: RotaFiltersProps) {
  const handleChange = (key: keyof RotaFilterState, value: string) => {
    setFilters({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      x_na_rota: 'todos',
      agregado: 'todos',
      vendedor: 'todos',
      municipio: 'todos',
      tipo_cliente: 'todos', // Reset to ALL when cleared manually
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '', // Reset to Empty when cleared manually
      projecao_max: '',
      estoque_min: '',
      estoque_max: '',
    })
  }

  return (
    <Card className="flex-[3] p-1.5 bg-card border shadow-sm">
      <div className="flex flex-col gap-1.5">
        {/* Top Row: Search + Clear */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar (Nome/Cód)..."
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              className="pl-7 h-7 text-xs bg-muted/30"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Eraser className="w-3 h-3 mr-1" /> Limpar
          </Button>
        </div>

        {/* Filters Grid - High Density */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-1">
          <Select
            value={filters.tipo_cliente}
            onValueChange={(v) => handleChange('tipo_cliente', v)}
          >
            <SelectTrigger className="h-6 text-[10px] px-2">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Tipo: Todos</SelectItem>
              {clientTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-0.5 items-center col-span-2 sm:col-span-1">
            <Input
              className="h-6 text-[10px] px-1 text-center placeholder:text-muted-foreground/50"
              placeholder="Proj. Min"
              type="number"
              value={filters.projecao_min}
              onChange={(e) => handleChange('projecao_min', e.target.value)}
              title="Projeção Mínima"
            />
            <span className="text-[10px] text-muted-foreground">-</span>
            <Input
              className="h-6 text-[10px] px-1 text-center placeholder:text-muted-foreground/50"
              placeholder="Max"
              type="number"
              value={filters.projecao_max}
              onChange={(e) => handleChange('projecao_max', e.target.value)}
              title="Projeção Máxima"
            />
          </div>

          <Select
            value={filters.x_na_rota}
            onValueChange={(v) => handleChange('x_na_rota', v)}
          >
            <SelectTrigger className="h-6 text-[10px] px-2">
              <SelectValue placeholder="X Rota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">X Rota: Todos</SelectItem>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value=">3">{'>'} 3</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.agregado}
            onValueChange={(v) => handleChange('agregado', v)}
          >
            <SelectTrigger className="h-6 text-[10px] px-2">
              <SelectValue placeholder="Agregado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Agregado: Todos</SelectItem>
              <SelectItem value="SIM">Sim</SelectItem>
              <SelectItem value="NÃO">Não</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.municipio}
            onValueChange={(v) => handleChange('municipio', v)}
          >
            <SelectTrigger className="h-6 text-[10px] px-2">
              <SelectValue placeholder="Município" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Município: Todos</SelectItem>
              {municipios.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.vendedor}
            onValueChange={(v) => handleChange('vendedor', v)}
          >
            <SelectTrigger className="h-6 text-[10px] px-2">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Vendedor: Todos</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-0.5 items-center col-span-2">
            <Input
              className="h-6 text-[10px] px-1 placeholder:text-muted-foreground/50"
              type="date"
              value={filters.data_acerto_start}
              onChange={(e) =>
                handleChange('data_acerto_start', e.target.value)
              }
              title="Acerto Início"
            />
            <Input
              className="h-6 text-[10px] px-1 placeholder:text-muted-foreground/50"
              type="date"
              value={filters.data_acerto_end}
              onChange={(e) => handleChange('data_acerto_end', e.target.value)}
              title="Acerto Fim"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
