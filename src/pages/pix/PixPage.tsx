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
import { Loader2, RefreshCw, Search, QrCode } from 'lucide-react'
import { pixService } from '@/services/pixService'
import { PixRecebimentoRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { format } from 'date-fns'
import { PixRegistrationDialog } from '@/components/pix/PixRegistrationDialog'

export default function PixPage() {
  const [data, setData] = useState<PixRecebimentoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixRecebimentos()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter
  const filteredData = data.filter((r) => {
    const s = searchTerm.toLowerCase()
    return (
      r.orderId.toString().includes(s) ||
      r.clientCode.toString().includes(s) ||
      r.clientName.toLowerCase().includes(s) ||
      (r.pixDetails?.nome_no_pix || '').toLowerCase().includes(s) ||
      (r.pixDetails?.banco_pix || '').toLowerCase().includes(s)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in p-4 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pix</h1>
            <p className="text-muted-foreground">
              Central de conferência de recebimentos via Pix.
            </p>
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
                  <TableHead className="w-[100px]">Pedido</TableHead>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Nome no Pix</TableHead>
                  <TableHead>Banco Pix</TableHead>
                  <TableHead>Data Realizada</TableHead>
                  <TableHead>Confirmado Por</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
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
                      <TableCell className="text-right font-mono font-medium">
                        R$ {formatCurrency(row.value)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.pixDetails?.nome_no_pix || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.pixDetails?.banco_pix || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.pixDetails?.data_realizada
                          ? format(
                              new Date(row.pixDetails.data_realizada),
                              'dd/MM/yyyy',
                            )
                          : '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.pixDetails?.confirmado_por || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <PixRegistrationDialog row={row} onSuccess={loadData} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
