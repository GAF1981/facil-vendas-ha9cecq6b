import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { startOfToday, startOfWeek, endOfWeek } from 'date-fns'

interface RecebimentoFiltersProps {
  searchTerm: string
  onSearchChange: (val: string) => void
  orderFilter: string
  onOrderFilterChange: (val: string) => void
  statusFilter: string
  onStatusFilterChange: (val: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function RecebimentoFilters({
  searchTerm,
  onSearchChange,
  orderFilter,
  onOrderFilterChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
}: RecebimentoFiltersProps) {
  const setToday = () => {
    onDateRangeChange({ from: startOfToday(), to: startOfToday() })
  }

  const setThisWeek = () => {
    onDateRangeChange({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    })
  }

  const clearDate = () => {
    onDateRangeChange(undefined)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-2 items-end">
      <div className="space-y-1 col-span-12 md:col-span-3">
        <Label htmlFor="search">Buscar (Nome ou Código)</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Nome do cliente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1 col-span-12 md:col-span-2">
        <Label htmlFor="orderFilter">Pedido</Label>
        <Input
          id="orderFilter"
          placeholder="Nº Pedido"
          value={orderFilter}
          onChange={(e) => onOrderFilterChange(e.target.value)}
        />
      </div>

      <div className="space-y-1 col-span-12 md:col-span-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDENTE">Pendentes</SelectItem>
            <SelectItem value="PAGO">Pagos</SelectItem>
            <SelectItem value="TODOS">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1 col-span-12 md:col-span-5 flex flex-col gap-2">
        <Label>Vencimento</Label>
        <div className="flex gap-2">
          <DateRangePicker
            date={dateRange}
            setDate={onDateRangeChange}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={setToday}
            className="px-2"
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setThisWeek}
            className="px-2"
          >
            Semana
          </Button>
          {dateRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDate}
              className="px-2 text-destructive"
            >
              X
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
