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
import { Loader2, UserX, ArrowLeft, Trash2, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { Link } from 'react-router-dom'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function InativarClientesPage() {
  const [data, setData] = useState<InativarCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [targetClient, setTargetClient] = useState<InativarCliente | null>(null)
  const [removeClient, setRemoveClient] = useState<InativarCliente | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await inativarClientesService.getAll()
      setData(list)
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

  const handleInactivate = async () => {
    if (!targetClient) return

    try {
      await inativarClientesService.inactivateClient(
        targetClient.id,
        targetClient.cliente_codigo,
        targetClient.cliente_nome,
      )
      toast({
        title: 'Sucesso',
        description: `Cliente ${targetClient.cliente_nome} inativado e removido da lista.`,
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

  const handleRemoveEntry = async () => {
    if (!removeClient) return

    try {
      await inativarClientesService.removeEntry(removeClient.id)
      toast({
        title: 'Removido',
        description:
          'Registro removido da lista de pendências (Cliente não foi inativado).',
      })
      setRemoveClient(null)
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao remover registro.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
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
            Confirme a inativação ou remova da lista.
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
                    <TableHead className="text-right">Saldo Pagar</TableHead>
                    <TableHead className="text-right text-green-600">
                      Vl. Pago
                    </TableHead>
                    <TableHead className="text-right text-red-600 font-bold">
                      Débito Total
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
                        colSpan={9}
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
                        <TableCell className="text-right text-sm">
                          R$ {formatCurrency(row.saldo_a_pagar)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-green-600">
                          R$ {formatCurrency(row.valor_pago)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-red-600 font-bold">
                          R$ {formatCurrency(row.debito)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    onClick={() => setTargetClient(row)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Confirmar Inativação</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                    onClick={() => setRemoveClient(row)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover da Lista (Ignorar)</p>
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

      {/* Inactivate Dialog */}
      <AlertDialog
        open={!!targetClient}
        onOpenChange={(open) => !open && setTargetClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Inativação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente inativar o cliente{' '}
              <strong>{targetClient?.cliente_nome}</strong>?
              <br />
              Isso atualizará o status do cliente para "INATIVO" e removerá este
              registro da lista pendente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleInactivate}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Dialog */}
      <AlertDialog
        open={!!removeClient}
        onOpenChange={(open) => !open && setRemoveClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da Lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover <strong>{removeClient?.cliente_nome}</strong> da
              lista de pendências
              <strong> SEM inativar</strong> o cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveEntry}>
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
