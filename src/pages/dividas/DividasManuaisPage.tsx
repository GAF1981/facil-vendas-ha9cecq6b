import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Search, Upload, RefreshCw } from 'lucide-react'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { ImportDividasModal } from '@/components/dividas/ImportDividasModal'
import { NovaDividaModal } from '@/components/dividas/NovaDividaModal'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function DividasManuaisPage() {
  const [dividas, setDividas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [novaDividaModalOpen, setNovaDividaModalOpen] = useState(false)
  const { toast } = useToast()

  const fetchDividas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dividas_manuais')
      .select('*, CLIENTES ( "NOME CLIENTE" )')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dívidas.',
        variant: 'destructive',
      })
    } else {
      setDividas(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDividas()
  }, [])

  const filteredDividas = dividas.filter(
    (d) =>
      d.cliente_id?.toString().includes(searchTerm) ||
      d.CLIENTES?.['NOME CLIENTE']
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dívida Inclusão Manual
          </h1>
          <p className="text-muted-foreground">
            Gerencie e importe dívidas de clientes manualmente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fetchDividas()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button
            onClick={() => setImportModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Débito
          </Button>
          <Button onClick={() => setNovaDividaModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Dívida
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Dívidas</CardTitle>
          <CardDescription>
            Visualize os débitos registrados no sistema.
          </CardDescription>
          <div className="mt-4 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome do cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Seq.</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Acerto</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor Parcela</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredDividas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhuma dívida encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDividas.map((d) => {
                    const pendente = d.valor_parcela - d.valor_pago
                    const isPago = pendente <= 0
                    return (
                      <TableRow
                        key={d.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          C{d.cobranca_seq}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {d.cliente_id}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {d.CLIENTES?.['NOME CLIENTE'] || 'Desconhecido'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{safeFormatDate(d.data_acerto)}</TableCell>
                        <TableCell className="font-medium">
                          {safeFormatDate(d.vencimento)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-background">
                            {d.forma_pagamento}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          R$ {formatCurrency(d.valor_parcela)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          R$ {formatCurrency(d.valor_pago)}
                        </TableCell>
                        <TableCell>
                          {isPago ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Quitado
                            </Badge>
                          ) : (
                            <Badge
                              variant="destructive"
                              className="bg-red-100 text-red-800 hover:bg-red-200"
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

      <ImportDividasModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={fetchDividas}
      />

      <NovaDividaModal
        open={novaDividaModalOpen}
        onOpenChange={setNovaDividaModalOpen}
        onSuccess={fetchDividas}
      />
    </div>
  )
}
