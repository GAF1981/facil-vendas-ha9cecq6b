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
import { RotateCcw, Loader2 } from 'lucide-react'
import { reportsService, AdjustmentReportRow } from '@/services/reportsService'
import { format, parseISO } from 'date-fns'

export default function AdjustmentReportsPage() {
  const [data, setData] = useState<AdjustmentReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsService
      .getInitialBalanceAdjustments()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <RotateCcw className="h-8 w-8 text-primary" />
          Ajustes de Saldo Inicial
        </h1>
        <p className="text-muted-foreground">
          Relatório de auditoria de alterações manuais no saldo inicial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ajustes</CardTitle>
          <CardDescription>
            Exibindo os últimos 1000 ajustes realizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Produto ID</TableHead>
                    <TableHead className="text-right">Saldo Anterior</TableHead>
                    <TableHead className="text-right">Saldo Novo</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center h-24 text-muted-foreground"
                      >
                        Nenhum ajuste encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {format(
                            parseISO(row.data_acerto),
                            'dd/MM/yyyy HH:mm',
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {row.cliente_nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Cod: {row.cliente_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{row.vendedor_nome}</TableCell>
                        <TableCell>{row.produto_id}</TableCell>
                        <TableCell className="text-right font-mono">
                          {row.saldo_anterior}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {row.saldo_novo}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold ${
                            row.quantidade_alterada > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {row.quantidade_alterada > 0 ? '+' : ''}
                          {row.quantidade_alterada}
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
