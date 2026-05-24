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

interface RotaFiltersProps {
  filters: RotaFilterState
  setFilters: React.Dispatch<React.SetStateAction<RotaFilterState>>
  employees: Employee[]
}

export function RotaFilters({
  filters,
  setFilters,
  employees,
}: RotaFiltersProps) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }))
  }

  const handleStatusChange = (val: string) => {
    setFilters((prev) => ({ ...prev, status_vendedor: val }))
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-2">
      <div className="w-full sm:w-1/3">
        <Input
          placeholder="Buscar cliente, razão social ou município..."
          value={filters.search}
          onChange={handleSearch}
        />
      </div>
      <div className="w-full sm:w-1/4">
        <Select
          value={filters.status_vendedor}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status do Vendedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="com_vendedor">Com Vendedor</SelectItem>
            <SelectItem value="sem_vendedor">Sem Vendedor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
