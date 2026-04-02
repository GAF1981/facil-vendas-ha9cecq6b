import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Props {
  searchTerm: string
  onSearchChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  onClear: () => void
}

export function QuitarDividaFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onClear,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center p-4">
      <Input
        placeholder="Buscar por cliente ou dívida (C1...)"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full sm:max-w-xs"
      />
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:max-w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TODOS">Todos</SelectItem>
          <SelectItem value="PENDENTE">Pendentes</SelectItem>
          <SelectItem value="PAGO">Pagos</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="ghost" onClick={onClear}>
        Limpar Filtros
      </Button>
    </div>
  )
}
