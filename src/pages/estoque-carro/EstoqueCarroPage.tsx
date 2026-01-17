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

export default function EstoqueCarroPage() {
  const { employee } = useUserStore()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<EstoqueCarroSession | null>(null)
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

  // Initialization
  useEffect(() => {
    const init = async () => {
      // 1. Fetch Employees list for dropdown
      try {
        const { data } = await employeesService.getEmployees(1, 100)
        // Filter active employees
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      } catch (e) {
        console.error('Failed to load employees', e)
      }

      // 2. Set default selection
      if (employee) {
        setSelectedEmployeeId(employee.id.toString())
      }
    }
    init()
  }, [employee])

  // Watch for selection changes to load session
  useEffect(() => {
    if (selectedEmployeeId) {
      checkActiveSession(parseInt(selectedEmployeeId))
    }
  }, [selectedEmployeeId])

  const checkActiveSession = async (empId: number) => {
    setLoading(true)
    try {
      const active = await estoqueCarroService.getActiveSession(empId)
      setSession(active)
      if (active) {
        await loadSessionData(active)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sessão de estoque.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSessionData = async (activeSession: EstoqueCarroSession) => {
    try {
      const data = await estoqueCarroService.getSessionData(activeSession)
      setItems(data)
    } catch (error) {
      console.error(error)
    }
  }

  const handleStartSession = async () => {
    if (!selectedEmployeeId) return
    setLoading(true)
    try {
      const empId = parseInt(selectedEmployeeId)
      const newSession = await estoqueCarroService.startSession(empId)
      setSession(newSession)
      await loadSessionData(newSession)
      toast({ title: 'Sessão iniciada com sucesso' })
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
    if (!session) return
    if (!confirm('Tem certeza? Isso zerará o saldo inicial de todos os itens.'))
      return

    setLoading(true)
    try {
      await estoqueCarroService.resetInitialBalance(session.id)
      await loadSessionData(session)
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
    if (!session) return

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
    if (!session) return
    setLoading(true)
    try {
      await estoqueCarroService.finishSession(session, items)
      toast({ title: 'Sessão finalizada. Novo estoque iniciado.' })
      setIsFinalizeDialogOpen(false)
      if (selectedEmployeeId) {
        await checkActiveSession(parseInt(selectedEmployeeId))
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
          session={session}
          employeeName={currentEmployeeName}
        />

        <div className="w-full sm:w-[300px] bg-card p-3 rounded-lg border shadow-sm">
          <Label className="text-xs mb-1.5 block text-muted-foreground font-semibold uppercase">
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
            hasActiveSession={!!session}
            onStart={handleStartSession}
            onReset={handleReset}
            onCount={() => setIsCountDialogOpen(true)}
            onFinalize={handleFinalize}
            onBrinde={() => setIsBrindeDialogOpen(true)}
            loading={loading}
            disableFinalize={hasPendingItems}
            canFinalize={hasPermission}
          />

          {session && (
            <>
              <EstoqueCarroTable
                items={items}
                onRefresh={() => loadSessionData(session)}
              />
              <EstoqueCarroCountDialog
                open={isCountDialogOpen}
                onOpenChange={(open) => {
                  setIsCountDialogOpen(open)
                  if (!open && session) loadSessionData(session)
                }}
                sessionId={session.id}
              />
              <BrindeDialog
                open={isBrindeDialogOpen}
                onOpenChange={(open) => {
                  setIsBrindeDialogOpen(open)
                  if (!open && session) loadSessionData(session)
                }}
                sessionId={session.id}
                onSuccess={() => {
                  if (session) loadSessionData(session)
                }}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="acerto" className="pt-4">
          {session && (
            <EstoqueCarroAcertoTab employee={employee || undefined} />
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
