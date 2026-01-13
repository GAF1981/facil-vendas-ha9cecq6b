import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InativarCliente } from '@/types/inativar_clientes'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { History, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface InativarHistoryTableProps {
  data: InativarCliente[]
  loading: boolean
}

export function InativarHistoryTable({
  data,
  loading,
}: InativarHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          Consulta de Clientes Inativados
        </CardTitle>
        <CardDescription>
          Histórico de clientes que já foram inativados.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Data Inativação</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Nome Cliente</TableHead>
                <TableHead className="text-right">Vl. Venda</TableHead>
                <TableHead className="text-right text-red-600 font-bold">
                  Débito Final
                </TableHead>
                <TableHead className="text-center">Expositor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Carregando histórico...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum histórico de inativação encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm">
                      {safeFormatDate(row.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.funcionario_nome}
                    </TableCell>
                    <TableCell className="font-mono">
                      {row.cliente_codigo}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.cliente_nome}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      R$ {formatCurrency(row.valor_venda)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-red-600 font-bold">
                      R$ {formatCurrency(row.debito)}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.expositor_retirado ? (
                        <div className="flex items-center justify-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Retirado
                          </Badge>
                          {row.observacoes_expositor && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    {row.observacoes_expositor}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Não Retirado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
