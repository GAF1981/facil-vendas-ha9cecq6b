import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  RefreshCw,
  Play,
  StopCircle,
  RotateCcw,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  Truck,
  CheckSquare,
} from 'lucide-react'
import { InventoryGeneralTable } from '@/components/inventario/InventoryGeneralTable'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { InventoryGeneralSession, InventoryGeneralItem } from '@/types/inventory_general'
import { useToast } from '@/hooks/use-toast'
import { safeFormatDate } from '@/lib/formatters'
import { InventoryInfoCard } from '@/components/inventario/InventoryInfoCard'
import { InventoryActionDialog } from '@/components/inventario/InventoryActionDialog'

export default function InventarioPage() {
  const [activeSession, setActiveSession] = useState<InventoryGeneralSession | null>(null)
  const [items, setItems] = useState<InventoryGeneralItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionType, setActionType] = useState<any>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const session = await inventoryGeneralService.getActiveSession()
      setActiveSession(session)
      if (session) {
        const inventoryData = await inventoryGeneralService.getInventoryData(session.id)
        setItems(inventoryData)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Falha ao carregar dados do inventário.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStartSession = async () => {
    if (!confirm("Isso fechará o inventário atual (se houver) e iniciará um novo baseado no saldo final anterior. Deseja continuar?")) return
    try {
      await inventoryGeneralService.startNewSession()
      toast({ title: 'Sucesso', description: 'Novo inventário iniciado.' })
      loadData()
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao iniciar inventário.', variant: 'destructive' })
    }
  }

  const handleResetInitial = async () => {
    if (!activeSession) return
    if (!confirm("Isso zerará o saldo inicial de todos os produtos no inventário atual. Deseja continuar?")) return
    try {
      await inventoryGeneralService.resetInitialBalances(activeSession.id)
      toast({ title: 'Sucesso', description: 'Saldos iniciais zerados.' })
      loadData()
    } catch (error) {
        toast({ title: 'Erro', description: 'Falha ao resetar saldos.', variant: 'destructive' })
    }
  }

  const handleOpenAction = (type: string) => {
    if (!activeSession) return
    setActionType(type)
    setIsActionDialogOpen(true)
  }

  const handleFinalize = async () => {
    if (!activeSession) return
    if (!confirm("Deseja finalizar os ajustes e abrir um novo inventário?")) return
    
    try {
        await inventoryGeneralService.finalizeAdjustments(activeSession.id, items)
        toast({ title: 'Sucesso', description: 'Inventário finalizado e novo ciclo iniciado.' })
        loadData()
    } catch (e) {
        toast({ title: 'Erro', description: 'Falha ao finalizar.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-100 text-violet-700 rounded-lg">
                    <ClipboardList className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventário Geral</h1>
                    <p className="text-muted-foreground">Controle total de estoque</p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="w-4 h-4" /></Button>
            </div>
        </div>

        <InventoryInfoCard session={activeSession} />

        {/* Actions Toolbar */}
        <Card>
            <CardContent className="p-4 flex flex-wrap gap-2">
                {!activeSession ? (
                    <Button onClick={handleStartSession} className="bg-green-600 hover:bg-green-700">
                        <Play className="mr-2 h-4 w-4" /> Iniciar Inventário Geral
                    </Button>
                ) : (
                    <>
                        <Button variant="outline" onClick={handleResetInitial} className="text-red-600 border-red-200 hover:bg-red-50">
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset Saldo Inicial
                        </Button>
                        <Button variant="secondary" onClick={() => handleOpenAction('COMPRA')}>
                            <PackagePlus className="mr-2 h-4 w-4" /> Compras
                        </Button>
                        <Button variant="secondary" onClick={() => handleOpenAction('CARRO_PARA_ESTOQUE')}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Devoluções (Carro -> Est)
                        </Button>
                        <Button variant="secondary" onClick={() => handleOpenAction('PERDA')}>
                            <PackageMinus className="mr-2 h-4 w-4" /> Perdas
                        </Button>
                        <Button variant="secondary" onClick={() => handleOpenAction('ESTOQUE_PARA_CARRO')}>
                            <Truck className="mr-2 h-4 w-4" /> Reposições (Est -> Carro)
                        </Button>
                        <Button variant="secondary" onClick={() => handleOpenAction('CONTAGEM')}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Contagem
                        </Button>
                        <div className="flex-1" />
                        <Button onClick={handleFinalize} className="bg-blue-600 hover:bg-blue-700">
                            <StopCircle className="mr-2 h-4 w-4" /> Finalizar e Novo Ciclo
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>

        {activeSession && (
            <InventoryGeneralTable items={items} />
        )}
      </div>

      <InventoryActionDialog 
        open={isActionDialogOpen} 
        onOpenChange={setIsActionDialogOpen}
        type={actionType}
        sessionId={activeSession?.id || 0}
        onSuccess={loadData}
      />
    </div>
  )
}
