import { useState, useEffect, useMemo } from 'react'
import { vehicleService } from '@/services/vehicleService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, Search, Filter, X } from 'lucide-react'
import { Vehicle } from '@/types/vehicle'
import { Label } from '@/components/ui/label'

export function VehicleExpenseGallery() {
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('todos')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [minVal, setMinValue] = useState('')
  const [maxVal, setMaxValue] = useState('')

  useEffect(() => {
    vehicleService.getAll().then(setVehicles)
  }, [])

  useEffect(() => {
    loadExpenses()
  }, [vehicleFilter, dateStart, dateEnd]) // Reload on major filters

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await vehicleService.getExpenses({
        startDate: dateStart || undefined,
        endDate: dateEnd || undefined,
        vehicleId: vehicleFilter,
        excludeCaixa: true, // Filter out expenses that came from Cashier
      })
      setExpenses(data || [])
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Search (Provider, History/Detalhamento)
      if (search) {
        const lower = search.toLowerCase()
        const matchProvider = exp.prestador_servico
          ?.toLowerCase()
          .includes(lower)
        const matchHistory = exp.Detalhamento?.toLowerCase().includes(lower)
        const matchGroup = exp['Grupo de Despesas']
          ?.toLowerCase()
          .includes(lower)
        if (!matchProvider && !matchHistory && !matchGroup) return false
      }

      // Value Range
      if (minVal && exp.Valor < parseFloat(minVal)) return false
      if (maxVal && exp.Valor > parseFloat(maxVal)) return false

      return true
    })
  }, [expenses, search, minVal, maxVal])

  const resetFilters = () => {
    setSearch('')
    setVehicleFilter('todos')
    setDateStart('')
    setDateEnd('')
    setMinValue('')
    setMaxValue('')
  }

  return (
    <Card className="mt-6 border-l-4 border-l-blue-600">
      <CardHeader>
        <CardTitle className="text-xl flex justify-between items-center">
          <span>Galeria de Despesas de Veículos</span>
          <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Exclusivo Gestão de Frota
          </span>
        </CardTitle>
        <div className="flex flex-col gap-4 mt-4 p-4 bg-muted/20 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Busca (Histórico/Prestador)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Veículos</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minVal}
                  onChange={(e) => setMinValue(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxVal}
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={resetFilters} className="text-xs">
              <X className="mr-2 h-3 w-3" /> Limpar Filtros
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Detalhes / Histórico</TableHead>
                  <TableHead>Prestador</TableHead>
                  <TableHead className="text-right">Hodômetro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center h-24 text-muted-foreground"
                    >
                      Nenhuma despesa de frota encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-muted/30">
                      <TableCell>
                        {safeFormatDate(expense.Data, 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.VEICULOS?.placa || '-'}
                      </TableCell>
                      <TableCell>{expense['Grupo de Despesas']}</TableCell>
                      <TableCell
                        className="max-w-[200px] truncate"
                        title={expense.Detalhamento}
                      >
                        {expense.Detalhamento}
                      </TableCell>
                      <TableCell>{expense.prestador_servico || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {expense.hodometro || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {formatCurrency(expense.Valor)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.FUNCIONARIOS?.nome_completo || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
