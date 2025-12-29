import { useState, useMemo } from 'react'
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
import { Search, Eraser } from 'lucide-react'
import { ClientDebt, OrderDebt } from '@/types/cobranca'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { DebtDetailsDialog } from './DebtDetailsDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cobrancaService } from '@/services/cobrancaService'
import { useToast } from '@/hooks/use-toast'

interface DebtTableProps {
  data: ClientDebt[]
}

// Flattened row type for display
interface FlatOrderRow extends OrderDebt {
  clientId: number
  clientName: string
  clientType: string
  clientOrderCount: number
}

export function DebtTable({ data }: DebtTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  // Local state for optimistic updates on editable fields
  const [localUpdates, setLocalUpdates] = useState<
    Record<number, Partial<OrderDebt>>
  >({})

  const handleOpenDetails = (client: ClientDebt) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  const flattenedData: FlatOrderRow[] = useMemo(() => {
    return data.flatMap((client) =>
      client.orders.map((order) => ({
        ...order,
        clientId: client.clientId,
        clientName: client.clientName,
        clientType: client.clientType,
        clientOrderCount: client.orderCount,
        // Apply local updates if any
        ...localUpdates[order.orderId],
      })),
    )
  }, [data, localUpdates])

  const handleUpdateField = async (
    orderId: number,
    field: 'forma_cobranca' | 'data_combinada',
    value: any,
  ) => {
    // Optimistic Update
    setLocalUpdates((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [field === 'forma_cobranca' ? 'formaCobranca' : 'dataCombinada']: value,
      },
    }))

    try {
      await cobrancaService.updateOrderField(orderId, field, value)
      toast({
        title: 'Atualizado',
        description: 'Dados atualizados com sucesso.',
        duration: 1500,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar dados.',
        variant: 'destructive',
      })
      // Revert optimistic update? For simplicity, we keep it but warn.
    }
  }

  const handleClearAll = async (field: 'forma_cobranca' | 'data_combinada') => {
    // Clear for ALL visible rows
    const updates = {} as Record<number, Partial<OrderDebt>>
    const promises: Promise<void>[] = []

    for (const row of flattenedData) {
      if (
        (field === 'forma_cobranca' && row.formaCobranca) ||
        (field === 'data_combinada' && row.dataCombinada)
      ) {
        updates[row.orderId] = {
          ...localUpdates[row.orderId],
          [field === 'forma_cobranca' ? 'formaCobranca' : 'dataCombinada']:
            null,
        }
        promises.push(
          cobrancaService.updateOrderField(row.orderId, field, null),
        )
      }
    }

    setLocalUpdates((prev) => ({ ...prev, ...updates }))

    try {
      await Promise.all(promises)
      toast({
        title: 'Limpeza Concluída',
        description: `Campo ${field === 'forma_cobranca' ? 'Forma de Cobrança' : 'Data Combinada'} limpo para todos os itens visíveis.`,
      })
    } catch (error) {
      toast({
        title: 'Erro parcial',
        description: 'Alguns itens podem não ter sido limpos.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead>Nome Cliente</TableHead>
              <TableHead className="text-center w-[80px]">
                Qtd. Pedidos
              </TableHead>
              <TableHead className="w-[80px]">Pedido #</TableHead>
              <TableHead>Data Venda</TableHead>
              <TableHead>F. Pagamento</TableHead>
              <TableHead className="text-right">Valor Devido</TableHead>
              <TableHead className="text-center">Status</TableHead>

              {/* Editable Columns */}
              <TableHead className="min-w-[150px]">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center justify-between w-full">
                    <span>Forma Cobrança</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-red-500"
                      onClick={() => handleClearAll('forma_cobranca')}
                      title="Limpar todos"
                    >
                      <Eraser className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TableHead>
              <TableHead className="min-w-[140px]">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center justify-between w-full">
                    <span>Data Combinada</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-red-500"
                      onClick={() => handleClearAll('data_combinada')}
                      title="Limpar todos"
                    >
                      <Eraser className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </TableHead>

              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              flattenedData.map((row) => (
                <TableRow
                  key={`${row.clientId}-${row.orderId}`}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {row.clientId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.clientType}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {row.clientName}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {row.clientOrderCount}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.orderId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.date ? format(parseISO(row.date), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell
                    className="text-xs truncate max-w-[100px]"
                    title={row.formaPagamento}
                  >
                    {row.formaPagamento}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-red-600">
                    R$ {formatCurrency(row.valorDevido)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        row.status === 'VENCIDO'
                          ? 'destructive'
                          : row.status === 'SEM DÉBITO'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="text-[10px] px-1 py-0 h-5"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>

                  {/* Editable: Forma de Cobrança */}
                  <TableCell>
                    <Select
                      value={row.formaCobranca || ''}
                      onValueChange={(val) =>
                        handleUpdateField(
                          row.orderId,
                          'forma_cobranca',
                          val || null,
                        )
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="MOTOQUEIRO">MOTOQUEIRO</SelectItem>
                        <SelectItem value="BOLETO">BOLETO</SelectItem>
                        <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Editable: Data Combinada */}
                  <TableCell>
                    <Input
                      type="date"
                      className="h-7 text-xs w-full px-1"
                      value={row.dataCombinada || ''}
                      onChange={(e) =>
                        handleUpdateField(
                          row.orderId,
                          'data_combinada',
                          e.target.value || null,
                        )
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Find original client object to pass to details
                        const originalClient = data.find(
                          (c) => c.clientId === row.clientId,
                        )
                        if (originalClient) handleOpenDetails(originalClient)
                      }}
                      title="Ver Detalhes do Cliente"
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
