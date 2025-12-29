import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientDebt } from '@/types/cobranca'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface DebtDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  client: ClientDebt | null
}

export function DebtDetailsDialog({
  isOpen,
  onClose,
  client,
}: DebtDetailsDialogProps) {
  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Detalhamento de Débitos: {client.clientName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Total Devido:{' '}
            <span className="font-bold text-red-600">
              R$ {formatCurrency(client.totalDebt)}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {client.orders.map((order) => (
              <AccordionItem
                key={order.orderId}
                value={order.orderId.toString()}
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-col sm:flex-row w-full justify-between sm:items-center pr-4 gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Pedido #{order.orderId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (
                        {format(parseISO(order.date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                        )
                      </span>
                      <Badge
                        variant={
                          order.status === 'VENCIDO' ? 'destructive' : 'outline'
                        }
                        className="ml-2"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-muted-foreground">
                        Total:{' '}
                        <span className="text-foreground font-medium">
                          {formatCurrency(order.netValue)}
                        </span>
                      </div>
                      <div className="text-green-600">
                        Pago:{' '}
                        <span className="font-medium">
                          {formatCurrency(order.paidValue)}
                        </span>
                      </div>
                      <div className="text-red-600 font-bold">
                        Resta: {formatCurrency(order.remainingValue)}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-2 bg-muted/20 rounded-md">
                    {/* Pagamentos Realizados */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        Pagamentos Realizados
                      </h4>
                      {order.paymentsMade.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhum pagamento registrado.
                        </p>
                      ) : (
                        <div className="border rounded-md bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow className="h-8">
                                <TableHead className="h-8 py-0">Data</TableHead>
                                <TableHead className="h-8 py-0 text-right">
                                  Valor
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.paymentsMade.map((pm, idx) => (
                                <TableRow key={idx} className="h-8">
                                  <TableCell className="h-8 py-0 text-xs">
                                    {pm.date
                                      ? format(parseISO(pm.date), 'dd/MM/yyyy')
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="h-8 py-0 text-xs text-right text-green-600 font-medium">
                                    R$ {formatCurrency(pm.value)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Previsão de Pagamentos */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 mt-4">
                        Cronograma de Vencimentos (Acordado)
                      </h4>
                      {order.paymentDetails.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Sem detalhes de agendamento.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {order.paymentDetails.map((pd, idx) => (
                            <div
                              key={idx}
                              className="text-xs border rounded p-2 bg-background"
                            >
                              <div className="flex justify-between font-medium mb-1">
                                <span>{pd.method}</span>
                                <span>
                                  Total: R$ {formatCurrency(pd.value)}
                                </span>
                              </div>
                              {pd.installments > 1 && pd.details ? (
                                <div className="pl-2 border-l-2 space-y-1 mt-1">
                                  {pd.details.map((inst, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between text-muted-foreground"
                                    >
                                      <span>
                                        {inst.number}ª Parc (
                                        {inst.dueDate
                                          ? format(
                                              parseISO(inst.dueDate),
                                              'dd/MM/yyyy',
                                            )
                                          : '-'}
                                        )
                                      </span>
                                      <span>
                                        R$ {formatCurrency(inst.value)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex justify-between text-muted-foreground pl-2 border-l-2 mt-1">
                                  <span>
                                    Vencimento:{' '}
                                    {pd.dueDate
                                      ? format(
                                          parseISO(pd.dueDate),
                                          'dd/MM/yyyy',
                                        )
                                      : '-'}
                                  </span>
                                  <span>Única</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
