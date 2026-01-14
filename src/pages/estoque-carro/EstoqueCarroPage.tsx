import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { employeesService } from '@/services/employeesService'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { Employee } from '@/types/employee'
import { EstoqueCarroSession, EstoqueCarroItem } from '@/types/estoque_carro'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EstoqueCarroHeader } from '@/components/estoque-carro/EstoqueCarroHeader'
import { EstoqueCarroControlBar } from '@/components/estoque-carro/EstoqueCarroControlBar'
import { EstoqueCarroTable } from '@/components/estoque-carro/EstoqueCarroTable'
import { EstoqueCarroCountDialog } from '@/components/estoque-carro/EstoqueCarroCountDialog'
import { useUserStore } from '@/stores/useUserStore'

export default function EstoqueCarroPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [currentSession, setCurrentSession] =
    useState<EstoqueCarroSession | null>(null)
  const [items, setItems] = useState<EstoqueCarroItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saldoFilter, setSaldoFilter] = useState('todos')
  const [countDialogOpen, setCountDialogOpen] = useState(false)
  const { toast } = useToast()
  const { employee: loggedInUser } = useUserStore()

  useEffect(() => {
    employeesService.getEmployees(1, 100).then(({ data }) => {
      const activeEmps = data.filter((e) => e.situacao === 'ATIVO')
      setEmployees(activeEmps)

      // Auto-select logged-in user
      if (loggedInUser && activeEmps.some((e) => e.id === loggedInUser.id)) {
        setSelectedEmployeeId(loggedInUser.id.toString())
      }
    })
  }, [loggedInUser])

  const loadData = async () => {
    if (!selectedEmployeeId) return
    setLoading(true)
    try {
      const empId = parseInt(selectedEmployeeId)
      let session = await estoqueCarroService.getActiveSession(empId)

      setCurrentSession(session)

      if (session) {
        try {
          await estoqueCarroService.updateStockMovements(session.id, empId)
        } catch (syncError) {
          console.error('Auto-sync failed', syncError)
          toast({
            title: 'Aviso',
            description:
              'Não foi possível sincronizar automaticamente as movimentações.',
            variant: 'destructive',
          })
        }

        const data = await estoqueCarroService.getSessionData(session)
        setItems(data)
      } else {
        setItems([])
      }
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEmployeeId])

  const handleStart = async () => {
    if (!selectedEmployeeId) return
    setLoading(true)
    try {
      await estoqueCarroService.startSession(parseInt(selectedEmployeeId))
      toast({
        title: 'Estoque Carro Iniciado',
        className: 'bg-green-600 text-white',
      })
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao iniciar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!currentSession) return
    if (!confirm('Deseja zerar todo o saldo inicial?')) return
    try {
      await estoqueCarroService.resetInitialBalance(currentSession.id)
      toast({ title: 'Saldo Inicial Zerado' })
      loadData()
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleFinalize = async () => {
    if (!currentSession) return

    // Validation: Check for pending items
    const pendingItems = items.filter(
      (item) => item.diferenca_qtd !== 0 && !item.has_count_record,
    )

    if (pendingItems.length > 0) {
      toast({
        title: 'Impossível Finalizar',
        description: `Existem ${pendingItems.length} produtos com diferenças pendentes de contagem.`,
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Finalizar sessão atual e abrir uma nova?')) return
    setLoading(true)
    try {
      await estoqueCarroService.finishSession(currentSession, items)
      toast({
        title: 'Ciclo Finalizado e Novo Iniciado',
        className: 'bg-blue-600 text-white',
      })
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao finalizar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter((i) => {
    if (saldoFilter === 'igual a 0') return i.saldo_final === 0
    if (saldoFilter === 'maior que 0') return i.saldo_final > 0
    if (saldoFilter === 'menor que 0') return i.saldo_final < 0
    return true
  })

  const selectedEmployeeName =
    employees.find((e) => e.id.toString() === selectedEmployeeId)
      ?.nome_completo || 'N/D'

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque Carro</h1>
          <p className="text-muted-foreground">
            Controle de estoque individual por veículo e vendas.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-[300px] space-y-2">
          <label className="text-sm font-medium">Selecione o Funcionário</label>
          <Select
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Funcionário..." />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedEmployeeId && (
        <div className="space-y-6">
          <EstoqueCarroHeader
            session={currentSession}
            employeeName={selectedEmployeeName}
          />

          <EstoqueCarroControlBar
            hasActiveSession={!!currentSession}
            onStart={handleStart}
            onReset={handleReset}
            onCount={() => setCountDialogOpen(true)}
            onFinalize={handleFinalize}
            loading={loading}
          />

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Produtos Carro</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={saldoFilter} onValueChange={setSaldoFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="igual a 0">Saldo Final = 0</SelectItem>
                      <SelectItem value="maior que 0">
                        Saldo Final &gt; 0
                      </SelectItem>
                      <SelectItem value="menor que 0">
                        Saldo Final &lt; 0
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <EstoqueCarroTable items={filteredItems} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {currentSession && (
        <EstoqueCarroCountDialog
          open={countDialogOpen}
          onOpenChange={setCountDialogOpen}
          sessionId={currentSession.id}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
