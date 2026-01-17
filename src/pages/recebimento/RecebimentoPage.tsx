import { useEffect, useState, useMemo } from 'react'
import { recebimentoService } from '@/services/recebimentoService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Loader2, CheckSquare, Search, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RecebimentoInstallment } from '@/types/recebimento'
import { RecebimentoPaymentDialog } from '@/components/recebimento/RecebimentoPaymentDialog'
import { useAuth } from '@/hooks/use-auth'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [installments, setInstallments] = useState<RecebimentoInstallment[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'PENDENTE' | 'PAGO' | 'TODOS'
  >('PENDENTE')

  // Selection
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<
    number | null
  >(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch using service with filters
      const data = await recebimentoService.getInstallments({
        search: searchTerm,
        status: statusFilter,
        orderId: orderFilter,
      })
      setInstallments(data)

      // Reset selection if item no longer in list
      if (
        selectedInstallmentId &&
        !data.find((i) => i.id === selectedInstallmentId)
      ) {
        setSelectedInstallmentId(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as parcelas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Debounce loadData for search
    const timer = setTimeout(() => {
      loadData()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, orderFilter])

  const handleSelectInstallment = (id: number) => {
    if (selectedInstallmentId === id) {
      setSelectedInstallmentId(null)
    } else {
      setSelectedInstallmentId(id)
    }
  }

  const selectedInstallment = useMemo(() => {
    return installments.find((i) => i.id === selectedInstallmentId) || null
  }, [installments, selectedInstallmentId])

  const handleProcessPayment = async (
    id: number,
    amount: number,
    date: string,
    method: string,
    pixDetails?: { nome: string; banco: string },
  ) => {
    if (!selectedInstallment || !user) return

    try {
      await recebimentoService.processInstallmentPayment(
        id,
        amount,
        date,
        method,
        selectedInstallment.venda_id,
        pixDetails,
        user.email || 'Usuário',
      )

      toast({
        title: 'Sucesso',
        description: 'Pagamento processado e débito atualizado com sucesso.',
        className: 'bg-green-600 text-white',
      })

      // Refresh data to reflect changes immediately
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao processar pagamento. Verifique a conexão.',
        variant: 'destructive',
      })
      // Re-throw to let modal know it failed if necessary, but logic here handles it
      throw error
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie parcelas e pagamentos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RotateCcw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!selectedInstallmentId}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            Processar Pagamento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="search">Buscar (Nome ou Código)</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do cliente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="orderFilter">Pedido</Label>
              <Input
                id="orderFilter"
                placeholder="Nº Pedido"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v: any) => setStatusFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendentes</SelectItem>
                  <SelectItem value="PAGO">Pagos</SelectItem>
                  <SelectItem value="TODOS">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Método Orig.</TableHead>
                  <TableHead className="text-right">Valor Parcela</TableHead>
                  <TableHead className="text-right text-green-600">
                    Valor Pago
                  </TableHead>
                  <TableHead className="text-right text-red-600 font-bold">
                    Débito
                  </TableHead>
                  <TableHead className="w-[50px] text-center">Sel.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : installments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhuma parcela encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  installments.map((inst) => {
                    const isSelected = selectedInstallmentId === inst.id
                    const saldo = Math.max(
                      0,
                      (inst.valor_registrado || 0) - inst.valor_pago,
                    )
                    const isPaid =
                      saldo === 0 && (inst.valor_registrado || 0) > 0

                    return (
                      <TableRow
                        key={inst.id}
                        className={isSelected ? 'bg-muted/50' : ''}
                      >
                        <TableCell>
                          {safeFormatDate(inst.vencimento, 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {inst.cliente_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              #{inst.cliente_codigo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          #{inst.venda_id}
                        </TableCell>
                        <TableCell>{inst.forma_pagamento}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(inst.valor_registrado || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrency(inst.valor_pago)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-red-600">
                          {formatCurrency(saldo)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() =>
                              handleSelectInstallment(inst.id)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {isPaid ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">
                              Pago
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-200 bg-amber-50"
                            >
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecebimentoPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        installment={selectedInstallment}
        onConfirm={handleProcessPayment}
      />
    </div>
  )
}
