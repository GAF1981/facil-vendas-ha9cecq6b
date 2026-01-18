import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { History, PlusCircle, Bike, RefreshCw, AlertCircle } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cobrancaService } from '@/services/cobrancaService'
import { ClientDebt } from '@/types/cobranca'
import { useToast } from '@/hooks/use-toast'
import { CollectionActionsSheet } from '@/components/cobranca/CollectionActionsSheet'
import { cn } from '@/lib/utils'

export function RotaMotoqueiroCard() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const { toast } = useToast()

  const [selectedOrderForActions, setSelectedOrderForActions] = useState<{
    orderId: string
    clientId: number
    clientName: string
    showForm: boolean
  } | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const allDebts = await cobrancaService.getDebts()

      const motoqueiroItems: any[] = []

      allDebts.forEach((client: ClientDebt) => {
        client.orders.forEach((order) => {
          order.installments.forEach((inst) => {
            // Check for MOTOQUEIRO case-insensitive
            const fc = inst.formaCobranca?.toUpperCase()
            if (fc === 'MOTOQUEIRO') {
              motoqueiroItems.push({
                clientId: client.clientId,
                clientName: client.clientName,
                orderId: order.orderId,
                vencimento: inst.vencimento,
                valorParc: inst.valorRegistrado,
                pago: inst.valorPago,
                debito: Math.max(0, inst.valorRegistrado - inst.valorPago),
                dataCombinada: inst.dataCombinada,
                status: inst.status,
              })
            }
          })
        })
      })

      // Sort by date (oldest first for priority) or dataCombinada
      motoqueiroItems.sort((a, b) => {
        const dateA = a.dataCombinada || a.vencimento || ''
        const dateB = b.dataCombinada || b.vencimento || ''
        if (dateA && dateB) return dateA.localeCompare(dateB)
        return 0
      })

      setItems(motoqueiroItems)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a rota do motoqueiro.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Card className="col-span-full border-l-4 border-l-blue-600 shadow-md">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bike className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <CardTitle className="text-xl">Rota Motoqueiro</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão centralizada de cobranças via motoqueiro
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar Lista
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[80px]">Código</TableHead>
                <TableHead className="min-w-[200px]">Nome Cliente</TableHead>
                <TableHead className="w-[80px]">Pedido</TableHead>
                <TableHead className="w-[100px]">Vencimento</TableHead>
                <TableHead className="text-right w-[100px]">
                  Valor Parc.
                </TableHead>
                <TableHead className="text-right w-[100px]">Pago</TableHead>
                <TableHead className="text-right w-[100px] font-bold text-red-600">
                  Débito
                </TableHead>
                <TableHead className="w-[120px]">Data Comb.</TableHead>
                <TableHead className="text-center w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                      <span>Carregando dados da rota...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-6 w-6 opacity-50" />
                      <span>Nenhum item encontrado na rota do motoqueiro.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50 group">
                    <TableCell className="font-mono text-xs font-medium">
                      {item.clientId}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {item.clientName}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.orderId}
                    </TableCell>
                    <TableCell className="text-xs">
                      {safeFormatDate(item.vencimento, 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {formatCurrency(item.valorParc)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-green-600">
                      {formatCurrency(item.pago)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-bold text-red-600">
                      {formatCurrency(item.debito)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.dataCombinada ? (
                        <Badge
                          variant="outline"
                          className="font-normal bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {safeFormatDate(item.dataCombinada, 'dd/MM')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() =>
                            setSelectedOrderForActions({
                              orderId: item.orderId.toString(),
                              clientId: item.clientId,
                              clientName: item.clientName,
                              showForm: true,
                            })
                          }
                          title="Registrar Ação"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                          onClick={() =>
                            setSelectedOrderForActions({
                              orderId: item.orderId.toString(),
                              clientId: item.clientId,
                              clientName: item.clientName,
                              showForm: false,
                            })
                          }
                          title="Consultar Histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {selectedOrderForActions && (
        <CollectionActionsSheet
          isOpen={!!selectedOrderForActions}
          onClose={() => setSelectedOrderForActions(null)}
          orderId={selectedOrderForActions.orderId}
          clientId={selectedOrderForActions.clientId}
          clientName={selectedOrderForActions.clientName}
          onActionAdded={() => {
            fetchData() // Refresh logic if needed
          }}
          defaultShowForm={selectedOrderForActions.showForm}
        />
      )}
    </Card>
  )
}
