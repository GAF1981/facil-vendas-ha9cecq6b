import { ReceiptDetail } from '@/services/caixaService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { formatCurrency } from '@/lib/formatters'
import { formatDateTimeBR } from '@/lib/dateUtils'
import {
  ArrowDownCircle,
  QrCode,
  Banknote,
  Landmark,
  Layers,
  FileText,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface RevenueGalleryProps {
  items: ReceiptDetail[]
}

export function RevenueGallery({ items }: RevenueGalleryProps) {
  const navigate = useNavigate()

  const pixItems = useMemo(
    () => items.filter((i) => i.forma === 'Pix'),
    [items],
  )
  const cashItems = useMemo(
    () => items.filter((i) => i.forma === 'Dinheiro'),
    [items],
  )
  const checkItems = useMemo(
    () => items.filter((i) => i.forma === 'Cheque'),
    [items],
  )
  const boletoItems = useMemo(
    () => items.filter((i) => i.forma === 'Boleto'),
    [items],
  )

  const total = items.reduce((acc, item) => acc + item.valor, 0)
  const totalPix = pixItems.reduce((acc, item) => acc + item.valor, 0)
  const totalCash = cashItems.reduce((acc, item) => acc + item.valor, 0)
  const totalCheck = checkItems.reduce((acc, item) => acc + item.valor, 0)
  const totalBoleto = boletoItems.reduce((acc, item) => acc + item.valor, 0)

  const renderTable = (
    listItems: ReceiptDetail[],
    emptyMsg: string,
    listTotal: number,
  ) => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 h-[500px]">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[140px]">Data/Hora</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    {emptyMsg}
                  </TableCell>
                </TableRow>
              ) : (
                listItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs whitespace-nowrap font-mono text-muted-foreground">
                      {formatDateTimeBR(item.data)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <div className="flex flex-col">
                        <span>{item.clienteNome}</span>
                        {item.orderId && (
                          <span className="text-[10px] text-muted-foreground">
                            Pedido #{item.orderId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.funcionarioNome || 'N/D'}
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                        {item.forma}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-700 whitespace-nowrap px-2">
                      <div className="flex items-center justify-end gap-2">
                        <span>R$ {formatCurrency(item.valor)}</span>
                        {item.orderId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            onClick={() =>
                              navigate(
                                `/resumo-acertos?locateOrder=${item.orderId}&editPayment=true`,
                              )
                            }
                            title="Editar Pagamento do Pedido"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="p-3 bg-muted/20 border-t mt-auto">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-muted-foreground">
            Subtotal
          </span>
          <span className="text-lg font-bold text-green-700">
            R$ {formatCurrency(listTotal)}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4 px-6 border-b bg-green-50/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-green-700">
            <ArrowDownCircle className="h-5 w-5" />
            Galeria de Entradas
          </CardTitle>
          <span className="text-sm font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">
            {items.length} registros
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <Tabs defaultValue="todos" className="w-full h-full flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="todos" className="text-xs px-1">
                <Layers className="w-3 h-3 mr-1" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="pix" className="text-xs px-1">
                <QrCode className="w-3 h-3 mr-1" />
                Pix
              </TabsTrigger>
              <TabsTrigger value="dinheiro" className="text-xs px-1">
                <Banknote className="w-3 h-3 mr-1" />
                Din
              </TabsTrigger>
              <TabsTrigger value="cheque" className="text-xs px-1">
                <Landmark className="w-3 h-3 mr-1" />
                Cheq
              </TabsTrigger>
              <TabsTrigger value="boleto" className="text-xs px-1">
                <FileText className="w-3 h-3 mr-1" />
                Bol
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="todos" className="flex-1 m-0 p-0">
            {renderTable(items, 'Nenhuma entrada registrada.', total)}
          </TabsContent>
          <TabsContent value="pix" className="flex-1 m-0 p-0">
            {renderTable(pixItems, 'Nenhum PIX registrado.', totalPix)}
          </TabsContent>
          <TabsContent value="dinheiro" className="flex-1 m-0 p-0">
            {renderTable(cashItems, 'Nenhum pagamento em Dinheiro.', totalCash)}
          </TabsContent>
          <TabsContent value="cheque" className="flex-1 m-0 p-0">
            {renderTable(checkItems, 'Nenhum Cheque registrado.', totalCheck)}
          </TabsContent>
          <TabsContent value="boleto" className="flex-1 m-0 p-0">
            {renderTable(boletoItems, 'Nenhum Boleto registrado.', totalBoleto)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
