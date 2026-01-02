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
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { pixService } from '@/services/pixService'
import { PixRecebimentoRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'

export default function PixPage() {
  const [data, setData] = useState<PixRecebimentoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const { employee } = useUserStore()

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

  const handleConfirm = async (row: PixRecebimentoRow) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Funcionário não identificado.',
        variant: 'destructive',
      })
      return
    }

    try {
      await pixService.confirmPixReceipt(
        row.id,
        employee.nome_completo || employee.apelido || 'Funcionário',
      )
      toast({
        title: 'Sucesso',
        description: 'Recebimento Pix confirmado!',
        className: 'bg-green-600 text-white',
      })
      // Optimistic update or reload
      loadData()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar o recebimento.',
        variant: 'destructive',
      })
    }
  }

  // Filter
  const filteredData = data.filter((r) => {
    const s = searchTerm.toLowerCase()
    return (
      r.orderId.toString().includes(s) ||
      r.clientCode.toString().includes(s) ||
      r.clientName.toLowerCase().includes(s)
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
                Gestão de recebimentos via Pix.
              </p>
            </div>
          </div>
          <Link to="/confirmacao-recebimentos">
            <Button variant="secondary" className="gap-2">
              Pix Acertos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center bg-card p-2 rounded-lg border shadow-sm max-w-md w-full">
          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, pedido..."
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
          <CardTitle>Pix de Recebimentos Avulsos</CardTitle>
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
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Confirmado Por</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                        Carregando...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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
                      <TableCell className="text-center">
                        {row.isConfirmed ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.confirmedBy || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!row.isConfirmed && (
                          <Button
                            size="sm"
                            onClick={() => handleConfirm(row)}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            Confirmar
                          </Button>
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
    </div>
  )
}
