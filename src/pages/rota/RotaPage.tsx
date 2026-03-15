import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { RotaHeader } from '@/components/rota/RotaHeader'
import { RotaFilters } from '@/components/rota/RotaFilters'
import { RotaTable } from '@/components/rota/RotaTable'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Rota, RotaFilterState, RotaRow, SortConfig } from '@/types/rota'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'
import { useRotaFilterStore } from '@/stores/useRotaFilterStore'
import { parseISO, isBefore, isAfter, isValid } from 'date-fns'
import { usePermissions } from '@/hooks/use-permissions'
import { useUserStore } from '@/stores/useUserStore'
import { BulkFillNextSellerDialog } from '@/components/rota/BulkFillNextSellerDialog'
import { ParametrosDialog } from '@/components/rota/ParametrosDialog'

export default function RotaPage() {
  const [activeRota, setActiveRota] = useState<Rota | null>(null)
  const [lastRota, setLastRota] = useState<Rota | null>(null)
  const [rows, setRows] = useState<RotaRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sellers, setSellers] = useState<Employee[]>([])

  const { employee: loggedInUser } = useUserStore()
  const { selectedEmployeeIds, setSelectedEmployeeIds } = useRotaFilterStore()

  const [isSelectionMode, setIsSelectionMode] = useState(true)
  const [isFiltrosActive, setIsFiltrosActive] = useState(true)
  const [isGerencialActive, setIsGerencialActive] = useState(true)
  const [isParametrosActive, setIsParametrosActive] = useState(true)

  const [isBulkFillOpen, setIsBulkFillOpen] = useState(false)
  const [isParametrosModalOpen, setIsParametrosModalOpen] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  const [filters, setFilters] = useState<RotaFilterState>(() => ({
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
  }))

  const [sortConfig, setSortConfig] = useState<SortConfig>([
    { key: 'vendedor_nome', direction: 'asc' },
    { key: 'grupo_rota', direction: 'asc' },
    { key: 'cep', direction: 'asc' },
  ])

  useEffect(() => {
    if (!isFirstLoad) {
      setSelectedEmployeeIds(filters.vendedor)
    }
  }, [filters.vendedor, setSelectedEmployeeIds, isFirstLoad])

  const { toast } = useToast()
  const { canAccess } = usePermissions()

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

      if (isFirstLoad) {
        if (loggedInUser) {
          const isUserInRoute = rotaRows.some(
            (r) => r.vendedor_id === loggedInUser.id,
          )

          setFilters((prev) => ({
            ...prev,
            vendedor: isUserInRoute ? [loggedInUser.id.toString()] : [],
            status_vendedor: isUserInRoute ? 'todos' : 'com_vendedor',
          }))
          setSelectedEmployeeIds(
            isUserInRoute ? [loggedInUser.id.toString()] : [],
          )
        }
        setIsFirstLoad(false)
      }
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

      if (filters.status_vendedor && filters.status_vendedor !== 'todos') {
        if (filters.status_vendedor === 'com_vendedor') {
          if (row.vendedor_id === null || row.vendedor_id === undefined)
            return false
        } else if (filters.status_vendedor === 'sem_vendedor') {
          if (row.vendedor_id !== null && row.vendedor_id !== undefined)
            return false
        }
      }

      if (filters.vendedor.length > 0) {
        const hasNone = filters.vendedor.includes('none')
        const matchesVendor =
          row.vendedor_id &&
          filters.vendedor.includes(row.vendedor_id.toString())
        const matchesNone = hasNone && !row.vendedor_id

        if (!matchesVendor && !matchesNone) {
          return false
        }
      }

      if (
        filters.proximo_vendedor !== 'todos' &&
        filters.proximo_vendedor !== 'manter_atual'
      ) {
        if (filters.proximo_vendedor === 'nenhum') {
          if (row.proximo_vendedor_id !== null) return false
        } else if (filters.proximo_vendedor === 'preenchidos') {
          if (row.proximo_vendedor_id === null) return false
        } else {
          if (
            !row.proximo_vendedor_id ||
            row.proximo_vendedor_id.toString() !== filters.proximo_vendedor
          ) {
            return false
          }
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

      if (filters.pendencias === 'com_pendencia') {
        if (!row.has_pendency) return false
      } else if (filters.pendencias === 'sem_pendencia') {
        if (row.has_pendency) return false
      }

      if (filters.debito_min && row.debito < parseFloat(filters.debito_min))
        return false
      if (filters.debito_max && row.debito > parseFloat(filters.debito_max))
        return false

      return true
    })
  }, [rows, filters])

  const sortedRows = useMemo(() => {
    const sellersMap = new Map(sellers.map((s) => [s.id, s.nome_completo]))

    const sorted = [...filteredRows].sort((a, b) => {
      for (const sort of sortConfig) {
        let valA: any = a[sort.key as keyof RotaRow]
        let valB: any = b[sort.key as keyof RotaRow]

        if (sort.key === 'municipio') {
          valA = a.client.MUNICÍPIO || ''
          valB = b.client.MUNICÍPIO || ''
        } else if (sort.key === 'grupo_rota') {
          valA = a.client['GRUPO ROTA'] || ''
          valB = b.client['GRUPO ROTA'] || ''
        } else if (sort.key === 'cep') {
          valA = a.client['CEP OFICIO'] || ''
          valB = b.client['CEP OFICIO'] || ''
        } else if (sort.key === 'client_nome') {
          valA = a.client['NOME CLIENTE'] || ''
          valB = b.client['NOME CLIENTE'] || ''
        } else if (sort.key === 'vendedor_nome') {
          valA = a.vendedor_id ? sellersMap.get(a.vendedor_id) || '' : ''
          valB = b.vendedor_id ? sellersMap.get(b.vendedor_id) || '' : ''
        }

        if (valA === null || valA === undefined) valA = ''
        if (valB === null || valB === undefined) valB = ''

        if (valA < valB) return sort.direction === 'asc' ? -1 : 1
        if (valA > valB) return sort.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    return sorted
  }, [filteredRows, sortConfig, sellers])

  const handleSort = (key: string, e: React.MouseEvent) => {
    setSortConfig((current) => {
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey
      const existingIdx = current.findIndex((s) => s.key === key)

      if (!isMulti) {
        if (existingIdx >= 0 && current.length === 1) {
          const existing = current[existingIdx]
          if (existing.direction === 'asc') return [{ key, direction: 'desc' }]
          return [{ key: 'rowNumber', direction: 'asc' }]
        }
        return [{ key, direction: 'asc' }]
      }

      const newConfig = [...current]
      if (existingIdx >= 0) {
        const existing = newConfig[existingIdx]
        if (existing.direction === 'asc') {
          newConfig[existingIdx] = { key, direction: 'desc' }
        } else {
          newConfig.splice(existingIdx, 1)
        }
      } else {
        newConfig.push({ key, direction: 'asc' })
      }

      if (newConfig.length === 0) {
        return [{ key: 'rowNumber', direction: 'asc' }]
      }
      return newConfig
    })
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
    const rowsToExport = sortedRows.slice(0, 150)

    const headers = [
      '#',
      'Cliente Cod',
      'Cliente Nome',
      'Município',
      'Valor a Pagar',
      'Projeção',
      'Vendedor',
      'Próxima',
      'Rota/Grupo',
      'Consignado',
      'Endereço',
      'Telefone 1',
      'Contato 1',
      'xRota',
      'Pedido',
      'Data Acerto',
      'Status',
      'Boleto',
      'Agregado',
      'CEP',
      'Tarefas',
    ]

    const sellersMap = new Map(sellers.map((s) => [s.id, s.nome_completo]))

    const csvLines = [headers.join(';')]

    rowsToExport.forEach((row) => {
      const vVendedor = row.vendedor_id
        ? sellersMap.get(row.vendedor_id) || ''
        : ''
      const vProximo = row.proximo_vendedor_id
        ? sellersMap.get(row.proximo_vendedor_id) || ''
        : ''

      const escape = (str: any) => {
        if (str === null || str === undefined) return '""'
        const stringVal = String(str)
        if (
          stringVal.includes(';') ||
          stringVal.includes('"') ||
          stringVal.includes('\n')
        ) {
          return `"${stringVal.replace(/"/g, '""')}"`
        }
        return stringVal
      }

      const line = [
        escape(row.rowNumber),
        escape(row.client.CODIGO),
        escape(row.client['NOME CLIENTE']),
        escape(row.client.MUNICÍPIO),
        escape(row.debito),
        escape(row.projecao || 0),
        escape(vVendedor),
        escape(vProximo),
        escape(row.client['GRUPO ROTA']),
        escape(row.valor_consignado || 0),
        escape(row.client.ENDEREÇO),
        escape(row.client['FONE 1']),
        escape(row.client['CONTATO 1']),
        escape(row.x_na_rota),
        escape(row.numero_pedido),
        escape(row.data_acerto),
        escape(row.vencimento_status),
        escape(row.boleto ? 'Sim' : 'Não'),
        escape(row.agregado ? 'Sim' : 'Não'),
        escape(row.client['CEP OFICIO']),
        escape(row.tarefas),
      ]
      csvLines.push(line.join(';'))
    })

    const csvContent = csvLines.join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rota_${activeRota?.id || 'export'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Exportação Concluída',
      description: `Arquivo baixado com ${rowsToExport.length} registros (limite de 150 linhas).`,
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
        isGerencialActive={isGerencialActive}
        totalClients={filteredRows.length}
      />

      <RotaFilters
        filters={filters}
        setFilters={setFilters}
        sellers={sellers}
        municipios={municipios}
        routes={routeGroups}
        isSelectionMode={isSelectionMode}
        toggleSelectionMode={setIsSelectionMode}
        isFiltrosActive={isFiltrosActive}
        toggleFiltros={setIsFiltrosActive}
        isGerencialActive={isGerencialActive}
        toggleGerencial={setIsGerencialActive}
        isParametrosActive={isParametrosActive}
        toggleParametros={setIsParametrosActive}
        onOpenParametrosModal={() => setIsParametrosModalOpen(true)}
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

      <ParametrosDialog
        open={isParametrosModalOpen}
        onOpenChange={setIsParametrosModalOpen}
        rows={sortedRows}
        activeRotaId={activeRota?.id}
        onComplete={loadData}
      />
    </div>
  )
}
