import { useState, useMemo } from 'react'
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
import { History, Search, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface InativarHistoryTableProps {
  data: InativarCliente[]
  loading: boolean
}

export function InativarHistoryTable({
  data,
  loading,
}: InativarHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)

  const handleViewReason = (reason: string | null) => {
    setSelectedReason(reason || 'Nenhum motivo registrado.')
    setReasonDialogOpen(true)
  }

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const lowerTerm = searchTerm.toLowerCase()
    return data.filter((row) => {
      const nameMatch = row.cliente_nome?.toLowerCase().includes(lowerTerm)
      const codeMatch = row.cliente_codigo?.toString().includes(lowerTerm)
      return nameMatch || codeMatch
    })
  }, [data, searchTerm])

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Consulta de Clientes Inativados
              </CardTitle>
              <CardDescription>
                Histórico de clientes que já foram inativados.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por Nome ou Código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
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
                  <TableHead className="text-center w-[100px]">
                    Motivo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Carregando histórico...
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {searchTerm
                        ? 'Nenhum cliente encontrado para a busca.'
                        : 'Nenhum histórico de inativação encontrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
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
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Retirado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Não Retirado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() =>
                            handleViewReason(row.observacoes_expositor)
                          }
                          title="Ver Motivo da Inativação"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Inativação</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedReason}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
