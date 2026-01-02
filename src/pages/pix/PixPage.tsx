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
import { Input } from '@/components/ui/input'
import {
  Loader2,
  RefreshCw,
  Search,
  QrCode,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react'
import { pixService } from '@/services/pixService'
import { PixRecebimentoRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { format, parseISO } from 'date-fns'

export default function PixPage() {
  const [data, setData] = useState<PixRecebimentoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRow, setSelectedRow] = useState<PixRecebimentoRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixConferenceData()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de conferência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenConference = (row: PixRecebimentoRow) => {
    setSelectedRow(row)
    setDialogOpen(true)
  }

  const filteredData = data.filter((r) => {
    const s = searchTerm.toLowerCase()
    return (
      r.orderId.toString().includes(s) ||
      r.clientCode.toString().includes(s) ||
      r.clientName.toLowerCase().includes(s) ||
      r.pixName?.toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pix</h1>
              <p className="text-muted-foreground">
                Central de Conferência e Confirmação.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Confirmar Pix Recebimento - Hidden by default per requirement */}
            <Button variant="outline" className="hidden">
              Confirmar Pix Recebimento
            </Button>

            <Link to="/confirmacao-recebimentos">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                Confirmar Pix Acerto
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-card p-2 rounded-lg border shadow-sm max-w-md w-full">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, pedido, nome no pix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 h-8"
          />
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
          <CardTitle>Conferência de Recebimentos via Pix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Pedido</TableHead>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead className="min-w-[150px]">Cliente</TableHead>
                  <TableHead>Forma Pag.</TableHead>
                  <TableHead className="text-right">Valor Avulso</TableHead>
                  {/* Metadata Columns */}
                  <TableHead>Nome no Pix</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Data Realizada</TableHead>
                  <TableHead>Conferido Por</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono">
                        #{row.orderId}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {row.clientCode}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {row.clientName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.paymentMethod}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        R$ {formatCurrency(row.value)}
                      </TableCell>

                      <TableCell className="text-xs">
                        {row.pixName || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.pixBank || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.pixDate
                          ? format(parseISO(row.pixDate), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.confirmedBy || '-'}
                      </TableCell>

                      <TableCell className="text-right">
                        {!row.isConfirmed ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenConference(row)}
                            className="h-8 border-teal-200 text-teal-700 hover:bg-teal-50"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                            Registrar
                          </Button>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            Conferido
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

      <PixConferenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        row={selectedRow}
        onSuccess={loadData}
      />
    </div>
  )
}
