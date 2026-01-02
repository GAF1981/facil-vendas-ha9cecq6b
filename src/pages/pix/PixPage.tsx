import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QrCode, Search, RefreshCw, Loader2 } from 'lucide-react'
import { PixTable } from '@/components/pix/PixTable'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { pixService } from '@/services/pixService'
import { PixReceiptRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'

export default function PixPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PixReceiptRow[]>([])
  const [filteredData, setFilteredData] = useState<PixReceiptRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<PixReceiptRow | null>(
    null,
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixReceipts()
      setData(result)
      setFilteredData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os recebimentos Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data)
      return
    }
    const lower = searchTerm.toLowerCase()
    const filtered = data.filter(
      (row) =>
        row.cliente_nome.toLowerCase().includes(lower) ||
        (row.id_da_femea?.toString() || row.venda_id.toString()).includes(
          lower,
        ) ||
        row.cliente_id.toString().includes(lower) ||
        (row.nome_no_pix && row.nome_no_pix.toLowerCase().includes(lower)),
    )
    setFilteredData(filtered)
  }, [searchTerm, data])

  const handleConfer = (receipt: PixReceiptRow) => {
    setSelectedReceipt(receipt)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Conferência Pix
            </h1>
            <p className="text-muted-foreground">
              Validação e registro de recebimentos via Pix.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conferência de Recebimentos via Pix</CardTitle>
          <CardDescription>
            Visualize e confira todos os pagamentos identificados como Pix.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, pedido ou nome no Pix..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading && data.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PixTable data={filteredData} onConfer={handleConfer} />
          )}
        </CardContent>
      </Card>

      <PixConferenceDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        receipt={selectedReceipt}
        onSuccess={fetchData}
      />
    </div>
  )
}
