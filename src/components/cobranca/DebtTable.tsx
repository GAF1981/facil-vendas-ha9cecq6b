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
import { Search, Eraser, MessageSquareText } from 'lucide-react'
import { ClientDebt } from '@/types/cobranca'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { DebtDetailsDialog } from './DebtDetailsDialog'
import { CollectionActionsSheet } from './CollectionActionsSheet'
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
  onRefresh?: () => void
}

// Flattened row type for display
interface FlatRow {
  uniqueId: string
  receivableId: number
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
  debito: number
  status: 'VENCIDO' | 'A VENCER' | 'PAGO'
  // Editable fields (Receivable Level)
  formaCobranca: string | null
  dataCombinada: string | null
  // New field
  collectionActionCount: number
}

export function DebtTable({ data, onRefresh }: DebtTableProps) {
  const [selectedClient, setSelectedClient] = useState<ClientDebt | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Sheet State
  const [selectedOrderForActions, setSelectedOrderForActions] = useState<{
    orderId: string
    clientId: number
    clientName: string
  } | null>(null)

  const { toast } = useToast()

  // Local state for optimistic updates on editable fields (Receivable Level)
  const [localUpdates, setLocalUpdates] = useState<
    Record<string, { formaCobranca?: any; dataCombinada?: any }>
  >({})

  const handleOpenDetails = (client: ClientDebt) => {
    setSelectedClient(client)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedClient(null)
  }

  const handleOpenActions = (
    orderId: number,
    clientId: number,
    clientName: string,
  ) => {
    setSelectedOrderForActions({
      orderId: orderId.toString(),
      clientId,
      clientName,
    })
  }

  const flattenedData: FlatRow[] = useMemo(() => {
    return data.flatMap((client) =>
      client.orders.flatMap((order) => {
        return order.installments.map((inst, index) => {
          const uniqueId = `${client.clientId}-${order.orderId}-${inst.id}-${index}`
          const updates = localUpdates[uniqueId] || {}

          const currentFormaCobranca =
            updates.formaCobranca !== undefined
              ? updates.formaCobranca
              : inst.formaCobranca

          const currentDataCombinada =
            updates.dataCombinada !== undefined
              ? updates.dataCombinada
              : inst.dataCombinada

          // Calculate Debt (Débito)
          const debito = Math.max(0, inst.valorRegistrado - inst.valorPago)

          return {
            uniqueId,
            receivableId: inst.id,
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
            debito,
            status: inst.status,
            formaCobranca: currentFormaCobranca,
            dataCombinada: currentDataCombinada,
            collectionActionCount: order.collectionActionCount,
          }
        })
      }),
    )
  }, [data, localUpdates])

  const handleUpdateField = async (
    row: FlatRow,
    field: 'forma_cobranca' | 'data_combinada',
    value: any,
  ) => {
    // Optimistic Update
    setLocalUpdates((prev) => ({
      ...prev,
      [row.uniqueId]: {
        ...prev[row.uniqueId],
        [field === 'forma_cobranca' ? 'formaCobranca' : 'dataCombinada']: value,
      },
    }))

    try {
      await cobrancaService.updateReceivableField(
        row.receivableId,
        row.orderId,
        field,
        value,
        // Provide extra data in case we need to materialize a synthetic receivable
        row.receivableId < 0
          ? {
              valorRegistrado: row.valorRegistrado,
              vencimento: row.vencimento,
              formaPagamento: row.formaPagamento,
            }
          : undefined,
      )
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
              <TableHead className="text-right">Débito</TableHead>
              <TableHead className="text-center">Status</TableHead>

              {/* Editable Columns */}
              <TableHead className="min-w-[150px]">Forma Cobrança</TableHead>
              <TableHead className="min-w-[150px]">Data Combinada</TableHead>
              <TableHead className="min-w-[80px] text-center">Ações</TableHead>

              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
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
                  <TableCell className="text-right font-mono text-xs text-red-600 font-bold">
                    {formatCurrency(row.debito)}
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
                    <div className="flex items-center gap-1">
                      <Select
                        value={row.formaCobranca || ''}
                        onValueChange={(val) =>
                          handleUpdateField(
                            row,
                            'forma_cobranca',
                            val === '' || val === 'VAZIO' ? null : val,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VAZIO">VAZIO</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="MOTOQUEIRO">MOTOQUEIRO</SelectItem>
                          <SelectItem value="BOLETO">BOLETO</SelectItem>
                          <SelectItem value="DEPOSITO">DEPOSITO</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() =>
                          handleUpdateField(row, 'forma_cobranca', null)
                        }
                        title="Limpar Forma de Cobrança"
                      >
                        <Eraser className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Editable: Data Combinada */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        className="h-7 text-xs w-full px-1"
                        value={row.dataCombinada || ''}
                        onChange={(e) =>
                          handleUpdateField(
                            row,
                            'data_combinada',
                            e.target.value || null,
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        onClick={() =>
                          handleUpdateField(row, 'data_combinada', null)
                        }
                        title="Limpar Data Combinada"
                      >
                        <Eraser className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  {/* Collection Actions Column */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          row.collectionActionCount > 0
                            ? 'text-blue-600'
                            : 'text-muted-foreground',
                        )}
                      >
                        {row.collectionActionCount}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() =>
                          handleOpenActions(
                            row.orderId,
                            row.clientId,
                            row.clientName,
                          )
                        }
                        title="Ver Ações de Cobrança"
                      >
                        <MessageSquareText className="h-4 w-4" />
                      </Button>
                    </div>
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

      {selectedOrderForActions && (
        <CollectionActionsSheet
          isOpen={!!selectedOrderForActions}
          onClose={() => setSelectedOrderForActions(null)}
          orderId={selectedOrderForActions.orderId}
          clientId={selectedOrderForActions.clientId}
          clientName={selectedOrderForActions.clientName}
          onActionAdded={() => onRefresh && onRefresh()}
        />
      )}
    </>
  )
}
