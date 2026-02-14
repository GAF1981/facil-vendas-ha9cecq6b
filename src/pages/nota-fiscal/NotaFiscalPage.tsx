import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Edit2,
} from 'lucide-react'
import { notaFiscalService } from '@/services/notaFiscalService'
import { rotaService } from '@/services/rotaService'
import { cobrancaService } from '@/services/cobrancaService'
import { NotaFiscalSettlement } from '@/types/nota-fiscal'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/stores/useUserStore'
import { Rota } from '@/types/rota'

export default function NotaFiscalPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<NotaFiscalSettlement[]>([])
  const [filteredData, setFilteredData] = useState<NotaFiscalSettlement[]>([])
  const [routes, setRoutes] = useState<Rota[]>([])
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos') // Default to 'todos'
  const [routeFilter, setRouteFilter] = useState<string>('todos')

  // Emit Dialog
  const [emitDialogOpen, setEmitDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<NotaFiscalSettlement | null>(
    null,
  )
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const { employee } = useUserStore()

  const loadRoutes = async () => {
    try {
      const allRoutes = await rotaService.getAllRotas()
      setRoutes(allRoutes)
    } catch (e) {
      console.error('Failed to load routes', e)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const rotaId = routeFilter !== 'todos' ? Number(routeFilter) : null
      const settlements = await notaFiscalService.getSettlements(rotaId)
      setData(settlements)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de notas fiscais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoutes()
    loadData()
  }, []) // Initial load

  useEffect(() => {
    // Reload data when route filter changes (server-side filtering)
    loadData()
  }, [routeFilter])

  useEffect(() => {
    let result = data

    // 1. Search
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.clientName.toLowerCase().includes(lower) ||
          item.clientCode.toString().includes(lower) ||
          item.orderId.toString().includes(lower),
      )
    }

    // 2. Status Filter
    if (statusFilter !== 'todos') {
      result = result.filter((item) => item.notaFiscalEmitida === statusFilter)
    }

    setFilteredData(result)
  }, [data, search, statusFilter])

  const handleEmitClick = (item: NotaFiscalSettlement) => {
    setSelectedItem(item)
    setInvoiceNumber('')
    setEmitDialogOpen(true)
  }

  const handleConfirmEmit = async () => {
    if (!selectedItem || !invoiceNumber) return
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Funcionário não identificado.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await notaFiscalService.emitInvoice({
        pedidoId: selectedItem.orderId,
        clienteId: selectedItem.clientCode,
        numeroNotaFiscal: invoiceNumber,
        funcionarioId: employee.id,
      })

      toast({ title: 'Sucesso', description: 'Nota fiscal registrada.' })
      setEmitDialogOpen(false)
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar nota.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSolicitacao = async (
    item: NotaFiscalSettlement,
    newValue: string,
  ) => {
    try {
      // Optimistic update
      const updatedData = data.map((d) =>
        d.orderId === item.orderId ? { ...d, solicitacaoNf: newValue } : d,
      )
      setData(updatedData)

      await notaFiscalService.updateSolicitacao(
        item.orderId,
        newValue as 'SIM' | 'NÃO',
      )
      toast({
        title: 'Atualizado',
        description: 'Solicitação de emissão atualizada.',
      })

      // Reload to ensure calculated status is correct based on DB/Service logic
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar solicitação.',
        variant: 'destructive',
      })
      loadData() // Revert
    }
  }

  const handleGeneratePdf = async (
    orderId: number,
    type: 'standard' | 'settlement',
  ) => {
    setGeneratingPdf(true)
    try {
      const blob = await cobrancaService.generateOrderReceipt(orderId, type)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao gerar PDF.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Controle de Nota Fiscal
          </h1>
          <p className="text-muted-foreground">
            Gerenciamento de emissão de notas para acertos.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Refine a lista de pendências fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, código ou pedido..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Emitida">Emitida</SelectItem>
                  <SelectItem value="Resolvida">Resolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-[300px]">
              <Select value={routeFilter} onValueChange={setRouteFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por Rota (Sistema)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Rotas</SelectItem>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      Rota #{r.id} - {safeFormatDate(r.data_inicio, 'dd/MM/yy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data Acerto</TableHead>
                <TableHead className="text-right">Valor Venda</TableHead>
                <TableHead className="text-center">NF Cadastro</TableHead>
                <TableHead className="text-center">NF Venda</TableHead>
                <TableHead className="text-center w-[120px]">
                  Solicitação
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">PDF</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.orderId} className="hover:bg-muted/30">
                    <TableCell className="font-mono">{item.orderId}</TableCell>
                    <TableCell>
                      {item.rotaId ? (
                        <Badge variant="outline" className="font-normal">
                          Rota #{item.rotaId}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.clientName}</span>
                        <span className="text-xs text-muted-foreground">
                          Cód: {item.clientCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(item.dataAcerto, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {formatCurrency(item.valorTotalVendido)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.notaFiscalCadastro === 'SIM'
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {item.notaFiscalCadastro}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          item.notaFiscalVenda === 'SIM'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {item.notaFiscalVenda}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Select
                        value={item.solicitacaoNf}
                        onValueChange={(val) =>
                          handleUpdateSolicitacao(item, val)
                        }
                      >
                        <SelectTrigger className="h-8 w-[90px] mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SIM">SIM</SelectItem>
                          <SelectItem value="NÃO">NÃO</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.notaFiscalEmitida === 'Pendente'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : item.notaFiscalEmitida === 'Emitida'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-600'
                        }
                      >
                        {item.notaFiscalEmitida}
                      </Badge>
                      {item.numeroNotaFiscal && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Nº {item.numeroNotaFiscal}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleGeneratePdf(item.orderId, 'standard')
                          }
                          title="Imprimir PDF Padrão"
                        >
                          <Printer className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            handleGeneratePdf(item.orderId, 'settlement')
                          }
                          title="Imprimir PDF Acerto (Histórico)"
                        >
                          <Printer className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.notaFiscalEmitida === 'Pendente' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEmitClick(item)}
                          >
                            Emitir
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={emitDialogOpen} onOpenChange={setEmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Emissão de Nota Fiscal</DialogTitle>
            <DialogDescription>
              Informe o número da nota fiscal gerada para o pedido #
              {selectedItem?.orderId}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Número da Nota</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: 12345"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmEmit}
              disabled={!invoiceNumber || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
