import { useState, useEffect, useMemo } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaLegend } from '@/components/rota/RotaLegend'
import { RotaTable } from '@/components/rota/RotaTable'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Rota, RotaRow, RotaFilterState } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'
import { parseISO } from 'date-fns'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [sellers, setSellers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Filter State
  const [filters, setFilters] = useState<RotaFilterState>({
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

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [active, last, empRes] = await Promise.all([
          rotaService.getActiveRota(),
          rotaService.getLastRota(),
          employeesService.getEmployees(1, 100),
        ])
        setActiveRota(active)
        setLastRota(last)
        setSellers(empRes.data.filter((e) => e.setor === 'Vendedor'))

        // Fetch Row Data
        const data = await rotaService.getFullRotaData(active)
        setRows(data)
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro ao carregar',
          description: 'Falha ao inicializar dados da rota.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [toast])

  const handleStartRota = async () => {
    setLoading(true)
    try {
      const newRota = await rotaService.startRota()
      setActiveRota(newRota)
      toast({ title: 'Rota Iniciada', className: 'bg-green-600 text-white' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a rota.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEndRota = async () => {
    if (!activeRota) return
    if (!window.confirm('Tem certeza que deseja finalizar a rota atual?'))
      return

    setLoading(true)
    try {
      await rotaService.endRota(activeRota.id)
      const finishedRota = { ...activeRota, data_fim: new Date().toISOString() }
      setLastRota(finishedRota)
      setActiveRota(null)
      toast({ title: 'Rota Finalizada', className: 'bg-blue-600 text-white' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a rota.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRow = async (
    clientId: number,
    field: string,
    value: any,
  ) => {
    if (!activeRota) {
      toast({
        title: 'Aviso',
        description: 'Inicie uma rota para editar.',
        variant: 'warning',
      })
      return
    }

    setRows((prev) =>
      prev.map((r) =>
        r.client.CODIGO === clientId ? { ...r, [field]: value } : r,
      ),
    )

    try {
      await rotaService.upsertRotaItem({
        rota_id: activeRota.id,
        cliente_id: clientId,
        [field]: value,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar alteração.',
        variant: 'destructive',
      })
    }
  }

  // Filter Logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.x_na_rota !== 'todos') {
        if (filters.x_na_rota === '>3') {
          if (row.x_na_rota <= 3) return false
        } else if (row.x_na_rota.toString() !== filters.x_na_rota) return false
      }

      if (filters.agregado !== 'todos') {
        const boolVal = filters.agregado === 'SIM'
        if (row.agregado !== boolVal) return false
      }

      if (filters.vendedor !== 'todos') {
        if (row.vendedor_id?.toString() !== filters.vendedor) return false
      }

      if (filters.municipio !== 'todos') {
        if (row.client.MUNICÍPIO !== filters.municipio) return false
      }

      if (filters.tipo_cliente !== 'todos') {
        if (row.client['TIPO DE CLIENTE'] !== filters.tipo_cliente) return false
      }

      // Ranges
      if (filters.debito_min && row.debito < Number(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > Number(filters.debito_max))
        return false

      if (filters.projecao_min && row.projecao < Number(filters.projecao_min))
        return false
      if (filters.projecao_max && row.projecao > Number(filters.projecao_max))
        return false

      if (filters.estoque_min && row.estoque < Number(filters.estoque_min))
        return false
      if (filters.estoque_max && row.estoque > Number(filters.estoque_max))
        return false

      if (
        filters.data_acerto_start &&
        (!row.data_acerto ||
          parseISO(row.data_acerto) < parseISO(filters.data_acerto_start))
      )
        return false
      if (
        filters.data_acerto_end &&
        (!row.data_acerto ||
          parseISO(row.data_acerto) > parseISO(filters.data_acerto_end))
      )
        return false

      return true
    })
  }, [rows, filters])

  // Extract unique values for filters
  const uniqueMunicipios = useMemo(
    () => [...new Set(rows.map((r) => r.client.MUNICÍPIO).filter(Boolean))],
    [rows],
  )
  const uniqueTypes = useMemo(
    () => [
      ...new Set(rows.map((r) => r.client['TIPO DE CLIENTE']).filter(Boolean)),
    ],
    [rows],
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-2 p-2 animate-fade-in">
      <div className="flex-none space-y-2">
        <RotaHeader
          activeRota={activeRota}
          lastRota={lastRota}
          onStart={handleStartRota}
          onEnd={handleEndRota}
          loading={loading}
        />

        <div className="flex flex-col gap-2">
          <RotaLegend />
          <RotaFilters
            filters={filters}
            setFilters={setFilters}
            sellers={sellers}
            municipios={uniqueMunicipios as string[]}
            clientTypes={uniqueTypes as string[]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <RotaTable
          rows={filteredRows}
          sellers={sellers}
          onUpdateRow={handleUpdateRow}
          disabled={!activeRota}
        />
      </div>
    </div>
  )
}
