import { useState, useEffect, useCallback, useMemo } from 'react'
import { InventoryGeneralTable } from '@/components/inventario/InventoryGeneralTable'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
} from '@/types/inventory_general'
import { useToast } from '@/hooks/use-toast'
import { InventoryInfoCard } from '@/components/inventario/InventoryInfoCard'
import { InventoryActionDialog } from '@/components/inventario/InventoryActionDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { safeFormatDate } from '@/lib/formatters'
import { InventoryHeader } from '@/components/inventario/InventoryHeader'
import { InventoryControlBar } from '@/components/inventario/InventoryControlBar'

export default function InventarioPage() {
  const [sessions, setSessions] = useState<InventoryGeneralSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [items, setItems] = useState<InventoryGeneralItem[]>([])
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<any>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [saldoFinalFilter, setSaldoFinalFilter] = useState('all')
  const [isEditMode, setIsEditMode] = useState(false)
  const [persistedEmployeeId, setPersistedEmployeeId] = useState<string>('')
  const [persistedSupplierId, setPersistedSupplierId] = useState<string>('')
  const { toast } = useToast()

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id.toString() === selectedSessionId) || null,
    [sessions, selectedSessionId],
  )

  const activeSession = useMemo(
    () => sessions.find((s) => s.status === 'ABERTO'),
    [sessions],
  )

  const canEdit = selectedSession?.status === 'ABERTO'

  const allItemsCounted = useMemo(() => {
    if (!items.length) return false
    return items.every((i) => !i.is_mandatory || i.has_count_record)
  }, [items])

  const loadSessions = useCallback(async () => {
    try {
      const data = await inventoryGeneralService.getSessions()
      setSessions(data)
      return data
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessões.',
        variant: 'destructive',
      })
      return []
    }
  }, [toast])

  const loadItems = useCallback(
    async (id: number) => {
      setLoading(true)
      try {
        const inventoryData = await inventoryGeneralService.getInventoryData(id)
        setItems(inventoryData)
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados.',
          variant: 'destructive',
        })
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    loadSessions().then((data) => {
      if (data.length > 0) setSelectedSessionId(data[0].id.toString())
    })
  }, [loadSessions])

  useEffect(() => {
    if (selectedSessionId) loadItems(Number(selectedSessionId))
    else setItems([])
  }, [selectedSessionId, loadItems])

  const filteredItems = useMemo(() => {
    if (saldoFinalFilter === 'zero')
      return items.filter((i) => i.saldo_final === 0)
    if (saldoFinalFilter === 'positive')
      return items.filter((i) => i.saldo_final > 0)
    return items
  }, [items, saldoFinalFilter])

  const handleStartSession = async () => {
    if (!confirm('Iniciar novo inventário? O atual será fechado.')) return
    try {
      await inventoryGeneralService.startNewSession()
      toast({ title: 'Sucesso', description: 'Novo inventário iniciado.' })
      const data = await loadSessions()
      if (data.length > 0) setSelectedSessionId(data[0].id.toString())
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar inventário.',
        variant: 'destructive',
      })
    }
  }

  const handleResetInitial = async () => {
    if (
      !selectedSession ||
      !confirm('Zerar saldo inicial de todos os produtos?')
    )
      return
    try {
      await inventoryGeneralService.resetInitialBalances(selectedSession.id)
      toast({ title: 'Sucesso', description: 'Saldos iniciais zerados.' })
      loadItems(selectedSession.id)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao resetar saldos.',
        variant: 'destructive',
      })
    }
  }

  const handleFinalize = async () => {
    if (!selectedSession || !confirm('Finalizar e iniciar novo ciclo?')) return
    try {
      await inventoryGeneralService.finalizeAdjustments(
        selectedSession.id,
        items,
      )
      toast({
        title: 'Sucesso',
        description: 'Inventário finalizado e novo ciclo iniciado.',
      })
      const data = await loadSessions()
      if (data.length > 0) setSelectedSessionId(data[0].id.toString())
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Erro Fatal',
        description:
          e.message || 'Falha ao finalizar inventário. Verifique o console.',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateItem = async (
    productId: number,
    type: string,
    value: number,
  ) => {
    if (!selectedSession) return
    try {
      await inventoryGeneralService.updateItemQuantity(
        selectedSession.id,
        productId,
        type as any,
        value,
      )
      toast({ title: 'Atualizado', description: 'Valor atualizado.' })
      loadItems(selectedSession.id)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar valor.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col gap-4">
        <InventoryHeader
          onRefresh={() => {
            if (selectedSessionId) loadItems(Number(selectedSessionId))
            loadSessions()
          }}
          loading={loading}
        />

        <div className="flex items-end gap-4 bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex-1 max-w-md space-y-2">
            <Label>ID Inventário</Label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um inventário" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id.toString()}>
                    #{session.id} - {safeFormatDate(session.data_inicio)} (
                    {session.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <InventoryInfoCard session={selectedSession} />

        <InventoryControlBar
          activeSession={activeSession}
          selectedSession={selectedSession}
          canEdit={canEdit}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          onStartSession={handleStartSession}
          onResetInitial={handleResetInitial}
          onOpenAction={(type) => {
            setActionType(type)
            setIsActionDialogOpen(true)
          }}
          onFinalize={handleFinalize}
          allItemsCounted={allItemsCounted}
        />

        {selectedSession && (
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filtrar Saldo Final:</span>
              <Select
                value={saldoFinalFilter}
                onValueChange={setSaldoFinalFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="zero">Igual a 0</SelectItem>
                  <SelectItem value="positive">Maior que 0</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedSession && (
          <InventoryGeneralTable
            items={filteredItems}
            onMarkAsZero={(pid) => handleUpdateItem(pid, 'CONTAGEM', 0)}
            readOnly={!canEdit}
            isEditMode={isEditMode}
            onUpdateItem={handleUpdateItem}
          />
        )}
      </div>

      <InventoryActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        type={actionType}
        sessionId={selectedSession ? selectedSession.id : 0}
        onSuccess={() =>
          selectedSessionId && loadItems(Number(selectedSessionId))
        }
        persistedEmployeeId={persistedEmployeeId}
        setPersistedEmployeeId={setPersistedEmployeeId}
        persistedSupplierId={persistedSupplierId}
        setPersistedSupplierId={setPersistedSupplierId}
      />
    </div>
  )
}
