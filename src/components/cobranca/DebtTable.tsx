import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { ClientDebt } from '@/types/cobranca'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DebtDetailsDialog } from './DebtDetailsDialog'

interface DebtTableProps {
  data: ClientDebt[]
}

export function DebtTable({ data }: DebtTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenDetails = (client: ClientDebt) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="hidden md:table-cell">
                Últ. Acerto
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                Vencimento Antigo
              </TableHead>
              <TableHead className="text-right">Total Devido</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum cliente com débito encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((client) => (
                <TableRow key={client.clientId} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-medium">
                    {client.clientId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {client.clientName}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-mono">
                      {client.orderCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        client.status === 'VENCIDO' ? 'destructive' : 'outline'
                      }
                      className={
                        client.status === 'A VENCER'
                          ? 'border-yellow-500 text-yellow-600'
                          : ''
                      }
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {client.lastAcertoDate
                      ? format(parseISO(client.lastAcertoDate), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {client.oldestOverdueDate ? (
                      <span className="text-red-600 font-medium">
                        {format(
                          parseISO(client.oldestOverdueDate),
                          'dd/MM/yyyy',
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    R$ {formatCurrency(client.totalDebt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDetails(client)}
                      title="Ver Detalhes"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DebtDetailsDialog
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        client={selectedClient}
      />
    </>
  )
}
