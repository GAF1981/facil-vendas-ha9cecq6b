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

  // Filter State - Removed tipo_cliente as per requirement
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
  })

  // Sort Config
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
          employeesService.getEmployees(1, 1000), // Increased limit to ensure all sellers are available
        ])
        setActiveRota(active)
        setLastRota(last)

        const allEmployees = empRes.data
        setSellers(allEmployees)

        // Ensure we fetch full data which now internally filters by 'ATIVO'
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
      // Refresh rows
      const data = await rotaService.getFullRotaData(newRota)
      setRows(data)
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
        'Confirma o fechamento da rota atual e início de uma nova?',
      )
    )
      return

    setLoading(true)
    try {
      // New Logic: Finish current AND Start new
      const newRota = await rotaService.finishAndStartNewRoute(activeRota.id)

      // Update State: Previous active becomes last
      setLastRota({ ...activeRota, data_fim: new Date().toISOString() })
      // New active is the one just created
      setActiveRota(newRota)

      // Refresh Rows for new rota
      const data = await rotaService.getFullRotaData(newRota)
      setRows(data)

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

  const filteredRows = useMemo(() => {
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

      // REMOVED tipo_cliente check since it's hardcoded to ATIVO in query

      if (filters.grupo_rota !== 'todos') {
        if (row.client['GRUPO ROTA'] !== filters.grupo_rota) return false
      }

      if (filters.debito_min && row.debito < Number(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > Number(filters.debito_max))
        return false

      if (filters.projecao_min && row.projecao < Number(filters.projecao_min))
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

  const uniqueMunicipios = useMemo(
    () => [...new Set(rows.map((r) => r.client.MUNICÍPIO).filter(Boolean))],
    [rows],
  )

  const uniqueRoutes = useMemo(
    () => [...new Set(rows.map((r) => r.client['GRUPO ROTA']).filter(Boolean))],
    [rows],
  )

  const handleExportExcel = () => {
    // Reuse export logic from reference
    const headers = [
      'Código',
      'Nome',
      'Projeção',
      'Vendedor',
      'Débito',
      'Qtd. Debito',
      'Data Acerto',
      'Estoque (R$)',
      'Endereço',
      'Bairro',
      'Município',
      'CEP',
      'Tipo',
      'N. Pedido',
      'x na Rota',
      'Nota Fiscal',
      'Boleto',
      'Agregado',
      'Rota',
      'Fantasia',
    ]

    const rowsToExport = sortedRows

    const csvContent = [
      headers.join(';'),
      ...rowsToExport.map((row) => {
        const sellerName =
          sellers.find((s) => s.id === row.vendedor_id)?.nome_completo || ''
        return [
          row.client.CODIGO,
          `"${(row.client['NOME CLIENTE'] || '').replace(/"/g, '""')}"`,
          row.projecao.toFixed(2).replace('.', ','),
          `"${sellerName}"`,
          row.debito.toFixed(2).replace('.', ','),
          row.quant_debito,
          row.data_acerto || '',
          row.estoque.toFixed(2).replace('.', ','),
          `"${(row.client.ENDEREÇO || '').replace(/"/g, '""')}"`,
          `"${(row.client.BAIRRO || '').replace(/"/g, '""')}"`,
          `"${(row.client.MUNICÍPIO || '').replace(/"/g, '""')}"`,
          `"${(row.client['CEP OFICIO'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['TIPO DE CLIENTE'] || '').replace(/"/g, '""')}"`,
          row.numero_pedido || '',
          row.x_na_rota,
          `"${(row.client['NOTA FISCAL'] || '').replace(/"/g, '""')}"`,
          row.boleto ? 'Sim' : 'Não',
          row.agregado ? 'Sim' : 'Não',
          `"${(row.client['GRUPO ROTA'] || '').replace(/"/g, '""')}"`,
          `"${(row.client['RAZÃO SOCIAL'] || '').replace(/"/g, '""')}"`,
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
    <div className="flex flex-col h-screen gap-0 bg-background overflow-hidden">
      <div className="flex-none flex flex-col gap-3 p-4 pb-2 z-10 bg-background shadow-sm">
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
        <div className="w-full">
          <RotaFilters
            filters={filters}
            setFilters={setFilters}
            sellers={sellers}
            municipios={uniqueMunicipios as string[]}
            routes={uniqueRoutes as string[]}
          />
        </div>
        <RotaLegend />
      </div>

      {/* Main Content: Table with internal scroll */}
      <div className="flex-1 overflow-hidden relative">
        <RotaTable
          rows={sortedRows}
          sellers={sellers}
          onUpdateRow={handleUpdateRow}
          disabled={!activeRota}
        />
      </div>
    </div>
  )
}
