import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search } from 'lucide-react'

const GRUPOS = [
  'Alimentação',
  'Combustível',
  'Gasolina',
  'Outros',
  'Abastecimento',
  'Manutenção',
]

interface ExpenseFiltersProps {
  startDate: string
  setStartDate: (v: string) => void
  endDate: string
  setEndDate: (v: string) => void
  grupoFiltro: string
  setGrupoFiltro: (v: string) => void
  funcionarioFiltro: string
  setFuncionarioFiltro: (v: string) => void
  funcionarios: { id: number; nome: string }[]
  loading: boolean
  onFilter: () => void
}

export function ExpenseFilters({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  grupoFiltro,
  setGrupoFiltro,
  funcionarioFiltro,
  setFuncionarioFiltro,
  funcionarios,
  loading,
  onFilter,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col flex-wrap sm:flex-row gap-4 items-end">
      <div className="space-y-2 w-full sm:w-auto">
        <Label>Início</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="space-y-2 w-full sm:w-auto">
        <Label>Fim</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="space-y-2 w-full sm:w-auto min-w-[150px]">
        <Label>Grupo</Label>
        <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {GRUPOS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 w-full sm:w-auto min-w-[150px]">
        <Label>Funcionário</Label>
        <Select value={funcionarioFiltro} onValueChange={setFuncionarioFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {funcionarios.map((f) => (
              <SelectItem key={f.id} value={f.id.toString()}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={onFilter}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        Filtrar
      </Button>
    </div>
  )
}
