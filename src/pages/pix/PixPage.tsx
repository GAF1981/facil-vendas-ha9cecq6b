import { useEffect, useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw, Loader2, QrCode, ArrowLeft } from 'lucide-react'
import { PixTable } from '@/components/pix/PixTable'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { pixService } from '@/services/pixService'
import { PixReceiptRow } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export default function PixPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PixReceiptRow[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<PixReceiptRow | null>(
    null,
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'created_at', direction: 'desc' })

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await pixService.getPixReceipts()
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os recebimentos via Pix.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (row) =>
          row.cliente_nome.toLowerCase().includes(lower) ||
          row.venda_id.toString().includes(lower) ||
          row.cliente_id.toString().includes(lower) ||
          (row.nome_no_pix && row.nome_no_pix.toLowerCase().includes(lower)),
      )
    }

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof PixReceiptRow]
      let valB: any = b[sortConfig.key as keyof PixReceiptRow]

      if (valA === null || valA === undefined) valA = ''
      if (valB === null || valB === undefined) valB = ''

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [data, searchTerm, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const handleConfer = (receipt: PixReceiptRow) => {
    setSelectedReceipt(receipt)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="p-3 bg-teal-100 text-teal-700 rounded-lg shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Conferência de Pix
            </h1>
            <p className="text-muted-foreground">
              Validação e conferência de recebimentos via Pix.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recebimentos Pix</CardTitle>
          <CardDescription>
            Lista de recebimentos pendentes de conferência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, pedido ou nome no pix..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PixTable
              data={filteredAndSortedData}
              onConfer={handleConfer}
              onSort={handleSort}
              sortConfig={sortConfig}
            />
          )}
        </CardContent>
      </Card>

      <PixConferenceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        receipt={selectedReceipt}
        onSuccess={loadData}
      />
    </div>
  )
}
