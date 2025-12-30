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
import { Eraser } from 'lucide-react'

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
      x_na_rota: 'todos',
      agregado: 'todos',
      vendedor: 'todos',
      municipio: 'todos',
      tipo_cliente: 'todos',
      debito_min: '',
      debito_max: '',
      data_acerto_start: '',
      data_acerto_end: '',
      projecao_min: '',
      projecao_max: '',
      estoque_min: '',
      estoque_max: '',
    })
  }

  return (
    <div className="space-y-2 p-3 bg-card border rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Filtros Avançados
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-6 px-2 text-xs"
        >
          <Eraser className="w-3 h-3 mr-1" /> Limpar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Select
          value={filters.x_na_rota}
          onValueChange={(v) => handleChange('x_na_rota', v)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="x na ROTA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">x na ROTA: Todos</SelectItem>
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
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Agregado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Agregado: Todos</SelectItem>
            <SelectItem value="SIM">Sim</SelectItem>
            <SelectItem value="NÃO">Não</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.vendedor}
          onValueChange={(v) => handleChange('vendedor', v)}
        >
          <SelectTrigger className="h-7 text-xs">
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

        <Select
          value={filters.municipio}
          onValueChange={(v) => handleChange('municipio', v)}
        >
          <SelectTrigger className="h-7 text-xs">
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
          value={filters.tipo_cliente}
          onValueChange={(v) => handleChange('tipo_cliente', v)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Tipo de Cliente" />
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
        <div className="flex gap-1 items-center">
          <span className="text-[10px] w-12 font-medium text-muted-foreground">
            Débito:
          </span>
          <Input
            className="h-7 text-xs"
            placeholder="Min"
            type="number"
            value={filters.debito_min}
            onChange={(e) => handleChange('debito_min', e.target.value)}
          />
          <Input
            className="h-7 text-xs"
            placeholder="Max"
            type="number"
            value={filters.debito_max}
            onChange={(e) => handleChange('debito_max', e.target.value)}
          />
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-[10px] w-12 font-medium text-muted-foreground">
            Projeção:
          </span>
          <Input
            className="h-7 text-xs"
            placeholder="Min"
            type="number"
            value={filters.projecao_min}
            onChange={(e) => handleChange('projecao_min', e.target.value)}
          />
          <Input
            className="h-7 text-xs"
            placeholder="Max"
            type="number"
            value={filters.projecao_max}
            onChange={(e) => handleChange('projecao_max', e.target.value)}
          />
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-[10px] w-12 font-medium text-muted-foreground">
            Estoque:
          </span>
          <Input
            className="h-7 text-xs"
            placeholder="Min"
            type="number"
            value={filters.estoque_min}
            onChange={(e) => handleChange('estoque_min', e.target.value)}
          />
          <Input
            className="h-7 text-xs"
            placeholder="Max"
            type="number"
            value={filters.estoque_max}
            onChange={(e) => handleChange('estoque_max', e.target.value)}
          />
        </div>

        <div className="flex gap-1 items-center">
          <span className="text-[10px] w-12 font-medium text-muted-foreground">
            Acerto:
          </span>
          <Input
            className="h-7 text-xs px-1"
            type="date"
            value={filters.data_acerto_start}
            onChange={(e) => handleChange('data_acerto_start', e.target.value)}
          />
          <Input
            className="h-7 text-xs px-1"
            type="date"
            value={filters.data_acerto_end}
            onChange={(e) => handleChange('data_acerto_end', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
