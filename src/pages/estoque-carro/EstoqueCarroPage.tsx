import { useEffect, useState, useMemo } from 'react'
import { EstoqueCarroHeader } from '@/components/estoque-carro/EstoqueCarroHeader'
import { EstoqueCarroControlBar } from '@/components/estoque-carro/EstoqueCarroControlBar'
import { EstoqueCarroTable } from '@/components/estoque-carro/EstoqueCarroTable'
import { EstoqueCarroCountDialog } from '@/components/estoque-carro/EstoqueCarroCountDialog'
import { EstoqueCarroAcertoTab } from '@/components/estoque-carro/EstoqueCarroAcertoTab'
import { EstoqueCarroDeliveryHistory } from '@/components/estoque-carro/EstoqueCarroDeliveryHistory'
import { BrindeDialog } from '@/components/estoque-carro/BrindeDialog'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { employeesService } from '@/services/employeesService'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { EstoqueCarroItem, EstoqueCarroSession } from '@/types/estoque_carro'
import { Employee } from '@/types/employee'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { safeFormatDate } from '@/lib/formatters'
import { usePermissions } from '@/hooks/use-permissions'

export default function EstoqueCarroPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const { canAccess } = usePermissions()

  const [loading, setLoading] = useState(false)

  // Session State
  const [sessions, setSessions] = useState<EstoqueCarroSession[]>([])
  const [activeSession, setActiveSession] =
    useState<EstoqueCarroSession | null>(null)
  const [viewedSession, setViewedSession] =
    useState<EstoqueCarroSession | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  const [items, setItems] = useState<EstoqueCarroItem[]>([])
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false)
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false)
  const [isBrindeDialogOpen, setIsBrindeDialogOpen] = useState(false)

  // Employee Filter & Permissions
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  // Check permissions: 'Estoque' or 'Administrador'
  const hasPermission = useMemo(() => {
    if (!employee?.setor) return false
    // Handle both string and array formats for robustness
    const sectors = Array.isArray(employee.setor)
      ? employee.setor
      : [employee.setor]
    return sectors.some(
      (s) =>
        s.toLowerCase() === 'estoque' || s.toLowerCase() === 'administrador',
    )
  }, [employee])

  // Initialization: Load Employees
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await employeesService.getEmployees(1, 100)
        // Filter active employees
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      } catch (e) {
        console.error('Failed to load employees', e)
      }

      // Set default selection
      if (employee) {
        setSelectedEmployeeId(employee.id.toString())
      }
    }
    init()
  }, [employee])

  // Watch for Employee change -> Load Sessions
  useEffect(() => {
    if (selectedEmployeeId) {
      loadEmployeeSessions(parseInt(selectedEmployeeId))
    } else {
      setSessions([])
      setActiveSession(null)
      setViewedSession(null)
      setSelectedSessionId('')
      setItems([])
    }
  }, [selectedEmployeeId])

  // Watch for Session Selection change -> Load Session Data
  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find(
        (s) => s.id.toString() === selectedSessionId,
      )
      if (session) {
        setViewedSession(session)
        loadSessionData(session)
      }
    } else {
      setViewedSession(null)
      setItems([])
    }
  }, [selectedSessionId, sessions])

  const loadEmployeeSessions = async (empId: number) => {
    setLoading(true)
    try {
      const fetchedSessions = await estoqueCarroService.getSessions(empId)
      setSessions(fetchedSessions)

      // Find active session (data_fim is null)
      const active = fetchedSessions.find((s) => !s.data_fim) || null
      setActiveSession(active)

      // Determine initial selection
      // Priority: Active Session > Latest History > None
      if (active) {
        setSelectedSessionId(active.id.toString())
      } else if (fetchedSessions.length > 0) {
        // Use latest (first in list due to descending sort)
        setSelectedSessionId(fetchedSessions[0].id.toString())
      } else {
        setSelectedSessionId('')
        setViewedSession(null)
        setItems([])
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessões de estoque.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (session: EstoqueCarroSession) => {
    setLoading(true)
    try {
      const data = await estoqueCarroService.getSessionData(session)
      setItems(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados da sessão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartSession = async () => {
    if (!selectedEmployeeId) return
    setLoading(true)
    try {
      const empId = parseInt(selectedEmployeeId)
      await estoqueCarroService.startSession(empId)
      toast({ title: 'Sessão iniciada com sucesso' })
      // Refresh sessions
      await loadEmployeeSessions(empId)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar sessão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!viewedSession) return
    if (!confirm('Tem certeza? Isso zerará o saldo inicial de todos os itens.'))
      return

    setLoading(true)
    try {
      await estoqueCarroService.resetInitialBalance(viewedSession.id)
      await loadSessionData(viewedSession)
      toast({ title: 'Saldo inicial resetado' })
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pending items state
  const hasPendingItems = items.some(
    (item) => item.saldo_final !== 0 && !item.has_count_record,
  )

  const handleFinalize = async () => {
    if (!viewedSession) return

    if (hasPendingItems) {
      toast({
        title: 'Ação Bloqueada',
        description:
          'Existem itens com saldo final pendente de contagem. Realize a contagem antes de finalizar.',
        variant: 'destructive',
      })
      return
    }

    setIsFinalizeDialogOpen(true)
  }

  const confirmFinalize = async () => {
    if (!viewedSession) return
    setLoading(true)
    try {
      await estoqueCarroService.finishSession(viewedSession, items)
      toast({ title: 'Sessão finalizada. Novo estoque iniciado.' })
      setIsFinalizeDialogOpen(false)
      // Refresh sessions to pick up the change and the new active session
      if (selectedEmployeeId) {
        await loadEmployeeSessions(parseInt(selectedEmployeeId))
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao finalizar sessão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currentEmployeeName =
    employees.find((e) => e.id.toString() === selectedEmployeeId)
      ?.nome_completo ||
    employee?.nome_completo ||
    ''

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4">
        <EstoqueCarroHeader
          session={viewedSession}
          employeeName={currentEmployeeName}
        />

        <div className="flex flex-col gap-4 sm:flex-row w-full sm:w-auto">
          {/* Added border-red-500 border-2 for visual highlight */}
          <div className="w-full sm:w-[250px] bg-card p-3 rounded-lg border border-red-500 border-2 shadow-sm">
            <Label className="text-xs mb-1.5 block text-red-600 font-bold uppercase">
              Visualizar Estoque de:
            </Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={!hasPermission}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasPermission && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Visualização restrita ao seu usuário.
              </p>
            )}
          </div>

          <div className="w-full sm:w-[200px] bg-card p-3 rounded-lg border shadow-sm">
            <Label className="text-xs mb-1.5 block text-muted-foreground font-semibold uppercase">
              ID Estoque Carro:
            </Label>
            <Select
              value={selectedSessionId}
              onValueChange={setSelectedSessionId}
              disabled={sessions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    #{s.id} - {safeFormatDate(s.data_inicio, 'dd/MM/yyyy')}
                    {s.data_fim ? '' : ' (Ativo)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto bg-transparent overflow-x-auto">
          <TabsTrigger
            value="produtos"
            className="rounded-t-md data-[state=active]:bg-background data-[state=active]:border-b-0 border border-transparent px-4 py-2"
          >
            Produtos Carro
          </TabsTrigger>
          <TabsTrigger
            value="acerto"
            className="rounded-t-md data-[state=active]:bg-background data-[state=active]:border-b-0 border border-transparent px-4 py-2"
          >
            Acerto Carro
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-t-md data-[state=active]:bg-background data-[state=active]:border-b-0 border border-transparent px-4 py-2"
          >
            Histórico de Entregas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produtos" className="space-y-4 pt-4">
          <EstoqueCarroControlBar
            viewedSession={viewedSession}
            activeSession={activeSession}
            onStart={handleStartSession}
            onReset={handleReset}
            onCount={() => setIsCountDialogOpen(true)}
            onFinalize={handleFinalize}
            onBrinde={() => setIsBrindeDialogOpen(true)}
            loading={loading}
            disableFinalize={hasPendingItems}
            canFinalize={hasPermission}
          />

          {viewedSession && (
            <>
              <EstoqueCarroTable
                items={items}
                onRefresh={() => loadSessionData(viewedSession)}
              />
              <EstoqueCarroCountDialog
                open={isCountDialogOpen}
                onOpenChange={(open) => {
                  setIsCountDialogOpen(open)
                  if (!open && viewedSession) loadSessionData(viewedSession)
                }}
                sessionId={viewedSession.id}
              />
              <BrindeDialog
                open={isBrindeDialogOpen}
                onOpenChange={(open) => {
                  setIsBrindeDialogOpen(open)
                  if (!open && viewedSession) loadSessionData(viewedSession)
                }}
                sessionId={viewedSession.id}
                onSuccess={() => {
                  if (viewedSession) loadSessionData(viewedSession)
                }}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="acerto" className="pt-4">
          {viewedSession && !viewedSession.data_fim ? (
            <EstoqueCarroAcertoTab employee={employee || undefined} />
          ) : (
            <div className="text-center p-8 text-muted-foreground border rounded-md bg-muted/20">
              <p>
                A aba de Acerto só está disponível para sessões ativas (não
                finalizadas).
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
          <EstoqueCarroDeliveryHistory />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={isFinalizeDialogOpen}
        onOpenChange={setIsFinalizeDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Estoque Carro</AlertDialogTitle>
            <AlertDialogDescription>
              Isso fechará a sessão atual, salvará os saldos finais e iniciará
              automaticamente um novo período com esses saldos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
