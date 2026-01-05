import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  History,
  MessageCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
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
import { useState } from 'react'
import { ClientRow } from '@/types/client'
import { clientsService } from '@/services/clientsService'
import { Badge } from '@/components/ui/badge'

interface ClientTableProps {
  clients: ClientRow[]
  onUpdate: () => void
}

export function ClientTable({ clients, onUpdate }: ClientTableProps) {
  const { toast } = useToast()
  const [clientToDelete, setClientToDelete] = useState<number | null>(null)

  const handleDelete = async () => {
    if (clientToDelete) {
      try {
        await clientsService.delete(clientToDelete)
        toast({
          title: 'Cliente excluído',
          description: 'O cliente foi removido com sucesso.',
        })
        onUpdate()
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir o cliente.',
          variant: 'destructive',
        })
      } finally {
        setClientToDelete(null)
      }
    }
  }

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank')
    }
  }

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'ATIVO':
        return 'default'
      case 'INATIVO':
        return 'secondary'
      case 'INATIVO - ROTA':
        return 'outline' // Visual differentiation
      case 'BLOQUEADO':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>TIPO CLIENTE</TableHead>
              <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
              <TableHead className="hidden lg:table-cell">Cidade</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.CODIGO}
                className="group hover:bg-muted/50 transition-colors"
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{client.CODIGO}</span>
                    {/* Small badge for quick visual ref on mobile too */}
                    <Badge
                      variant="outline"
                      className="w-fit text-[10px] px-1 py-0 h-4 md:hidden"
                    >
                      {client['TIPO DE CLIENTE']?.substring(0, 3) || 'N/D'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {client['NOME CLIENTE']}
                    </span>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {client.CNPJ || '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={getStatusVariant(client['TIPO DE CLIENTE'])}
                    className="text-xs whitespace-nowrap"
                  >
                    {client['TIPO DE CLIENTE'] || 'N/D'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {client.CNPJ || '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {client.MUNICÍPIO || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-2">
                    <span>{client['FONE 1'] || client['FONE 2'] || '-'}</span>
                    {client['FONE 1'] && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleWhatsApp(client['FONE 1'])}
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={`/clientes/${client.CODIGO}/historico`}>
                          <History className="mr-2 h-4 w-4" /> Resumo de Acerto
                          (Histórico)
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={`/clientes/${client.CODIGO}`}>
                          <Edit className="mr-2 h-4 w-4" /> Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onSelect={() => setClientToDelete(client.CODIGO)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o
              cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
