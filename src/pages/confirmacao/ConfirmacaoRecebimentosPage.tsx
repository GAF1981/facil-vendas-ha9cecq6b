import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, RefreshCw, ArrowLeft } from 'lucide-react'
import { pixService } from '@/services/pixService'
import { PixAcertoRow } from '@/types/pix'
import { formatCurrency } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

export default function ConfirmacaoRecebimentosPage() {
  const [data, setData] = useState<PixAcertoRow[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { employee } = useUserStore()
  const navigate = useNavigate()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixAcertos()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de Pix Acerto.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleAcerto = async (row: PixAcertoRow, checked: boolean) => {
    if (!employee) {
      toast({
        title: 'Acesso Negado',
        description: 'Você precisa estar logado para confirmar.',
        variant: 'destructive',
      })
      return
    }
    try {
      // Optimistic update
      setData((prev) =>
        prev.map((r) =>
          r.orderId === row.orderId
            ? {
                ...r,
                acertoPixConfirmed: checked,
                acertoPixConfirmedBy: checked
                  ? employee.nome_completo || 'User'
                  : null,
              }
            : r,
        ),
      )
      await pixService.toggleAcertoConfirmation(
        row.orderId,
        checked,
        employee.nome_completo || 'User',
      )
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      loadData() // Revert on error
    }
  }

  const handleToggleRecebimento = async (
    row: PixAcertoRow,
    checked: boolean,
  ) => {
    if (!employee) {
      toast({
        title: 'Acesso Negado',
        description: 'Você precisa estar logado para confirmar.',
        variant: 'destructive',
      })
      return
    }
    try {
      // Optimistic update
      setData((prev) =>
        prev.map((r) =>
          r.orderId === row.orderId
            ? {
                ...r,
                recebimentoPixConfirmed: checked,
                recebimentoPixConfirmedBy: checked
                  ? employee.nome_completo || 'User'
                  : null,
              }
            : r,
        ),
      )
      await pixService.toggleRecebimentoConfirmation(
        row.recebimentoIds,
        checked,
        employee.nome_completo || 'User',
      )
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      loadData()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/pix')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Recebimento Pix (Acertos)
          </h1>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confirmação de Pix em Acertos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Pedido</TableHead>
                    <TableHead className="w-[80px]">Cód.</TableHead>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor Pix (Acerto)</TableHead>
                    <TableHead className="text-center w-[100px]">
                      Conf. Acerto
                    </TableHead>
                    <TableHead>Valor Pix (Rec.)</TableHead>
                    <TableHead className="text-center w-[100px]">
                      Conf. Rec.
                    </TableHead>
                    <TableHead>Status Geral</TableHead>
                    <TableHead>Confirmado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nenhum pagamento Pix em acertos encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow
                        key={row.orderId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono font-medium">
                          #{row.orderId}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {row.clientName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.salesEmployee}
                        </TableCell>

                        {/* Acerto Column */}
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span
                              className="truncate max-w-[150px] font-medium"
                              title={row.acertoForma}
                            >
                              {row.acertoForma}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={row.acertoPixConfirmed}
                            onCheckedChange={(c) =>
                              handleToggleAcerto(row, c as boolean)
                            }
                          />
                        </TableCell>

                        {/* Recebimento Column */}
                        <TableCell className="text-xs font-mono font-medium text-green-600">
                          {row.recebimentoValue > 0
                            ? `R$ ${formatCurrency(row.recebimentoValue)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={row.recebimentoPixConfirmed}
                            onCheckedChange={(c) =>
                              handleToggleRecebimento(row, c as boolean)
                            }
                            disabled={row.recebimentoValue === 0}
                          />
                        </TableCell>

                        {/* Status Column */}
                        <TableCell>
                          <span
                            className={cn(
                              'text-xs font-bold uppercase',
                              row.acertoPixConfirmed ||
                                row.recebimentoPixConfirmed
                                ? 'text-green-600'
                                : 'text-red-500',
                            )}
                          >
                            {row.acertoPixConfirmed ||
                            row.recebimentoPixConfirmed
                              ? 'CONFIRMADO'
                              : 'A CONFIRMAR'}
                          </span>
                        </TableCell>

                        {/* Employee Column */}
                        <TableCell className="text-xs text-muted-foreground">
                          {row.acertoPixConfirmedBy ||
                            row.recebimentoPixConfirmedBy ||
                            '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
