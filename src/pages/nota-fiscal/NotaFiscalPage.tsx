import { useState, useMemo, useEffect } from 'react'
import { ClientSearch } from '@/components/acerto/ClientSearch'
import { ClientRow } from '@/types/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, User, X } from 'lucide-react'
import { notaFiscalService } from '@/services/notaFiscalService'
import {
  NotaFiscalSettlement,
  NotaFiscalStatusFilter,
  NOTA_FISCAL_STATUSES,
} from '@/types/nota-fiscal'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function NotaFiscalPage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [settlements, setSettlements] = useState<NotaFiscalSettlement[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] =
    useState<NotaFiscalStatusFilter>('Pendente')
  const { toast } = useToast()

  const fetchAllSettlements = async () => {
    setLoading(true)
    try {
      const data = await notaFiscalService.getAllSettlements()
      setSettlements(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as notas fiscais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchClientSettlements = async (client: ClientRow) => {
    setLoading(true)
    try {
      const data = await notaFiscalService.getSettlementsByClient(
        client.CODIGO,
        client['NOTA FISCAL'] || '',
      )
      setSettlements(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os pedidos do cliente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Load all on mount
  useEffect(() => {
    fetchAllSettlements()
  }, [])

  const handleClientSelect = (client: ClientRow) => {
    setSelectedClient(client)
    fetchClientSettlements(client)
  }

  const clearClientSelection = () => {
    setSelectedClient(null)
    fetchAllSettlements()
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    // Optimistic update
    const previous = settlements
    setSettlements((prev) =>
      prev.map((s) =>
        s.orderId === orderId ? { ...s, notaFiscalEmitida: newStatus } : s,
      ),
    )

    try {
      await notaFiscalService.updateIssuanceStatus(orderId, newStatus)
      toast({
        title: 'Status atualizado',
        description: `Nota Fiscal alterada para ${newStatus}.`,
        duration: 2000,
      })
    } catch (error) {
      console.error(error)
      // Revert on error
      setSettlements(previous)
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar o status.',
        variant: 'destructive',
      })
    }
  }

  const filteredSettlements = useMemo(() => {
    return settlements.filter((item) => {
      if (statusFilter === 'all') return true
      return item.notaFiscalEmitida === statusFilter
    })
  }, [settlements, statusFilter])

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
    } catch (e) {
      return dateStr || '-'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Controle de Emissão de Nota Fiscal
          </h1>
          <p className="text-muted-foreground">
            Gerencie a emissão de notas fiscais para acertos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Filtrar por Cliente (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <div className="flex-1">
              <ClientSearch onSelect={handleClientSelect} />
            </div>
            {selectedClient && (
              <Button
                variant="outline"
                onClick={clearClientSelection}
                title="Limpar filtro"
              >
                <X className="w-4 h-4 mr-2" />
                Todos
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtro de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as NotaFiscalStatusFilter)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {NOTA_FISCAL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedClient && (
        <Card className="border-l-4 border-l-blue-500 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {selectedClient['NOME CLIENTE']}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Código: {selectedClient.CODIGO}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedClient.MUNICÍPIO} - {selectedClient.BAIRRO}
                </p>
                {selectedClient['NOTA FISCAL'] && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                    <span className="font-bold block mb-1">
                      Obs. Nota Fiscal:
                    </span>
                    {selectedClient['NOTA FISCAL']}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[120px]">Data Acerto</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>NF Cadastro</TableHead>
                  <TableHead className="text-center">NF Venda</TableHead>
                  <TableHead className="text-center w-[180px]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum pedido encontrado para o filtro selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettlements.map((item) => (
                    <TableRow key={item.orderId} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">
                        #{item.orderId}
                      </TableCell>
                      <TableCell
                        className="font-medium max-w-[200px] truncate"
                        title={item.clientName}
                      >
                        {item.clientName}
                      </TableCell>
                      <TableCell>{formatDate(item.dataAcerto)}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {formatCurrency(item.valorTotalVendido)}
                      </TableCell>
                      <TableCell
                        className="text-xs text-muted-foreground max-w-[150px] truncate"
                        title={item.notaFiscalCadastro}
                      >
                        {item.notaFiscalCadastro || '-'}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {item.notaFiscalVenda || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={item.notaFiscalEmitida}
                          onValueChange={(val) =>
                            handleStatusChange(item.orderId, val)
                          }
                        >
                          <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTA_FISCAL_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
