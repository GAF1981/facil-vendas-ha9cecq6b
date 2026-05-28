import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { Search } from 'lucide-react'

interface RotaFiltersProps {
  filters: RotaFilterState
  onFilterChange: (f: RotaFilterState) => void
  employees: Employee[]
  isGerencial: boolean
  setIsGerencial: (v: boolean) => void
}

export function RotaFilters({
  filters,
  onFilterChange,
  employees,
  isGerencial,
  setIsGerencial,
}: RotaFiltersProps) {
  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex-1 w-full flex flex-wrap gap-4 items-center">
          <div className="relative w-full md:w-auto md:min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange({ ...filters, search: e.target.value })
              }
              className="pl-9 w-full bg-background"
            />
          </div>
          <Select
            value={filters.vendedor.length ? filters.vendedor[0] : 'todos'}
            onValueChange={(v) =>
              onFilterChange({ ...filters, vendedor: v === 'todos' ? [] : [v] })
            }
          >
            <SelectTrigger className="w-full md:w-[200px] bg-background">
              <SelectValue placeholder="Vendedor Atual" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos (Vendedor Atual)</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.apelido || e.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.proximo_vendedor}
            onValueChange={(v) =>
              onFilterChange({ ...filters, proximo_vendedor: v })
            }
          >
            <SelectTrigger className="w-full md:w-[200px] bg-background">
              <SelectValue placeholder="Próximo Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos (Próximo Vendedor)</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.apelido || e.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isGerencial && (
            <Select
              value={filters.vencimento_status}
              onValueChange={(v) =>
                onFilterChange({ ...filters, vencimento_status: v })
              }
            >
              <SelectTrigger className="w-full md:w-[180px] bg-background">
                <SelectValue placeholder="Status Vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
                <SelectItem value="A VENCER">A Vencer</SelectItem>
                <SelectItem value="SEM DÉBITO">Sem Débito</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center space-x-2 shrink-0 bg-muted/50 p-2 rounded-md border">
          <Switch
            id="gerencial-mode"
            checked={isGerencial}
            onCheckedChange={setIsGerencial}
          />
          <Label
            htmlFor="gerencial-mode"
            className="text-sm font-medium cursor-pointer"
          >
            Modo Gerencial
          </Label>
        </div>
      </div>
    </div>
  )
}
