import { useEffect, useState, useMemo } from 'react'
import {
  confirmationService,
  ConfirmationRow,
} from '@/services/confirmationService'
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
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { Loader2, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default function RecebimentoPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConfirmationRow[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await confirmationService.getConfirmationData()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os recebimentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const lower = searchTerm.toLowerCase()
    return data.filter(
      (row) =>
        row.clientCode.toString().includes(lower) ||
        row.orderId.toString().includes(lower) ||
        (row.employee && row.employee.toLowerCase().includes(lower)),
    )
  }, [data, searchTerm])

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredData.map((d) => d.orderId)
      setSelectedIds(new Set(allIds))
    } else {
      setSelectedIds(new Set())
    }
  }

  const selectedRows = data.filter((row) => selectedIds.has(row.orderId))
  const totalSaldoPagar = selectedRows.reduce(
    (acc, row) => acc + row.amountToPay,
    0,
  )
  const totalSelecionado = selectedRows.reduce(
    (acc, row) => acc + row.registeredAmount,
    0,
  )

  // Validation Logic: Difference must be less than 0.10
  const difference = Math.abs(totalSaldoPagar - totalSelecionado)
  const isValid = difference < 0.1
  const canSubmit = selectedIds.size > 0 && isValid

  const handleConfirm = async () => {
    if (!canSubmit) return

    setProcessing(true)
    try {
      for (const row of selectedRows) {
        await confirmationService.confirmPayment(row.orderId, { pix: true })
      }

      toast({
        title: 'Sucesso',
        description: `${selectedRows.length} recebimentos confirmados.`,
        className: 'bg-green-600 text-white',
      })
      setSelectedIds(new Set())
      await loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao confirmar recebimentos.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Confirmar Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Valide e confirme pagamentos pendentes.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <Loader2 className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Pagamentos Pendentes</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pedido, cliente..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={
                          selectedIds.size > 0 &&
                          selectedIds.size === filteredData.length
                        }
                        onCheckedChange={(checked) => toggleAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead className="text-right">Saldo a Pagar</TableHead>
                    <TableHead className="text-right">A Confirmar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum recebimento pendente encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row) => {
                      const isSelected = selectedIds.has(row.orderId)
                      return (
                        <TableRow
                          key={row.orderId}
                          className={isSelected ? 'bg-muted/50' : ''}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() =>
                                toggleSelection(row.orderId)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-mono">
                            {row.orderId}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                Cod: {row.clientCode}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(parseISO(row.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.employee}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.amountToPay)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(row.registeredAmount)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-4 space-y-4">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Resumo da Seleção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Itens Selecionados
                  </span>
                  <span className="font-medium">{selectedIds.size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Saldo a Pagar (Total)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(totalSaldoPagar)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Selecionado</span>
                  <span className="text-green-600">
                    {formatCurrency(totalSelecionado)}
                  </span>
                </div>
                {selectedIds.size > 0 && (
                  <div
                    className={cn(
                      'text-xs text-right',
                      isValid ? 'text-green-600' : 'text-red-500',
                    )}
                  >
                    Diferença: {formatCurrency(difference)}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={!canSubmit || processing}
              >
                {processing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Recebimento
              </Button>

              {!isValid && selectedIds.size > 0 && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                  esse botão não poderá ser acionado se o valor o &apos;Saldo a
                  Pagar&apos; for igual ao &apos;Total Selecionado&apos;
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
