import { useState, useEffect } from 'react'
import { boletoService } from '@/services/boletoService'
import { cobrancaService } from '@/services/cobrancaService'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { Boleto } from '@/types/boleto'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  Upload,
  RotateCcw,
  Download,
  Search,
  Eraser,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { BoletoFormDialog } from '@/components/boletos/BoletoFormDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BoletosPage() {
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingBoleto, setEditingBoleto] = useState<Boleto | null>(null)

  const [filterConferido, setFilterConferido] = useState<string>('nao')
  const [filterValor, setFilterValor] = useState<string>('todos')
  const [filterCodigo, setFilterCodigo] = useState<string>('')
  const [filterNome, setFilterNome] = useState<string>('')

  const { toast } = useToast()

  const loadData = async () => {
    setLoading(true)
    try {
      const [data, debtsData] = await Promise.all([
        boletoService.getAll(),
        cobrancaService.getDebts(),
      ])

      await useDividasManuaisStore.getState().fetchDividas()
      const dividasData = useDividasManuaisStore.getState().dividas

      const mappedBoletos = data.map((b) => {
        const bDate = b.vencimento ? b.vencimento.substring(0, 10) : null
        const bValor = Number(b.valor)

        let matchedCobranca = false
        for (const client of debtsData) {
          if (client.clientId === b.cliente_codigo) {
            for (const order of client.orders) {
              for (const inst of order.installments) {
                const instDate = inst.vencimento
                  ? inst.vencimento.substring(0, 10)
                  : null
                const currentDebt = Number(
                  Math.max(0, inst.valorRegistrado - inst.valorPago).toFixed(2),
                )
                if (
                  instDate === bDate &&
                  Math.abs(currentDebt - bValor) < 0.01
                ) {
                  matchedCobranca = true
                  break
                }
              }
              if (matchedCobranca) break
            }
          }
          if (matchedCobranca) break
        }

        if (matchedCobranca) {
          return { ...b, conferido: true, is_divida_manual: false }
        }

        let matchedDivida = false
        for (const d of dividasData) {
          if (d.cliente_id === b.cliente_codigo) {
            const dDate = d.vencimento ? d.vencimento.substring(0, 10) : null
            if (dDate === bDate) {
              matchedDivida = true
              break
            }
          }
        }

        if (matchedDivida) {
          return { ...b, conferido: true, is_divida_manual: true }
        }

        return { ...b, conferido: false, is_divida_manual: false }
      })

      setBoletos(mappedBoletos)
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar boletos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const parsed = await boletoService.parseCSV(file)
      const res = await boletoService.importBoletos(parsed)
      if (res.success) {
        toast({
          title: 'Sucesso',
          description: res.message,
          className: 'bg-green-600 text-white',
        })
        await loadData()
      } else {
        toast({
          title: 'Aviso',
          description: res.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao importar o arquivo CSV.',
        variant: 'destructive',
      })
    } finally {
      if (e.target) e.target.value = ''
      setLoading(false)
    }
  }

  const uniqueValores = Array.from(new Set(boletos.map((b) => b.valor))).sort(
    (a, b) => a - b,
  )

  const filteredBoletos = boletos.filter((b) => {
    if (filterConferido !== 'todos') {
      if (filterConferido === 'sim' && !b.conferido) return false
      if (filterConferido === 'nao' && b.conferido) return false
    }

    if (filterValor !== 'todos' && b.valor.toString() !== filterValor)
      return false

    if (filterCodigo && !b.cliente_codigo.toString().includes(filterCodigo))
      return false

    if (
      filterNome &&
      !b.cliente_nome.toLowerCase().includes(filterNome.toLowerCase())
    )
      return false

    return true
  })

  const resetFilters = () => {
    setFilterConferido('nao')
    setFilterValor('todos')
    setFilterCodigo('')
    setFilterNome('')
  }

  const handleEdit = (boleto: Boleto) => {
    setEditingBoleto(boleto)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este boleto?')) return
    setLoading(true)
    try {
      await boletoService.delete(id)
      toast({
        title: 'Sucesso',
        description: 'Boleto excluído com sucesso.',
      })
      await loadData()
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir o boleto.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setEditingBoleto(null)
    setIsFormOpen(true)
  }

  const handleExport = () => {
    if (filteredBoletos.length === 0) return
    boletoService.generateCSV(
      filteredBoletos.map((b) => ({
        ...b,
        conferido: b.conferido ? 'SIM' : 'NÃO',
        originalConferido: b.conferido,
      })),
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Boletos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a importação e o status dos boletos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
            <Button variant="outline" disabled={loading}>
              <Upload className="mr-2 h-4 w-4" /> Importar CSV
            </Button>
          </div>
          <Button
            onClick={handleExport}
            variant="secondary"
            disabled={loading || boletos.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
          <Button onClick={loadData} disabled={loading}>
            <RotateCcw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Atualizar
          </Button>
          <Button onClick={handleCreateNew} disabled={loading}>
            <Plus className="mr-2 h-4 w-4" /> Novo Boleto Manual
          </Button>
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-md border flex flex-wrap gap-4 items-center">
        <div className="w-full sm:w-[150px] relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cód. Cliente"
            className="pl-9"
            value={filterCodigo}
            onChange={(e) => setFilterCodigo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome do Cliente"
            className="pl-9"
            value={filterNome}
            onChange={(e) => setFilterNome(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={filterValor} onValueChange={setFilterValor}>
            <SelectTrigger>
              <SelectValue placeholder="Valor Boleto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Valores</SelectItem>
              {uniqueValores.map((v) => (
                <SelectItem key={v} value={v.toString()}>
                  R$ {formatCurrency(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={filterConferido} onValueChange={setFilterConferido}>
            <SelectTrigger>
              <SelectValue placeholder="Status Conferido" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="sim">Conferido: SIM</SelectItem>
              <SelectItem value="nao">Conferido: NÃO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetFilters}
          title="Limpar filtros"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <Eraser className="h-5 w-5" />
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Conferido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredBoletos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum boleto encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBoletos.map((b) => (
                  <TableRow
                    key={b.id}
                    className={cn(
                      'hover:bg-muted/50',
                      b.is_divida_manual &&
                        'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10',
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {b.cliente_nome}
                        {b.is_divida_manual && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-blue-200 text-blue-700 bg-blue-50"
                          >
                            Dívida Manual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.cliente_codigo}
                    </TableCell>
                    <TableCell>
                      {safeFormatDate(b.vencimento, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      R$ {formatCurrency(b.valor)}
                    </TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={b.conferido ? 'default' : 'destructive'}
                        className={cn(
                          b.conferido &&
                            'bg-green-600 hover:bg-green-700 text-white',
                        )}
                      >
                        {b.conferido ? 'SIM' : 'NÃO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(b)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(b.id)}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <BoletoFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          setIsFormOpen(false)
          loadData()
        }}
        initialData={editingBoleto}
      />
    </div>
  )
}
