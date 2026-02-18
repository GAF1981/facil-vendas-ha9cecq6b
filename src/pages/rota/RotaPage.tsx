import { useEffect, useState, useMemo, useCallback } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { RotaTable } from '@/components/rota/RotaTable'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Rota, RotaFilterState, RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'
import { useRotaFilterStore } from '@/stores/useRotaFilterStore'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { parseISO, isBefore, isAfter, isValid } from 'date-fns'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'
import { BulkFillNextSellerDialog } from '@/components/rota/BulkFillNextSellerDialog'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sellers, setSellers] = useState<Employee[]>([])

  const [isSelectionMode, setIsSelectionMode] = useState(false)

  const [isBulkFillOpen, setIsBulkFillOpen] = useState(false)

  const { selectedEmployeeIds, setSelectedEmployeeIds } = useRotaFilterStore()
  const [filters, setFilters] = useState<RotaFilterState>({
    search: '',
    x_na_rota: 'todos',
    agregado: 'todos',
    vendedor: selectedEmployeeIds,
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
  })

  useEffect(() => {
    setSelectedEmployeeIds(filters.vendedor)
  }, [filters.vendedor, setSelectedEmployeeIds])

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'rowNumber',
    direction: 'asc',
  })

  const { toast } = useToast()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { canAccess } = usePermissions()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { employee: loggedInUser } = useUserStore()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [active, last, sellersData] = await Promise.all([
        rotaService.getActiveRota(),
        rotaService.getLastRota(),
        employeesService.getEmployees(1, 100),
      ])

      setActiveRota(active)
      setLastRota(last)
      setSellers(sellersData.data.filter((e) => e.situacao === 'ATIVO'))

      const rotaRows = await rotaService.getFullRotaData(active)
      setRows(rotaRows)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados da rota.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const municipios = useMemo(() => {
    const m = new Set<string>()
    rows.forEach((r) => r.client.MUNICÍPIO && m.add(r.client.MUNICÍPIO))
    return Array.from(m).sort()
  }, [rows])

  const routeGroups = useMemo(() => {
    const g = new Set<string>()
    rows.forEach((r) => r.client['GRUPO ROTA'] && g.add(r.client['GRUPO ROTA']))
    return Array.from(g).sort()
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.search) {
        const s = filters.search.toLowerCase()
        const matchesSearch =
          row.client['NOME CLIENTE']?.toLowerCase().includes(s) ||
          row.client.CODIGO.toString().includes(s)
        if (!matchesSearch) return false
      }

      if (filters.x_na_rota !== 'todos') {
        if (filters.x_na_rota === '>3') {
          if (row.x_na_rota <= 3) return false
        } else {
          if (row.x_na_rota !== parseInt(filters.x_na_rota)) return false
        }
      }

      if (filters.vendedor.length > 0) {
        if (
          !row.vendedor_id ||
          !filters.vendedor.includes(row.vendedor_id.toString())
        ) {
          return false
        }
      }

      if (filters.proximo_vendedor !== 'todos') {
        if (
          !row.proximo_vendedor_id ||
          row.proximo_vendedor_id.toString() !== filters.proximo_vendedor
        ) {
          return false
        }
      }

      if (
        filters.municipio !== 'todos' &&
        row.client.MUNICÍPIO !== filters.municipio
      )
        return false

      if (
        filters.grupo_rota !== 'todos' &&
        row.client['GRUPO ROTA'] !== filters.grupo_rota
      )
        return false

      if (filters.vencimento_status !== 'todos') {
        if (row.vencimento_status !== filters.vencimento_status) return false
      }

      if (filters.debito_min && row.debito < parseFloat(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > parseFloat(filters.debito_max))
        return false

      return true
    })
  }, [rows, filters])

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof RotaRow]
      let valB: any = b[sortConfig.key as keyof RotaRow]

      if (sortConfig.key === 'municipio') {
        valA = a.client.MUNICÍPIO || ''
        valB = b.client.MUNICÍPIO || ''
      } else if (sortConfig.key === 'grupo_rota') {
        valA = a.client['GRUPO ROTA'] || ''
        valB = b.client['GRUPO ROTA'] || ''
      } else if (sortConfig.key === 'cep') {
        valA = a.client['CEP OFICIO'] || ''
        valB = b.client['CEP OFICIO'] || ''
      }

      if (valA === null) valA = ''
      if (valB === null) valB = ''

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [filteredRows, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleUpdateRow = useCallback(
    async (clientId: number, field: string, value: any) => {
      if (!activeRota) return

      setRows((prev) =>
        prev.map((r) => {
          if (r.client.CODIGO === clientId) {
            return { ...r, [field]: value }
          }
          return r
        }),
      )

      try {
        let result = null
        if (field === 'vendedor_id') {
          result = await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            vendedor_id: value,
          })
        } else if (field === 'proximo_vendedor_id') {
          result = await rotaService.updateNextSeller(
            activeRota.id,
            clientId,
            value,
            null,
          )
        } else if (field === 'x_na_rota') {
          result = await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            x_na_rota: value,
          })
        } else if (field === 'boleto') {
          result = await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            boleto: value,
          })
        } else if (field === 'agregado') {
          result = await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            agregado: value,
          })
        } else if (field === 'tarefas') {
          result = await rotaService.upsertRotaItem({
            rota_id: activeRota.id,
            cliente_id: clientId,
            tarefas: value,
          })
        }

        if (result && result.x_na_rota !== undefined) {
          setRows((prev) =>
            prev.map((r) => {
              if (r.client.CODIGO === clientId) {
                return {
                  ...r,
                  x_na_rota: result.x_na_rota!,
                }
              }
              return r
            }),
          )
        }
      } catch (error) {
        console.error('Update failed', error)
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar registro.',
          variant: 'destructive',
        })
        loadData()
      }
    },
    [activeRota, toast],
  )

  const handleStartRota = async () => {
    try {
      await rotaService.startRota()
      toast({
        title: 'Rota Iniciada',
        description: 'Nova rota criada com sucesso.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a rota.',
        variant: 'destructive',
      })
    }
  }

  const handleEndRota = async () => {
    if (!activeRota) return
    if (!confirm('Tem certeza que deseja finalizar a rota atual?')) return

    try {
      await rotaService.finishAndStartNewRoute(activeRota.id)

      toast({
        title: 'Rota Finalizada',
        description: 'A rota foi encerrada e uma nova iniciada.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar a rota.',
        variant: 'destructive',
      })
    }
  }

  const handleExport = () => {
    toast({
      title: 'Exportando...',
      description: 'O download iniciará em breve.',
    })
  }

  const handleBulkClear = async () => {
    if (!activeRota) return
    if (!confirm('Deseja apagar TODOS os registros da coluna "Próxima"?'))
      return

    setLoading(true)
    try {
      await rotaService.bulkClearNextSellers(activeRota.id)
      toast({
        title: 'Sucesso',
        description: 'Coluna "Próxima" limpa com sucesso.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao limpar dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkTransfer = async () => {
    if (!activeRota) return
    if (
      !confirm(
        'Deseja transferir o "Próximo" para "Vendedor" onde estiver vazio?',
      )
    )
      return

    setLoading(true)
    try {
      await rotaService.bulkTransferNextSellers(activeRota.id)
      toast({
        title: 'Sucesso',
        description: 'Transferência concluída.',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha na transferência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTransferRow = async (row: RotaRow) => {
    if (!activeRota || !row.proximo_vendedor_id) return

    setRows((prev) =>
      prev.map((r) => {
        if (r.client.CODIGO === row.client.CODIGO) {
          return {
            ...r,
            vendedor_id: row.proximo_vendedor_id,
            proximo_vendedor_id: null,
          }
        }
        return r
      }),
    )

    try {
      const result = await rotaService.transferSingleNextSeller(
        activeRota.id,
        row.client.CODIGO,
        row.proximo_vendedor_id,
        row.tarefas,
      )

      if (result && result.x_na_rota !== undefined) {
        setRows((prev) =>
          prev.map((r) => {
            if (r.client.CODIGO === row.client.CODIGO) {
              return {
                ...r,
                x_na_rota: result.x_na_rota!,
              }
            }
            return r
          }),
        )
      }

      toast({
        title: 'Transferido',
        description: 'Vendedor atualizado com sucesso.',
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao transferir vendedor.',
        variant: 'destructive',
      })
      loadData()
    }
  }

  const handleBulkFillConfirm = async (
    sellerId: number | null,
    sellerName: string,
  ) => {
    if (!activeRota) return

    const clientsToUpdate = sortedRows.map((r) => r.client.CODIGO)
    const count = clientsToUpdate.length

    if (count === 0) {
      toast({
        title: 'Nenhum cliente',
        description: 'Não há clientes para atualizar com os filtros atuais.',
      })
      return
    }

    if (count < 50) {
      if (
        !confirm(
          `Deseja atribuir o vendedor ${sellerName} para a coluna 'Próxima' de todos os ${count} clientes exibidos?`,
        )
      ) {
        return
      }
    } else {
      if (
        !confirm(
          `ATENÇÃO: Você está prestes a atualizar ${count} registros. Deseja realmente atribuir o vendedor ${sellerName} para todos eles?`,
        )
      ) {
        return
      }
    }

    setLoading(true)
    try {
      await rotaService.bulkUpdateNextSellers(
        activeRota.id,
        clientsToUpdate,
        sellerId,
      )

      toast({
        title: 'Atualização em Lote',
        description: `${count} clientes atualizados com sucesso.`,
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar clientes em lote.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-2 p-2 sm:p-4">
      <RotaHeader
        activeRota={activeRota}
        lastRota={lastRota}
        onStart={handleStartRota}
        onEnd={handleEndRota}
        onExport={handleExport}
        loading={loading}
        onImportSuccess={loadData}
      />

      <RotaFilters
        filters={filters}
        setFilters={setFilters}
        sellers={sellers}
        municipios={municipios}
        routes={routeGroups}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={setIsSelectionMode}
        activeRotaId={activeRota?.id}
        onDataChange={loadData}
      />

      <RotaTable
        rows={sortedRows}
        sellers={sellers}
        onUpdateRow={handleUpdateRow}
        onSort={handleSort}
        sortConfig={sortConfig}
        loading={loading}
        isSelectionMode={isSelectionMode}
        onBulkTransfer={activeRota ? handleBulkTransfer : undefined}
        onBulkClear={activeRota ? handleBulkClear : undefined}
        onBulkFill={activeRota ? () => setIsBulkFillOpen(true) : undefined}
        onTransferRow={handleTransferRow}
      />

      <BulkFillNextSellerDialog
        open={isBulkFillOpen}
        onOpenChange={setIsBulkFillOpen}
        onConfirm={handleBulkFillConfirm}
        sellers={sellers}
        rowCount={sortedRows.length}
      />
    </div>
  )
}
