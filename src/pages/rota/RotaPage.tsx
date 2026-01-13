import { useState, useEffect, useMemo } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaLegend } from '@/components/rota/RotaLegend'
import { RotaTable } from '@/components/rota/RotaTable'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Rota, RotaRow, RotaFilterState, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [sellers, setSellers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState(0) // Track pending saves
  const { toast } = useToast()

  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: [],
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
  })

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'projecao',
    direction: 'desc',
  })

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [active, last, empRes] = await Promise.all([
          rotaService.getActiveRota(),
          rotaService.getLastRota(),
          employeesService.getEmployees(1, 1000),
        ])
        setActiveRota(active)
        setLastRota(last)

        const allEmployees = empRes.data
        const activeSellers = allEmployees.filter(
          (e) =>
            e.situacao === 'ATIVO' &&
            Array.isArray(e.setor) &&
            e.setor.includes('Vendedor'),
        )
        setSellers(activeSellers)

        const rotaToFetch = active || last
        const data = await rotaService.getFullRotaData(rotaToFetch)

        setRows(Array.isArray(data) ? data : [])
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
      const data = await rotaService.getFullRotaData(newRota)
      setRows(Array.isArray(data) ? data : [])
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
    if (
      !window.confirm(
        'Confirma o fechamento da rota atual e início de uma nova? Esta ação irá transferir clientes não atendidos.',
      )
    )
      return

    setLoading(true)
    try {
      const newRota = await rotaService.finishAndStartNewRoute(activeRota.id)
      setLastRota({ ...activeRota, data_fim: new Date().toISOString() })
      setActiveRota(newRota)
      const data = await rotaService.getFullRotaData(newRota)
      setRows(Array.isArray(data) ? data : [])

      toast({
        title: 'Rota Finalizada e Nova Iniciada',
        description: `Rota #${activeRota.id} fechada. Rota #${newRota.id} iniciada.`,
        className: 'bg-blue-600 text-white',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar/iniciar a rota.',
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

    let newXNaRota: number | undefined = undefined

    // Logic: If seller is assigned (changed to a value), increment x_na_rota by 1
    // This assumes the user is manually assigning, implying a new attempt/visit intention
    // AND the client is NOT completed
    const currentRow = rows.find((r) => r.client.CODIGO === clientId)

    if (
      field === 'vendedor_id' &&
      value !== null &&
      currentRow &&
      !currentRow.is_completed
    ) {
      newXNaRota = (currentRow.x_na_rota || 0) + 1
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.client.CODIGO === clientId) {
          const updated = { ...r, [field]: value }
          if (newXNaRota !== undefined) {
            updated.x_na_rota = newXNaRota
          }
          return updated
        }
        return r
      }),
    )

    // Indicate that an update is pending
    setPendingUpdates((prev) => prev + 1)

    try {
      const payload: any = {
        rota_id: activeRota.id,
        cliente_id: clientId,
        [field]: value,
      }
      if (newXNaRota !== undefined) {
        payload.x_na_rota = newXNaRota
      }

      await rotaService.upsertRotaItem(payload)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar alteração.',
        variant: 'destructive',
      })
      // Revert could be implemented here if needed, but optimistic UI usually prioritizes speed
    } finally {
      // Decrement pending updates, ensuring it doesn't go below 0
      setPendingUpdates((prev) => Math.max(0, prev - 1))
    }
  }

  const filteredRows = useMemo(() => {
    if (!rows) return []
    return rows.filter((row) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = row.client['NOME CLIENTE']
          ?.toLowerCase()
          .includes(searchLower)
        const matchesCode = row.client.CODIGO.toString().includes(searchLower)

        if (!matchesName && !matchesCode) return false
      }

      if (filters.x_na_rota !== 'todos') {
        if (filters.x_na_rota === '>3') {
          if (row.x_na_rota <= 3) return false
        } else if (row.x_na_rota.toString() !== filters.x_na_rota) return false
      }

      if (filters.agregado !== 'todos') {
        const boolVal = filters.agregado === 'SIM'
        if (row.agregado !== boolVal) return false
      }

      if (filters.vendedor.length > 0) {
        if (
          !row.vendedor_id ||
          !filters.vendedor.includes(row.vendedor_id.toString())
        ) {
          return false
        }
      }

      if (filters.municipio !== 'todos') {
        if (row.client.MUNICÍPIO !== filters.municipio) return false
      }

      if (filters.grupo_rota !== 'todos') {
        if (row.client['GRUPO ROTA'] !== filters.grupo_rota) return false
      }

      if (filters.vencimento_status !== 'todos') {
        if (row.vencimento_status !== filters.vencimento_status) return false
      }

      if (filters.debito_min && row.debito < Number(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > Number(filters.debito_max))
        return false

      if (
        filters.projecao_min &&
        (row.projecao || 0) < Number(filters.projecao_min)
      )
        return false

      if (
        filters.estoque_min &&
        row.estoque !== null &&
        row.estoque < Number(filters.estoque_min)
      )
        return false
      if (
        filters.estoque_max &&
        row.estoque !== null &&
        row.estoque > Number(filters.estoque_max)
      )
        return false

      return true
    })
  }, [rows, filters])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]

    sorted.sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      switch (sortConfig.key) {
        case 'projecao':
          valA = a.projecao ?? -1
          valB = b.projecao ?? -1
          break
        case 'estoque':
          valA = a.estoque ?? 0
          valB = b.estoque ?? 0
          break
        case 'valor_consignado':
          valA = a.valor_consignado ?? 0
          valB = b.valor_consignado ?? 0
          break
        case 'x_na_rota':
          valA = a.x_na_rota
          valB = b.x_na_rota
          break
        case 'data_acerto':
          valA = a.data_acerto || ''
          valB = b.data_acerto || ''
          break
        case 'debito':
          valA = a.debito
          valB = b.debito
          break
        case 'grupo_rota':
          valA = a.client['GRUPO ROTA'] || ''
          valB = b.client['GRUPO ROTA'] || ''
          break
        case 'municipio':
          valA = a.client.MUNICÍPIO || ''
          valB = b.client.MUNICÍPIO || ''
          break
        case 'vencimento_cobranca':
          valA = a.vencimento_cobranca || ''
          valB = b.vencimento_cobranca || ''
          break
        default:
          return 0
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return valA.localeCompare(valB)
      }
      return valA < valB ? -1 : valA > valB ? 1 : 0
    })

    if (sortConfig.direction === 'desc') {
      sorted.reverse()
    }
    return sorted
  }, [filteredRows, sortConfig])

  const uniqueMunicipios = useMemo(
    () => [...new Set(rows.map((r) => r.client.MUNICÍPIO).filter(Boolean))],
    [rows],
  )

  const uniqueRoutes = useMemo(
    () => [...new Set(rows.map((r) => r.client['GRUPO ROTA']).filter(Boolean))],
    [rows],
  )

  const handleExportExcel = () => {
    const headers = [
      'Débito',
      'Vencimento',
      'Projeção',
      'Vendedor',
      'Rota/Grupo Rota',
      'Consignado',
      '#',
      'Cliente',
      'Município',
      'Endereço',
      'Tipo de Cliente',
      'Telefone 1',
      'Contato 1',
      'xRota',
      'Pedido',
      'Data',
      'Status',
      'Boleto',
      'Agregado',
    ]

    const csvContent = [
      headers.join(';'),
      ...sortedRows.map((row) => {
        const sellerName =
          sellers.find((s) => s.id === row.vendedor_id)?.nome_completo || ''

        const vencimentoStr =
          row.debito > 0 && row.vencimento_cobranca
            ? new Date(row.vencimento_cobranca).toLocaleDateString('pt-BR')
            : ''

        return [
          row.debito.toFixed(2).replace('.', ','),
          vencimentoStr,
          (row.projecao || 0).toFixed(2).replace('.', ','),
          `"${sellerName}"`,
          `"${(row.client['GRUPO ROTA'] || '').replace(/"/g, '""')}"`,
          (row.valor_consignado || 0).toFixed(2).replace('.', ','),
          row.rowNumber,
          `"${(row.client['NOME CLIENTE'] || '').replace(/"/g, '""')}"`,
          `"${(row.client.MUNICÍPIO || '').replace(/"/g, '""')}"`,
          `"${(row.client.ENDEREÇO || '').replace(/"/g, '""')}"`,
          `"${(row.client['TIPO DE CLIENTE'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['FONE 1'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['CONTATO 1'] || '').replace(/"/g, '""')}"`,
          row.x_na_rota,
          row.numero_pedido || '',
          row.data_acerto || '',
          row.vencimento_status,
          row.boleto ? 'SIM' : 'NÃO',
          row.agregado ? 'SIM' : 'NÃO',
        ].join(';')
      }),
    ].join('\n')

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `rota_export_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <div className="absolute inset-0 flex flex-col gap-4 animate-fade-in p-4 pb-20 md:pb-4 overflow-hidden">
      <div className="flex-none flex flex-col gap-3">
        <div className="w-full">
          <RotaHeader
            activeRota={activeRota}
            lastRota={lastRota}
            onStart={handleStartRota}
            onEnd={handleEndRota}
            onExport={handleExportExcel}
            loading={loading}
            hasPendingUpdates={pendingUpdates > 0}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            Total: {filteredRows.length} Clientes
          </span>
        </div>
        <div className="w-full">
          <RotaFilters
            filters={filters}
            setFilters={setFilters}
            sellers={sellers}
            municipios={uniqueMunicipios as string[]}
            routes={uniqueRoutes as string[]}
            isSelectionMode={isSelectionMode}
            toggleSelectionMode={setIsSelectionMode}
          />
        </div>
        <RotaLegend />
      </div>

      <div className="flex-1 overflow-auto rounded-md border shadow-sm bg-card">
        <RotaTable
          rows={sortedRows}
          sellers={sellers}
          onUpdateRow={handleUpdateRow}
          disabled={!activeRota}
          onSort={handleSort}
          sortConfig={sortConfig}
          loading={loading}
          isSelectionMode={isSelectionMode}
        />
      </div>
    </div>
  )
}
