import { useState, useEffect, useMemo } from 'react'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { RotaRow, RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { RotaHeader } from './components/RotaHeader'
import { RotaFilters } from './components/RotaFilters'
import { RotaTable } from './components/RotaTable'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'

export default function RotaPage() {
  const [data, setData] = useState<RotaRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRotaId, setActiveRotaId] = useState<number | null>(null)

  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: [],
    status_vendedor: 'todos',
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
    pendencias: 'todos',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const emp = await employeesService.getAll()
      setEmployees(emp)

      const active = await rotaService.getActiveRota()
      if (active) {
        setActiveRotaId(active.id)
        const rows = await rotaService.getFullRotaData(active)
        setData(rows)
      } else {
        setActiveRotaId(null)
        setData([])
      }
    } catch (err) {
      toast.error('Erro ao carregar rota')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Explicit use of globalThis.Map to prevent any "Map$1 is not a constructor" collision
  const filteredData = useMemo(() => {
    let filtered = [...data]

    if (filters.search) {
      const lower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.client.CODIGO.toString().includes(lower) ||
          r.client['NOME CLIENTE']?.toLowerCase().includes(lower) ||
          r.client['RAZÃO SOCIAL']?.toLowerCase().includes(lower) ||
          r.client['MUNICÍPIO']?.toLowerCase().includes(lower),
      )
    }

    if (filters.status_vendedor !== 'todos') {
      if (filters.status_vendedor === 'com_vendedor') {
        filtered = filtered.filter((r) => r.vendedor_id !== null)
      } else if (filters.status_vendedor === 'sem_vendedor') {
        filtered = filtered.filter((r) => r.vendedor_id === null)
      }
    }

    return filtered
  }, [data, filters])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1600px] mx-auto">
      <RotaHeader activeRotaId={activeRotaId} onReload={loadData} />

      <Card className="shadow-sm border-muted">
        <CardContent className="p-4 space-y-4">
          <RotaFilters
            filters={filters}
            setFilters={setFilters}
            employees={employees}
          />
          <RotaTable
            data={filteredData}
            employees={employees}
            loading={loading}
            activeRotaId={activeRotaId}
            onReload={loadData}
          />
        </CardContent>
      </Card>
    </div>
  )
}
