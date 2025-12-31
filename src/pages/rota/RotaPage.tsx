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
import { parseISO } from 'date-fns'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [sellers, setSellers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Filter State - Default to 'ATIVO' (Requirement) and Projection > 50
  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: 'todos',
    municipio: 'todos',
    tipo_cliente: 'ATIVO',
    grupo_rota: 'todos',
    debito_min: '',
    debito_max: '',
    data_acerto_start: '',
    data_acerto_end: '',
    projecao_min: '50',
    estoque_min: '',
    estoque_max: '',
  })

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'projecao', // Default sort by projection for value focus
    direction: 'desc',
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

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Filter Logic
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search Text Filter
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

      if (filters.vendedor !== 'todos') {
        if (row.vendedor_id?.toString() !== filters.vendedor) return false
      }

      if (filters.municipio !== 'todos') {
        if (row.client.MUNICÍPIO !== filters.municipio) return false
      }

      if (filters.tipo_cliente !== 'todos') {
        if (row.client['TIPO DE CLIENTE'] !== filters.tipo_cliente) return false
      }

      if (filters.grupo_rota !== 'todos') {
        if (row.client['GRUPO ROTA'] !== filters.grupo_rota) return false
      }

      // Ranges
      if (filters.debito_min && row.debito < Number(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > Number(filters.debito_max))
        return false

      if (filters.projecao_min && row.projecao < Number(filters.projecao_min))
        return false
      // Removed Projecao Max Check

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

  // Sorting Logic
  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]

    sorted.sort((a, b) => {
      let valA: any = ''
      let valB: any = ''

      switch (sortConfig.key) {
        case 'rowNumber':
          valA = a.rowNumber
          valB = b.rowNumber
          break
        case 'x_na_rota':
          valA = a.x_na_rota
          valB = b.x_na_rota
          break
        case 'nota_fiscal':
          valA = a.client['NOTA FISCAL'] || ''
          valB = b.client['NOTA FISCAL'] || ''
          break
        case 'boleto':
          valA = a.boleto ? 1 : 0
          valB = b.boleto ? 1 : 0
          break
        case 'agregado':
          valA = a.agregado ? 1 : 0
          valB = b.agregado ? 1 : 0
          break
        case 'vendedor':
          // Sort by Salesperson Name instead of ID
          valA =
            sellers.find((s) => s.id === a.vendedor_id)?.nome_completo || ''
          valB =
            sellers.find((s) => s.id === b.vendedor_id)?.nome_completo || ''
          break
        case 'debito':
          valA = a.debito
          valB = b.debito
          break
        case 'quant_debito':
          valA = a.quant_debito
          valB = b.quant_debito
          break
        case 'data_acerto':
          valA = a.data_acerto || ''
          valB = b.data_acerto || ''
          break
        case 'codigo':
          valA = a.client.CODIGO
          valB = b.client.CODIGO
          break
        case 'nome':
          valA = a.client['NOME CLIENTE'] || ''
          valB = b.client['NOME CLIENTE'] || ''
          break
        case 'rota':
          valA = a.client['GRUPO ROTA'] || ''
          valB = b.client['GRUPO ROTA'] || ''
          break
        case 'projecao':
          valA = a.projecao
          valB = b.projecao
          break
        case 'numero_pedido':
          valA = a.numero_pedido || 0
          valB = b.numero_pedido || 0
          break
        case 'estoque':
          valA = a.estoque
          valB = b.estoque
          break
        case 'endereco':
          valA = a.client.ENDEREÇO || ''
          valB = b.client.ENDEREÇO || ''
          break
        case 'bairro':
          valA = a.client.BAIRRO || ''
          valB = b.client.BAIRRO || ''
          break
        case 'municipio':
          valA = a.client.MUNICÍPIO || ''
          valB = b.client.MUNICÍPIO || ''
          break
        case 'contato1':
          valA = a.client['CONTATO 1'] || ''
          valB = b.client['CONTATO 1'] || ''
          break
        case 'contato2':
          valA = a.client['CONTATO 2'] || ''
          valB = b.client['CONTATO 2'] || ''
          break
        case 'cep':
          valA = a.client['CEP OFICIO'] || ''
          valB = b.client['CEP OFICIO'] || ''
          break
        case 'tipo':
          valA = a.client['TIPO DE CLIENTE'] || ''
          valB = b.client['TIPO DE CLIENTE'] || ''
          break
        case 'fone1':
          valA = a.client['FONE 1'] || ''
          valB = b.client['FONE 1'] || ''
          break
        case 'fone2':
          valA = a.client['FONE 2'] || ''
          valB = b.client['FONE 2'] || ''
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
  }, [filteredRows, sortConfig, sellers])

  // Extract unique values for filters
  const uniqueMunicipios = useMemo(
    () => [...new Set(rows.map((r) => r.client.MUNICÍPIO).filter(Boolean))],
    [rows],
  )
  const uniqueTypes = useMemo(
    () =>
      [
        ...new Set(
          rows.map((r) => r.client['TIPO DE CLIENTE']).filter(Boolean),
        ),
      ].sort(),
    [rows],
  )
  const uniqueRoutes = useMemo(
    () => [...new Set(rows.map((r) => r.client['GRUPO ROTA']).filter(Boolean))],
    [rows],
  )

  const handleExportExcel = () => {
    const headers = [
      'Código',
      'Nome',
      'Fantasia',
      'Rota',
      'Endereço',
      'Bairro',
      'Município',
      'CEP',
      'Projeção',
      'Débito',
      'Vendedor',
      'X na Rota',
      'Agregado',
    ]

    // Requirement: Limit export to 150 rows
    const rowsToExport = sortedRows.slice(0, 150)

    const csvContent = [
      headers.join(';'),
      ...rowsToExport.map((row) => {
        const sellerName =
          sellers.find((s) => s.id === row.vendedor_id)?.nome_completo || ''
        return [
          row.client.CODIGO,
          `"${(row.client['NOME CLIENTE'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['RAZÃO SOCIAL'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['GRUPO ROTA'] || '').replace(/"/g, '""')}"`,
          `"${(row.client.ENDEREÇO || '').replace(/"/g, '""')}"`,
          `"${(row.client.BAIRRO || '').replace(/"/g, '""')}"`,
          `"${(row.client.MUNICÍPIO || '').replace(/"/g, '""')}"`,
          `"${(row.client['CEP OFICIO'] || '').replace(/"/g, '""')}"`,
          row.projecao.toFixed(2).replace('.', ','),
          row.debito.toFixed(2).replace('.', ','),
          `"${sellerName}"`,
          row.x_na_rota,
          row.agregado ? 'Sim' : 'Não',
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

  return (
    <div className="flex flex-col h-screen gap-4 p-4 animate-fade-in bg-background">
      <div className="flex-none flex flex-col gap-4">
        {/* Header Section */}
        <div className="w-full">
          <RotaHeader
            activeRota={activeRota}
            lastRota={lastRota}
            onStart={handleStartRota}
            onEnd={handleEndRota}
            onExport={handleExportExcel}
            loading={loading}
          />
        </div>

        {/* Filter Strip - Dedicated full width section */}
        <div className="w-full">
          <RotaFilters
            filters={filters}
            setFilters={setFilters}
            sellers={sellers}
            municipios={uniqueMunicipios as string[]}
            clientTypes={uniqueTypes as string[]}
            routes={uniqueRoutes as string[]}
          />
        </div>

        {/* Legend */}
        <RotaLegend />
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-hidden border rounded-md shadow-sm">
        <RotaTable
          rows={sortedRows}
          sellers={sellers}
          onUpdateRow={handleUpdateRow}
          disabled={!activeRota}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </div>
    </div>
  )
}
