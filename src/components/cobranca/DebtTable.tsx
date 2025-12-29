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
import { ClientDebt, OrderDebt, Receivable } from '@/types/cobranca'
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
import { cn } from '@/lib/utils'

interface DebtTableProps {
  data: ClientDebt[]
}

// Flattened row type for display
interface FlatRow {
  uniqueId: string
  clientId: number
  clientName: string
  clientType: string
  clientOrderCount: number
  orderId: number
  orderDate: string
  // Installment specific
  vencimento: string | null
  formaPagamento: string
  valorRegistrado: number
  valorPago: number
  status: 'VENCIDO' | 'A VENCER' | 'PAGO'
  // Editable fields (Order Level)
  formaCobranca: string | null
  dataCombinada: string | null
}

export function DebtTable({ data }: DebtTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  // Local state for optimistic updates on editable fields (Order Level)
  const [localUpdates, setLocalUpdates] = useState<
    Record<number, { formaCobranca?: any; dataCombinada?: any }>
  >({})

  const handleOpenDetails = (client: ClientDebt) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  const flattenedData: FlatRow[] = useMemo(() => {
    return data.flatMap((client) =>
      client.orders.flatMap((order) => {
        // Apply local updates
        const updates = localUpdates[order.orderId] || {}
        const currentFormaCobranca =
          updates.formaCobranca !== undefined
            ? updates.formaCobranca
            : order.formaCobranca
        const currentDataCombinada =
          updates.dataCombinada !== undefined
            ? updates.dataCombinada
            : order.dataCombinada

        // Use installments for granular rows
        return order.installments.map((inst, index) => ({
          uniqueId: `${client.clientId}-${order.orderId}-${inst.id}-${index}`,
          clientId: client.clientId,
          clientName: client.clientName,
          clientType: client.clientType,
          clientOrderCount: client.orderCount,
          orderId: order.orderId,
          orderDate: order.date,
          vencimento: inst.vencimento,
          formaPagamento: inst.formaPagamento,
          valorRegistrado: inst.valorRegistrado,
          valorPago: inst.valorPago,
          status: inst.status,
          formaCobranca: currentFormaCobranca,
          dataCombinada: currentDataCombinada,
        }))
      }),
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
    }
  }

  const handleClearAll = async (field: 'forma_cobranca' | 'data_combinada') => {
    // Collect unique order IDs visible
    const visibleOrderIds = new Set(flattenedData.map((r) => r.orderId))
    const updates = {} as Record<
      number,
      { formaCobranca?: any; dataCombinada?: any }
    >
    const promises: Promise<void>[] = []

    visibleOrderIds.forEach((oid) => {
      updates[oid] = {
        ...localUpdates[oid],
        [field === 'forma_cobranca' ? 'formaCobranca' : 'dataCombinada']: null,
      }
      promises.push(cobrancaService.updateOrderField(oid, field, null))
    })

    setLocalUpdates((prev) => ({ ...prev, ...updates }))

    try {
      await Promise.all(promises)
      toast({
        title: 'Limpeza Concluída',
        description: `Campo ${field === 'forma_cobranca' ? 'Forma de Cobrança' : 'Data Combinada'} limpo para todos os pedidos visíveis.`,
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
              <TableHead className="w-[70px]">Código</TableHead>
              <TableHead className="w-[90px]">Tipo</TableHead>
              <TableHead className="min-w-[150px]">Nome Cliente</TableHead>
              <TableHead className="w-[80px]">Pedido #</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>F. Pagamento</TableHead>
              <TableHead className="text-right">Valor Parc.</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-center">Status</TableHead>

              {/* Editable Columns */}
              <TableHead className="min-w-[140px]">
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
              <TableHead className="min-w-[130px]">
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
                <TableRow key={row.uniqueId} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-medium">
                    {row.clientId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.clientType}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {row.clientName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.orderId}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.vencimento
                      ? format(parseISO(row.vencimento), 'dd/MM/yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell
                    className="text-xs truncate max-w-[100px]"
                    title={row.formaPagamento}
                  >
                    {row.formaPagamento}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(row.valorRegistrado)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-green-600">
                    {formatCurrency(row.valorPago)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        row.status === 'VENCIDO'
                          ? 'destructive'
                          : row.status === 'PAGO'
                            ? 'secondary'
                            : 'outline'
                      }
                      className={cn(
                        'text-[10px] px-1 py-0 h-5',
                        row.status === 'PAGO' &&
                          'bg-green-100 text-green-700 hover:bg-green-200',
                      )}
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
