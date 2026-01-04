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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RefreshCw, Loader2, Eraser } from 'lucide-react'
import { PixTable } from '@/components/pix/PixTable'
import { PixConferenceDialog } from '@/components/pix/PixConferenceDialog'
import { pixService } from '@/services/pixService'
import { PixReceiptRow, PixFilters } from '@/types/pix'
import { useToast } from '@/hooks/use-toast'
import { parseISO } from 'date-fns'

export function PixTabContent() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PixReceiptRow[]>([])
  const [filteredData, setFilteredData] = useState<PixReceiptRow[]>([])

  const [filters, setFilters] = useState<PixFilters>({
    orderId: '',
    name: '',
    bank: 'todos',
    status: 'todos',
  })

  const [sortConfig, setSortConfig] = useState<{
    key:
      | keyof PixReceiptRow
      | 'valor_pago'
      | 'id_da_femea'
      | 'data_acerto'
      | 'data_pix_realizado'
    direction: 'asc' | 'desc'
  }>({
    key: 'id_da_femea',
    direction: 'desc',
  })

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
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar os recebimentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = [...data]

    if (filters.orderId) {
      result = result.filter((row) =>
        (row.id_da_femea?.toString() || row.venda_id.toString()).includes(
          filters.orderId,
        ),
      )
    }

    if (filters.name) {
      const lowerQuery = filters.name.toLowerCase()
      result = result.filter(
        (row) =>
          (row.cliente_nome &&
            row.cliente_nome.toLowerCase().includes(lowerQuery)) ||
          (row.cliente_id && row.cliente_id.toString().includes(lowerQuery)),
      )
    }

    if (filters.bank && filters.bank !== 'todos') {
      result = result.filter((row) => row.banco_pix === filters.bank)
    }

    if (filters.status && filters.status !== 'todos') {
      if (filters.status === 'SIM') {
        result = result.filter((row) => !!row.confirmado_por)
      } else if (filters.status === 'NÃO') {
        result = result.filter((row) => !row.confirmado_por)
      }
    }

    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof PixReceiptRow]
      let bValue: any = b[sortConfig.key as keyof PixReceiptRow]

      if (sortConfig.key === 'id_da_femea') {
        aValue = a.id_da_femea || a.venda_id
        bValue = b.id_da_femea || b.venda_id
      }

      if (
        sortConfig.key === 'data_acerto' ||
        sortConfig.key === 'data_pix_realizado'
      ) {
        const timeA = aValue ? parseISO(aValue).getTime() : 0
        const timeB = bValue ? parseISO(bValue).getTime() : 0
        return sortConfig.direction === 'asc' ? timeA - timeB : timeB - timeA
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }

      const strA = String(aValue || '').toLowerCase()
      const strB = String(bValue || '').toLowerCase()

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    setFilteredData(result)
  }, [data, filters, sortConfig])

  useEffect(() => {
    fetchData()
  }, [])

  const handleFilterChange = (key: keyof PixFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ orderId: '', name: '', bank: 'todos', status: 'todos' })
  }

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key: key as any,
      direction:
        current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const handleConfer = (receipt: PixReceiptRow) => {
    setSelectedReceipt(receipt)
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Filtros de Busca</CardTitle>
            <CardDescription>
              Utilize os campos abaixo para filtrar os pagamentos Pix.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="orderId">Número do Pedido</Label>
              <Input
                id="orderId"
                placeholder="Ex: 12345"
                value={filters.orderId}
                onChange={(e) => handleFilterChange('orderId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pixName">Cliente (Nome ou Código)</Label>
              <Input
                id="pixName"
                placeholder="Buscar cliente..."
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Banco Pix</Label>
              <Select
                value={filters.bank}
                onValueChange={(v) => handleFilterChange('bank', v)}
              >
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="BS2">BS2</SelectItem>
                  <SelectItem value="CORA">CORA</SelectItem>
                  <SelectItem value="OUTROS">OUTROS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Conferido</Label>
              <Select
                value={filters.status}
                onValueChange={(v) => handleFilterChange('status', v)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="w-full"
            >
              <Eraser className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>

          {loading && data.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <PixTable
              data={filteredData}
              onConfer={handleConfer}
              onSort={handleSort}
              sortConfig={sortConfig}
            />
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
