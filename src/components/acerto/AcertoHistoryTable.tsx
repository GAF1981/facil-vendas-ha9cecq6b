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
import { bancoDeDadosService } from '@/services/bancoDeDadosService'
import { formatCurrency } from '@/lib/formatters'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileClock, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryRow {
  id: number
  data: string
  hora: string
  vendedor: string
  valorVendaTotal: number
  saldoAPagar: number
  valorPago: number
  debito: number
  mediaMensal: number | null
}

interface AcertoHistoryTableProps {
  clientId: number
  monthlyAverage?: number
  hideHeader?: boolean
  className?: string
  data?: HistoryRow[] // Allow passing data externally
}

export function AcertoHistoryTable({
  clientId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  monthlyAverage,
  hideHeader = false,
  className,
  data: externalData,
}: AcertoHistoryTableProps) {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // If external data is provided, use it and skip fetch
    if (externalData) {
      setHistory(externalData)
      return
    }

    let mounted = true
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const data = await bancoDeDadosService.getAcertoHistory(clientId)
        if (mounted) {
          setHistory(data)
          setError(false)
        }
      } catch (err) {
        console.error('Failed to fetch history', err)
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (clientId) {
      fetchHistory()
    }

    return () => {
      mounted = false
    }
  }, [clientId, externalData])

  if (loading && !externalData) {
    return (
      <Card
        className={cn(
          'border-muted bg-white dark:bg-card shadow-sm h-[300px] flex items-center justify-center',
          className,
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    )
  }

  return (
    <Card
      className={cn('border-muted bg-white dark:bg-card shadow-sm', className)}
    >
      {!hideHeader && (
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileClock className="h-5 w-5 text-primary" />
            Resumo de Acertos (Histórico)
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn('p-6', hideHeader && 'pt-6')}>
        {error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <p>Erro ao carregar o histórico de acertos.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Data do Acerto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Média Mensal</TableHead>
                  <TableHead className="text-right">Valor da Venda</TableHead>
                  <TableHead className="text-right text-blue-600">
                    Saldo a Pagar
                  </TableHead>
                  <TableHead className="text-right text-green-600">
                    Valor Pago
                  </TableHead>
                  <TableHead className="text-right text-red-600">
                    Débito
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum histórico encontrado para este cliente.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>
                            {row.data
                              ? format(parseISO(row.data), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })
                              : '-'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {row.hora
                              ? row.hora.split(':').slice(0, 2).join(':')
                              : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{row.vendedor || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {row.mediaMensal !== null
                          ? `R$ ${formatCurrency(row.mediaMensal)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {formatCurrency(row.valorVendaTotal)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-blue-600 bg-blue-50/30">
                        R$ {formatCurrency(row.saldoAPagar)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-green-600 bg-green-50/30">
                        R$ {formatCurrency(row.valorPago)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono font-medium',
                          row.debito > 0.01
                            ? 'text-red-600'
                            : row.debito < -0.01
                              ? 'text-green-600'
                              : 'text-gray-400',
                        )}
                      >
                        R$ {formatCurrency(row.debito)}
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
  )
}
