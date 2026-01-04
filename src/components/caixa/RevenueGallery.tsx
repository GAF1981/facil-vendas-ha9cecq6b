import { ReceiptDetail } from '@/services/caixaService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import {
  ArrowDownCircle,
  QrCode,
  Banknote,
  Landmark,
  Layers,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMemo } from 'react'

interface RevenueGalleryProps {
  items: ReceiptDetail[]
}

export function RevenueGallery({ items }: RevenueGalleryProps) {
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

  const total = items.reduce((acc, item) => acc + item.valor, 0)
  const totalPix = pixItems.reduce((acc, item) => acc + item.valor, 0)
  const totalCash = cashItems.reduce((acc, item) => acc + item.valor, 0)
  const totalCheck = checkItems.reduce((acc, item) => acc + item.valor, 0)

  const renderList = (
    listItems: ReceiptDetail[],
    emptyMsg: string,
    listTotal: number,
  ) => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 h-[500px]">
        <div className="divide-y">
          {listItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {emptyMsg}
            </div>
          ) : (
            listItems.map((item) => (
              <div
                key={item.id}
                className="p-3 hover:bg-muted/50 transition-colors flex justify-between items-center text-sm"
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <span
                    className="font-medium truncate"
                    title={item.clienteNome}
                  >
                    {item.clienteNome}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{safeFormatDate(item.data, 'dd/MM/yy HH:mm')}</span>
                    <span>•</span>
                    <span
                      className="truncate max-w-[100px]"
                      title={item.funcionarioNome}
                    >
                      {item.funcionarioNome || 'N/D'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-semibold text-green-700 whitespace-nowrap">
                    R$ {formatCurrency(item.valor)}
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {item.forma}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos" className="text-xs">
                <Layers className="w-3 h-3 mr-1" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="pix" className="text-xs">
                <QrCode className="w-3 h-3 mr-1" />
                Pix
              </TabsTrigger>
              <TabsTrigger value="dinheiro" className="text-xs">
                <Banknote className="w-3 h-3 mr-1" />
                Din
              </TabsTrigger>
              <TabsTrigger value="cheque" className="text-xs">
                <Landmark className="w-3 h-3 mr-1" />
                Cheq
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="todos" className="flex-1 m-0 p-0">
            {renderList(items, 'Nenhuma entrada registrada.', total)}
          </TabsContent>
          <TabsContent value="pix" className="flex-1 m-0 p-0">
            {renderList(pixItems, 'Nenhum PIX registrado.', totalPix)}
          </TabsContent>
          <TabsContent value="dinheiro" className="flex-1 m-0 p-0">
            {renderList(cashItems, 'Nenhum pagamento em Dinheiro.', totalCash)}
          </TabsContent>
          <TabsContent value="cheque" className="flex-1 m-0 p-0">
            {renderList(checkItems, 'Nenhum Cheque registrado.', totalCheck)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
