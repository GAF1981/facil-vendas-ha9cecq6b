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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  FileText,
  User,
  X,
  Download,
  FileCheck,
  FileSignature,
  Printer,
} from 'lucide-react'
import { notaFiscalService } from '@/services/notaFiscalService'
import { acertoService } from '@/services/acertoService'
import {
  NotaFiscalSettlement,
  NotaFiscalStatusFilter,
  NOTA_FISCAL_STATUSES,
} from '@/types/nota-fiscal'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUserStore } from '@/stores/useUserStore'

export default function NotaFiscalPage() {
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null)
  const [settlements, setSettlements] = useState<NotaFiscalSettlement[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] =
    useState<NotaFiscalStatusFilter>('all')
  const [orderFilter, setOrderFilter] = useState('')
  const { toast } = useToast()
  const { employee } = useUserStore()

  // Dialog States
  const [requestDialog, setRequestDialog] = useState<{
    open: boolean
    item: NotaFiscalSettlement | null
  }>({ open: false, item: null })
  const [emitDialog, setEmitDialog] = useState<{
    open: boolean
    item: NotaFiscalSettlement | null
    invoiceNumber: string
  }>({ open: false, item: null, invoiceNumber: '' })
  const [emitting, setEmitting] = useState(false)

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

  // Actions
  const handleDownloadPdf = async (orderId: number) => {
    try {
      const blob = await acertoService.reprintOrder(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Acerto-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro no download',
        description: 'Não foi possível gerar o PDF.',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadDetailedReport = async (orderId: number) => {
    try {
      toast({
        title: 'Gerando relatório...',
        description: 'Aguarde um momento.',
      })
      const blob = await notaFiscalService.generateDetailedReport(orderId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Relatorio-Detalhado-Pedido-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast({ title: 'Relatório gerado com sucesso' })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o PDF detalhado.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleRequest = async () => {
    if (!requestDialog.item) return
    try {
      const newVal = await notaFiscalService.toggleRequest(
        requestDialog.item.orderId,
        requestDialog.item.solicitacaoNf,
      )

      // Refresh data to apply logic
      if (selectedClient) {
        await fetchClientSettlements(selectedClient)
      } else {
        await fetchAllSettlements()
      }

      toast({ title: 'Solicitação atualizada' })
      setRequestDialog({ open: false, item: null })
    } catch (error) {
      toast({ title: 'Erro ao atualizar solicitação', variant: 'destructive' })
    }
  }

  const handleEmitInvoice = async () => {
    if (!emitDialog.item || !emitDialog.invoiceNumber.trim()) return
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado.',
        variant: 'destructive',
      })
      return
    }

    setEmitting(true)
    try {
      await notaFiscalService.emitInvoice({
        pedidoId: emitDialog.item.orderId,
        clienteId: emitDialog.item.clientCode,
        numeroNotaFiscal: emitDialog.invoiceNumber,
        funcionarioId: employee.id,
      })

      setSettlements((prev) =>
        prev.map((s) =>
          s.orderId === emitDialog.item!.orderId
            ? {
                ...s,
                notaFiscalEmitida: 'Emitida',
                numeroNotaFiscal: emitDialog.invoiceNumber,
              }
            : s,
        ),
      )

      toast({
        title: 'Nota Fiscal emitida com sucesso',
        className: 'bg-green-600 text-white',
      })
      setEmitDialog({ open: false, item: null, invoiceNumber: '' })
    } catch (error) {
      toast({ title: 'Erro ao emitir nota', variant: 'destructive' })
    } finally {
      setEmitting(false)
    }
  }

  const filteredSettlements = useMemo(() => {
    return settlements.filter((item) => {
      if (statusFilter !== 'all' && item.notaFiscalEmitida !== statusFilter) {
        return false
      }
      if (orderFilter && !item.orderId.toString().includes(orderFilter)) {
        return false
      }
      return true
    })
  }, [settlements, statusFilter, orderFilter])

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
            Gerencie solicitações, emissões e status de notas fiscais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

        {/* Order Filter */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Buscar Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Número do Pedido"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

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
                  <TableHead className="w-[80px]">Pedido</TableHead>
                  <TableHead className="w-[120px] text-center">PDF</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">NF Cadastro</TableHead>
                  <TableHead className="text-center">NF Venda</TableHead>
                  <TableHead className="text-center">Solicitação</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettlements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSettlements.map((item) => (
                    <TableRow key={item.orderId} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-medium">
                        #{item.orderId}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDownloadPdf(item.orderId)}
                            title="Baixar PDF (Térmica)"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() =>
                              handleDownloadDetailedReport(item.orderId)
                            }
                            title="Baixar Relatório Detalhado (A4)"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
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
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {item.notaFiscalCadastro}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {item.notaFiscalVenda}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            item.solicitacaoNf === 'SIM'
                              ? 'text-blue-600 font-bold bg-blue-50'
                              : 'text-muted-foreground'
                          }
                          onClick={() => setRequestDialog({ open: true, item })}
                        >
                          {item.solicitacaoNf}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.notaFiscalEmitida === 'Emitida'
                              ? 'default'
                              : item.notaFiscalEmitida === 'Pendente'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {item.notaFiscalEmitida}
                        </Badge>
                        {item.numeroNotaFiscal && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Nº: {item.numeroNotaFiscal}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.notaFiscalEmitida !== 'Emitida' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() =>
                              setEmitDialog({
                                open: true,
                                item,
                                invoiceNumber: '',
                              })
                            }
                          >
                            <FileSignature className="w-3.5 h-3.5 mr-1.5" />
                            Emitir
                          </Button>
                        )}
                        {item.notaFiscalEmitida === 'Emitida' && (
                          <FileCheck className="w-5 h-5 mx-auto text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog
        open={requestDialog.open}
        onOpenChange={(open) =>
          !open && setRequestDialog({ open: false, item: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Solicitação de NF</DialogTitle>
          </DialogHeader>
          {requestDialog.item && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">NF Cadastro</Label>
                  <div className="font-medium mt-1">
                    {requestDialog.item.notaFiscalCadastro}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">NF Venda</Label>
                  <div className="font-medium mt-1">
                    {requestDialog.item.notaFiscalVenda}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base">Solicitação de NF</Label>
                  <p className="text-xs text-muted-foreground">
                    Marque se o cliente solicitou NF para este pedido.
                  </p>
                </div>
                <Switch
                  checked={requestDialog.item.solicitacaoNf === 'SIM'}
                  onCheckedChange={handleToggleRequest}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRequestDialog({ open: false, item: null })}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emit Invoice Dialog */}
      <Dialog
        open={emitDialog.open}
        onOpenChange={(open) =>
          !open && setEmitDialog({ open: false, item: null, invoiceNumber: '' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Nota Fiscal</DialogTitle>
          </DialogHeader>
          {emitDialog.item && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/30 rounded border text-sm space-y-1">
                <div>
                  <strong>Cliente:</strong> {emitDialog.item.clientName}
                </div>
                <div>
                  <strong>Pedido:</strong> #{emitDialog.item.orderId}
                </div>
                <div>
                  <strong>Valor:</strong> R${' '}
                  {formatCurrency(emitDialog.item.valorTotalVendido)}
                </div>
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline">
                    Cad: {emitDialog.item.notaFiscalCadastro}
                  </Badge>
                  <Badge variant="outline">
                    Venda: {emitDialog.item.notaFiscalVenda}
                  </Badge>
                  <Badge variant="outline">
                    Solic: {emitDialog.item.solicitacaoNf}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nf-number">Número da Nota Fiscal</Label>
                <Input
                  id="nf-number"
                  placeholder="Ex: 123456"
                  value={emitDialog.invoiceNumber}
                  onChange={(e) =>
                    setEmitDialog({
                      ...emitDialog,
                      invoiceNumber: e.target.value,
                    })
                  }
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setEmitDialog({ open: false, item: null, invoiceNumber: '' })
              }
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEmitInvoice}
              disabled={emitting || !emitDialog.invoiceNumber}
            >
              {emitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Emissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
