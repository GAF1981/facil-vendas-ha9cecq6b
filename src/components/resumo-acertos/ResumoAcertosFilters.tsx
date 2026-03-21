import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Filter,
  Map as MapIcon,
  CalendarDays,
  User,
  Search,
  Hash,
  CopyX,
} from 'lucide-react'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import { Rota } from '@/types/rota'
import { Employee } from '@/types/employee'
import { safeFormatDate } from '@/lib/formatters'

interface ResumoAcertosFiltersProps {
  filterMode: 'periodo' | 'rota' | 'cliente'
  setFilterMode: (mode: 'periodo' | 'rota' | 'cliente') => void
  selectedRouteId: string
  setSelectedRouteId: (id: string) => void
  routes: Rota[]
  selectedClientId: string
  setSelectedClientId: (id: string) => void
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  selectedEmployeeId: string
  setSelectedEmployeeId: (id: string) => void
  employees: Employee[]
  clientSearchFilter: string
  setClientSearchFilter: (filter: string) => void
  orderNumberFilter: string
  setOrderNumberFilter: (filter: string) => void
  handleLocateOrder: () => void
  fetchData: () => void
  selectedRoute: Rota | undefined
  onDuplicatesClick: () => void
}

export function ResumoAcertosFilters({
  filterMode,
  setFilterMode,
  selectedRouteId,
  setSelectedRouteId,
  routes,
  selectedClientId,
  setSelectedClientId,
  dateRange,
  setDateRange,
  selectedEmployeeId,
  setSelectedEmployeeId,
  employees,
  clientSearchFilter,
  setClientSearchFilter,
  orderNumberFilter,
  setOrderNumberFilter,
  handleLocateOrder,
  fetchData,
  selectedRoute,
  onDuplicatesClick,
}: ResumoAcertosFiltersProps) {
  return (
    <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
      <CardHeader className="pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-blue-600" />
              Modo de Filtro
            </div>
            <Select
              value={filterMode}
              onValueChange={(val: any) => setFilterMode(val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rota">Por Rota</SelectItem>
                <SelectItem value="periodo">Por Período</SelectItem>
                <SelectItem value="cliente">Por Cliente (Histórico)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterMode === 'rota' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapIcon className="h-4 w-4 text-blue-600" />
                Seletor de Rota
              </div>
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rota" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      Rota #{route.id} (
                      {safeFormatDate(route.data_inicio, 'dd/MM')}
                      {route.data_fim
                        ? ` - ${safeFormatDate(route.data_fim, 'dd/MM')}`
                        : ' - Atual'}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : filterMode === 'periodo' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Período
              </div>
              <DateRangePicker date={dateRange} setDate={setDateRange} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-blue-600" />
                Código do Cliente
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 2874"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                  className="w-full bg-background"
                />
                <Button onClick={() => fetchData()} variant="secondary">
                  Buscar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-blue-600" />
              Filtrar por Funcionário
            </div>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os funcionários</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-blue-600" />
              Cliente (Nome ou Cód.)
            </div>
            <Input
              placeholder="Nome ou código..."
              value={clientSearchFilter}
              onChange={(e) => setClientSearchFilter(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Hash className="h-4 w-4 text-blue-600" />
              Filtrar por Pedido
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Número..."
                value={orderNumberFilter}
                onChange={(e) => setOrderNumberFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLocateOrder()}
                className="bg-background w-full"
              />
              <Button
                onClick={handleLocateOrder}
                variant="secondary"
                title="Localizar Rota"
              >
                Localizar
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filterMode === 'rota' && selectedRoute ? (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex gap-4 text-sm">
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Início:</span>
                <span className="font-medium">
                  {safeFormatDate(selectedRoute.data_inicio)}
                </span>
              </div>
              <div className="bg-background border px-3 py-1 rounded-md">
                <span className="text-muted-foreground mr-2">Fim:</span>
                <span className="font-medium">
                  {selectedRoute.data_fim
                    ? safeFormatDate(selectedRoute.data_fim)
                    : 'Em andamento'}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
              onClick={onDuplicatesClick}
            >
              <CopyX className="h-4 w-4 mr-2" />
              Verificar Duplicados
            </Button>
          </div>
        ) : filterMode === 'rota' && !selectedRoute ? (
          <div className="text-amber-600 font-medium">
            Nenhuma rota encontrada.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
