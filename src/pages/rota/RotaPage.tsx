import { useState, useEffect, useMemo, useCallback } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaLegend } from '@/components/rota/RotaLegend'
import { RotaTable } from '@/components/rota/RotaTable'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { fechamentoService } from '@/services/fechamentoService'
import { Rota, RotaRow, RotaFilterState, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/stores/useUserStore'
import { useRotaFilterStore } from '@/stores/useRotaFilterStore'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [sellers, setSellers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState(0)
  const [pendingClosures, setPendingClosures] = useState<string[]>([])
  const { toast } = useToast()
  const { employee } = useUserStore()

  // Use persistent store for employee filter
  const { selectedEmployeeIds, setSelectedEmployeeIds } = useRotaFilterStore()

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: selectedEmployeeIds, // Initialize with persisted value
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

  // Update persistent store when filter changes
  useEffect(() => {
    setSelectedEmployeeIds(filters.vendedor)
  }, [filters.vendedor, setSelectedEmployeeIds])

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'projecao',
    direction: 'desc',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch core data in parallel but handle independent failures
      const [active, last] = await Promise.all([
        rotaService.getActiveRota(),
        rotaService.getLastRota(),
      ])
      setActiveRota(active)
      setLastRota(last)

      // Employees are secondary but important
      let allEmployees: Employee[] = []
      try {
        const empRes = await employeesService.getEmployees(1, 1000)
        allEmployees = empRes.data
        const activeSellers = allEmployees.filter(
          (e) =>
            e.situacao === 'ATIVO' &&
            Array.isArray(e.setor) &&
            e.setor.includes('Vendedor'),
        )
        setSellers(activeSellers)
      } catch (e) {
        console.warn('Failed to load employees', e)
      }

      // Robust full data fetch
      const rotaToFetch = active || last
      const data = await rotaService.getFullRotaData(rotaToFetch)

      const fetchedRows = Array.isArray(data) ? data : []
      setRows(fetchedRows)

      // Check pending closures if there is an active route
      if (active) {
        try {
          const uniqueSellerIds = new Set<number>()
          fetchedRows.forEach((r) => {
            if (r.vendedor_id) uniqueSellerIds.add(r.vendedor_id)
          })

          if (uniqueSellerIds.size > 0) {
            const closures = await fechamentoService.getByRoute(active.id)
            const closedSellerIds = new Set(
              closures
                .filter((c) => c.status === 'Fechado')
                .map((c) => c.funcionario_id),
            )

            const pendingNames: string[] = []
            uniqueSellerIds.forEach((id) => {
              if (!closedSellerIds.has(id)) {
                const emp = allEmployees.find((e) => e.id === id)
                pendingNames.push(emp?.nome_completo || `Vendedor ${id}`)
              }
            })
            setPendingClosures(pendingNames)
          } else {
            setPendingClosures([])
          }
        } catch (e) {
          console.warn('Failed to check closures', e)
          setPendingClosures([])
        }
      } else {
        setPendingClosures([])
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Falha crítica ao inicializar dados da rota.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('rota-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'BANCO_DE_DADOS' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'RECEBIMENTOS' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ROTA_ITEMS' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debitos_historico' },
        () => fetchData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fechamento_caixa' },
        () => {
          fetchData()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const handleStartRota = async () => {
    setLoading(true)
    try {
      const newRota = await rotaService.startRota()
      setActiveRota(newRota)
      const data = await rotaService.getFullRotaData(newRota)
      setRows(Array.isArray(data) ? data : [])
      setPendingClosures([])
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
    if (pendingClosures.length > 0) {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Existem vendedores com caixa aberto. Finalize os caixas antes de fechar a rota.',
        variant: 'destructive',
      })
      return
    }

    if (
      !window.confirm(
        'Confirma o fechamento da rota atual e início de uma nova? Esta ação irá transferir clientes não atendidos.',
      )
    )
      return

    setLoading(true)
    try {
      // 1. Capture current "Next Seller" assignments from the existing active route
      // We do this by iterating over the current rows in state
      const nextSellersMap = new Map<number, number>()
      rows.forEach((r) => {
        if (r.proximo_vendedor_id) {
          nextSellersMap.set(r.client.CODIGO, r.proximo_vendedor_id)
        }
      })

      // 2. Close current and start new route (DB procedure moves items)
      const newRota = await rotaService.finishAndStartNewRoute(activeRota.id)
      setLastRota({ ...activeRota, data_fim: new Date().toISOString() })
      setActiveRota(newRota)

      // 3. Apply the "Next Seller" assignments to the newly created route items
      if (nextSellersMap.size > 0) {
        await rotaService.applyNextSellers(newRota.id, nextSellersMap)
        toast({
          title: 'Vendedores Atualizados',
          description: `${nextSellersMap.size} vendedores foram pré-agendados para a nova rota.`,
        })
      }

      const data = await rotaService.getFullRotaData(newRota)
      setRows(Array.isArray(data) ? data : [])
      setPendingClosures([])

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

    // Special handling for "proximo_vendedor_id" (Next Seller)
    if (field === 'proximo_vendedor_id') {
      const currentRow = rows.find((r) => r.client.CODIGO === clientId)
      if (!currentRow) return

      // Optimistic Update
      setRows((prev) =>
        prev.map((r) =>
          r.client.CODIGO === clientId
            ? { ...r, proximo_vendedor_id: value }
            : r,
        ),
      )
      setPendingUpdates((prev) => prev + 1)

      try {
        await rotaService.updateNextSeller(
          activeRota.id,
          clientId,
          value,
          currentRow.tarefas || null,
        )
      } catch (error) {
        console.error(error)
        toast({
          title: 'Erro',
          description: 'Falha ao salvar próximo vendedor.',
          variant: 'destructive',
        })
        // Revert on error
        setRows((prev) =>
          prev.map((r) =>
            r.client.CODIGO === clientId
              ? { ...r, proximo_vendedor_id: currentRow.proximo_vendedor_id }
              : r,
          ),
        )
      } finally {
        setPendingUpdates((prev) => Math.max(0, prev - 1))
      }
      return
    }

    let newXNaRota: number | undefined = undefined

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
    } finally {
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
        case 'cep':
          valA = a.client['CEP OFICIO'] || ''
          valB = b.client['CEP OFICIO'] || ''
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
    // Permission check for export limit
    let rowsToExport = sortedRows
    let limitMessage = ''

    // Robust sector check
    const sectors = employee?.setor
      ? Array.isArray(employee.setor)
        ? employee.setor
        : [employee.setor]
      : []

    const isAdmin = sectors.includes('Administrador')

    if (!isAdmin && sortedRows.length > 150) {
      rowsToExport = sortedRows.slice(0, 150)
      limitMessage =
        'Exportação limitada aos primeiros 150 registros para seu perfil.'
    }

    if (limitMessage) {
      toast({
        title: 'Limite de Exportação',
        description: limitMessage,
        variant: 'default',
        className: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      })
    }

    const headers = [
      'Código',
      'Cliente',
      'Débito',
      'Vencimento',
      'Projeção',
      'Vendedor',
      'Rota/Grupo Rota',
      'Consignado',
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
      ...rowsToExport.map((row) => {
        const sellerName =
          sellers.find((s) => s.id === row.vendedor_id)?.nome_completo || ''

        const vencimentoStr =
          row.debito > 0 && row.vencimento_cobranca
            ? new Date(row.vencimento_cobranca).toLocaleDateString('pt-BR')
            : ''

        return [
          row.client.CODIGO,
          `"${(row.client['NOME CLIENTE'] || '').replace(/"/g, '""')}"`,
          row.debito.toFixed(2).replace('.', ','),
          vencimentoStr,
          (row.projecao || 0).toFixed(2).replace('.', ','),
          `"${sellerName}"`,
          `"${(row.client['GRUPO ROTA'] || '').replace(/"/g, '""')}"`,
          (row.valor_consignado || 0).toFixed(2).replace('.', ','),
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
    <div className="absolute inset-0 flex flex-col gap-2 animate-fade-in p-2 pb-20 md:pb-2 overflow-hidden">
      <div className="flex-none flex flex-col gap-2">
        <div className="w-full">
          <RotaHeader
            activeRota={activeRota}
            lastRota={lastRota}
            onStart={handleStartRota}
            onEnd={handleEndRota}
            onExport={handleExportExcel}
            loading={loading}
            hasPendingUpdates={pendingUpdates > 0}
            pendingClosures={pendingClosures}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
              Total: {filteredRows.length} Clientes
            </span>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-filters"
                checked={showFilters}
                onCheckedChange={setShowFilters}
              />
              <Label htmlFor="show-filters" className="cursor-pointer text-sm">
                Filtros
              </Label>
            </div>
          </div>
        </div>
        {showFilters && (
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
        )}
        {showFilters && <RotaLegend />}
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
