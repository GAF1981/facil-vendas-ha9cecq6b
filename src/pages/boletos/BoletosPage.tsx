import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Barcode,
  Plus,
  Search,
  Loader2,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Boleto, BoletoWithConferido } from '@/types/boleto'
import { boletoService } from '@/services/boletoService'
import { cobrancaService } from '@/services/cobrancaService'
import { useToast } from '@/hooks/use-toast'
import { BoletoCard } from '@/components/boletos/BoletoCard'
import { BoletoFormDialog } from '@/components/boletos/BoletoFormDialog'
import { BoletoImportDialog } from '@/components/boletos/BoletoImportDialog'
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
import { format, parseISO } from 'date-fns'

interface FlatDebt {
  cliente_codigo: number
  vencimento: string | null
  debito: number
}

export default function BoletosPage() {
  const [loading, setLoading] = useState(true)
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [flatDebts, setFlatDebts] = useState<FlatDebt[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBoleto, setEditingBoleto] = useState<Boleto | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [fetchedBoletos, allDebts] = await Promise.all([
        boletoService.getAll(),
        cobrancaService.getDebts(),
      ])

      setBoletos(fetchedBoletos)

      // Flatten debts to easily match conditions
      const flattened = allDebts.flatMap((client) =>
        client.orders.flatMap((order) =>
          order.installments.map((inst) => {
            const debito = Math.max(0, inst.valorRegistrado - inst.valorPago)
            const vencimento = inst.vencimento
              ? inst.vencimento.substring(0, 10)
              : null
            return {
              cliente_codigo: client.clientId,
              vencimento,
              debito,
            }
          }),
        ),
      )
      setFlatDebts(flattened)
    } catch (error) {
      console.error('Error fetching boletos data:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const boletosWithConferido: BoletoWithConferido[] = useMemo(() => {
    return boletos.map((boleto) => {
      const bDate = boleto.vencimento
        ? boleto.vencimento.substring(0, 10)
        : null

      // Conferido Logic: Match client code, due date, and debt amount
      const isConferido = flatDebts.some(
        (debt) =>
          debt.cliente_codigo === boleto.cliente_codigo &&
          debt.vencimento === bDate &&
          Math.abs(debt.debito - boleto.valor) < 0.01,
      )

      return {
        ...boleto,
        conferido: isConferido ? 'SIM' : 'NÃO',
      }
    })
  }, [boletos, flatDebts])

  const filteredBoletos = useMemo(() => {
    if (!searchTerm.trim()) return boletosWithConferido

    const lower = searchTerm.toLowerCase()
    return boletosWithConferido.filter(
      (b) =>
        b.cliente_nome.toLowerCase().includes(lower) ||
        b.cliente_codigo.toString().includes(lower) ||
        (b.pedido_id && b.pedido_id.toString().includes(lower)),
    )
  }, [searchTerm, boletosWithConferido])

  const handleEdit = (boleto: Boleto) => {
    setEditingBoleto(boleto)
    setIsFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await boletoService.delete(deleteId)
      toast({ title: 'Sucesso', description: 'Boleto excluído.' })
      loadData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  const handleExport = () => {
    boletoService.generateCSV(filteredBoletos)
    toast({
      title: 'Exportação Concluída',
      description: 'O download iniciará em breve.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Barcode className="h-8 w-8 text-primary" />
            Gestão de Boletos
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento e conferência automatizada de boletos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BoletoImportDialog onSuccess={loadData} />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filteredBoletos.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button
            onClick={() => {
              setEditingBoleto(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Boleto
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, código ou pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={loading}
            title="Atualizar Dados"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredBoletos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhum boleto encontrado</h3>
          <p className="text-muted-foreground">
            Cadastre um novo ou importe via CSV.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBoletos.map((boleto) => (
            <BoletoCard
              key={boleto.id}
              boleto={boleto}
              onEdit={handleEdit}
              onDelete={setDeleteId}
            />
          ))}
        </div>
      )}

      <BoletoFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
        initialData={editingBoleto}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir este boleto? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
