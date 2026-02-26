import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { inativarClientesService } from '@/services/inativarClientesService'
import { InativarCliente } from '@/types/inativar_clientes'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserX, ArrowLeft, CheckCircle, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { Link } from 'react-router-dom'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { ExpositorObservationModal } from '@/components/inativar-clientes/ExpositorObservationModal'
import { InativarHistoryTable } from '@/components/inativar-clientes/InativarHistoryTable'

export default function InativarClientesPage() {
  const [data, setData] = useState<InativarCliente[]>([])
  const [historyData, setHistoryData] = useState<InativarCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [targetClient, setTargetClient] = useState<InativarCliente | null>(null)
  const [modalClient, setModalClient] = useState<InativarCliente | null>(null)
  const [clientToDelete, setClientToDelete] = useState<InativarCliente | null>(
    null,
  )
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [list, history] = await Promise.all([
        inativarClientesService.getAll(),
        inativarClientesService.getHistory(),
      ])
      setData(list)
      setHistoryData(history)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de clientes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExpositorCheck = async (
    client: InativarCliente,
    checked: boolean,
  ) => {
    if (checked) {
      // Open modal to capture observation before checking
      setModalClient(client)
    } else {
      // Uncheck immediately (clear observation?)
      try {
        await inativarClientesService.updateExpositorStatus(
          client.id,
          false,
          null,
        )
        // Update local state optimistically
        setData((prev) =>
          prev.map((item) =>
            item.id === client.id
              ? {
                  ...item,
                  expositor_retirado: false,
                  observacoes_expositor: null,
                }
              : item,
          ),
        )
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao atualizar status do expositor.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSaveObservation = async (id: number, observation: string) => {
    await inativarClientesService.updateExpositorStatus(id, true, observation)
    // Update local state
    setData((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              expositor_retirado: true,
              observacoes_expositor: observation,
            }
          : item,
      ),
    )
    toast({
      title: 'Registrado',
      description: 'Retirada de expositor registrada com sucesso.',
    })
  }

  const handleInactivate = async () => {
    if (!targetClient) return

    // Determine Status based on debt (Scenario A/B)
    const hasDebt = (targetClient.debito || 0) > 0
    const newStatus = hasDebt ? 'INATIVO-COBRANÇA' : 'INATIVO'

    try {
      await inativarClientesService.inactivateClient(
        targetClient.id,
        targetClient.cliente_codigo,
        targetClient.cliente_nome,
        newStatus,
      )
      toast({
        title: 'Sucesso',
        description: `Cliente ${targetClient.cliente_nome} inativado com sucesso para ${newStatus}.`,
        className: 'bg-green-600 text-white',
      })
      setTargetClient(null)
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao inativar cliente.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!clientToDelete) return

    try {
      await inativarClientesService.removeEntry(clientToDelete.id)
      toast({
        title: 'Sucesso',
        description: `Cliente ${clientToDelete.cliente_nome} removido da lista de inativação.`,
        className: 'bg-green-600 text-white',
      })
      setClientToDelete(null)
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao remover cliente da lista.',
        variant: 'destructive',
      })
    }
  }

  // Helper to determine confirmation message
  const getConfirmationMessage = () => {
    if (!targetClient) return ''
    const hasDebt = (targetClient.debito || 0) > 0
    if (hasDebt) {
      return 'O cliente está sendo passando de ATIVO para INATIVO-COBRANÇA, porque possui débitos em aberto, confirmar essa alteração?'
    }
    return 'O cliente está sendo passando de ATIVO para INATIVO, confirmar essa alteração?'
  }

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Clientes a Inativar
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de clientes sem estoque que necessitam de inativação.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-600" />
            Lista de Inativação Pendente
          </CardTitle>
          <CardDescription>
            Confirme a inativação. Obrigatório confirmar a retirada do
            expositor.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[80px]">Pedido</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nome Cliente</TableHead>
                    <TableHead className="text-right">Vl. Venda</TableHead>
                    <TableHead className="text-right text-red-600 font-bold">
                      Débito
                    </TableHead>
                    <TableHead className="text-center w-[100px]">
                      Expositor
                    </TableHead>
                    <TableHead className="text-center w-[120px]">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum cliente pendente de inativação.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">
                          #{row.pedido_id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.funcionario_nome}
                        </TableCell>
                        <TableCell className="font-mono">
                          {row.cliente_codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.cliente_nome}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          R$ {formatCurrency(row.valor_venda)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-600 font-bold">
                          R$ {formatCurrency(row.debito)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center items-center">
                            <Checkbox
                              checked={row.expositor_retirado}
                              onCheckedChange={(checked) =>
                                handleExpositorCheck(row, checked === true)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 disabled:opacity-50"
                                      onClick={() => setTargetClient(row)}
                                      disabled={!row.expositor_retirado}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {!row.expositor_retirado
                                      ? 'Marque a retirada do expositor primeiro'
                                      : 'Confirmar Inativação'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={() => setClientToDelete(row)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover da lista de inativação</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <InativarHistoryTable data={historyData} loading={loading} />
      </div>

      {/* Expositor Observation Modal */}
      <ExpositorObservationModal
        isOpen={!!modalClient}
        onClose={() => setModalClient(null)}
        onSave={handleSaveObservation}
        client={modalClient}
      />

      {/* Inactivate Dialog */}
      <AlertDialog
        open={!!targetClient}
        onOpenChange={(open) => !open && setTargetClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-medium">
              {getConfirmationMessage()}
            </AlertDialogDescription>
            <AlertDialogDescription>
              <br />
              <span className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 text-sm font-normal">
                <CheckCircle className="h-4 w-4" />
                Expositor retirado e observação registrada.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Lista de Inativação</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-medium">
              Tem certeza que deseja remover o cliente{' '}
              {clientToDelete?.cliente_nome} desta lista?
            </AlertDialogDescription>
            <AlertDialogDescription>
              Isso <strong>não</strong> alterará o cadastro do cliente nem seu
              histórico de vendas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
