import { useState, useEffect, useMemo, useRef } from 'react'
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
  ArrowLeft,
  Search,
  Save,
  Loader2,
  Calculator,
  DollarSign,
  Filter,
  AlertTriangle,
  ScanBarcode,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productsService } from '@/services/productsService'
import { inventarioService } from '@/services/inventarioService'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function ContagemPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allProducts, setAllProducts] = useState<ProductRow[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialCounts, setInitialCounts] = useState<Record<number, number>>({})
  const [counts, setCounts] = useState<Record<number, number>>({})
  const { toast } = useToast()
  const [activeSession, setActiveSession] = useState<any>(null)

  // Ref for the search input to allow programmatic focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'gt0' | 'eq'>('all')
  const [filterValue, setFilterValue] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        // 1. Check session
        const session = await inventarioService.getActiveSession()
        setActiveSession(session)

        // 2. Load existing counts for this session if available
        if (session) {
          const loadedCounts = await inventarioService.getSessionCounts(
            session['ID INVENTÁRIO'] || session.id,
          )
          setInitialCounts(loadedCounts)
          setCounts(loadedCounts)
        }

        // 3. Fetch ALL products for client-side filtering and summary
        const { data } = await productsService.getProducts(1, 10000, '')
        setAllProducts(data)
        setFilteredProducts(data)
      } catch (err) {
        console.error('Error initialization', err)
        toast({
          title: 'Erro de Inicialização',
          description:
            'Não foi possível carregar os dados. Verifique a conexão e tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [toast])

  // Filtering Logic
  useEffect(() => {
    let result = allProducts

    // 1. Search Term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          (p.PRODUTO?.toLowerCase() || '').includes(lower) ||
          (p.CODIGO?.toString() || '').includes(lower) ||
          (p['CÓDIGO BARRAS']?.toString() || '').includes(lower),
      )
    }

    // 2. Quantity Filter
    if (filterType === 'gt0') {
      result = result.filter((p) => (counts[p.ID] || 0) > 0)
    } else if (filterType === 'eq' && filterValue !== '') {
      const val = parseInt(filterValue)
      if (!isNaN(val)) {
        result = result.filter((p) => (counts[p.ID] || 0) === val)
      }
    }

    setFilteredProducts(result)
  }, [searchTerm, allProducts, counts, filterType, filterValue])

  // Summaries
  const summaries = useMemo(() => {
    let totalQty = 0
    let totalVal = 0

    // Summarize over ALL counted products, not just filtered ones
    Object.entries(counts).forEach(([idStr, qty]) => {
      const id = parseInt(idStr)
      if (qty > 0) {
        const product = allProducts.find((p) => p.ID === id)
        if (product) {
          totalQty += qty
          const price = parseCurrency(product.PREÇO)
          totalVal += qty * price
        }
      }
    })

    return { totalQty, totalVal }
  }, [counts, allProducts])

  const handleCountChange = (productId: number, value: string) => {
    const intVal = parseInt(value)
    setCounts((prev) => ({
      ...prev,
      [productId]: isNaN(intVal) ? 0 : intVal,
    }))
  }

  const handleBulkSave = async () => {
    if (!activeSession) {
      toast({
        title: 'Sem Sessão Ativa',
        description: 'É necessário iniciar uma sessão de inventário primeiro.',
        variant: 'destructive',
      })
      return
    }

    // Calculate deltas to ensure additive logic works correctly
    // even in concurrent environments or multiple saves
    const itemsToSave = Object.entries(counts)
      .map(([idStr, qty]) => {
        const id = parseInt(idStr)
        const initialQty = initialCounts[id] || 0
        const delta = qty - initialQty

        if (delta === 0) return null

        const product = allProducts.find((p) => p.ID === id)
        return {
          productId: id,
          productCode: product?.CODIGO || null,
          productName: product?.PRODUTO || '',
          quantity: delta, // Send only the difference!
          price: product ? parseCurrency(product.PREÇO) : 0,
        }
      })
      .filter(Boolean) as any[]

    if (itemsToSave.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Nenhuma nova contagem encontrada para salvar.',
        variant: 'default',
      })
      return
    }

    setSaving(true)
    try {
      const targetEmployeeId = activeSession?.['CODIGO FUNCIONARIO'] || null

      await inventarioService.saveFinalCounts(
        itemsToSave,
        activeSession['ID INVENTÁRIO'] || activeSession.id,
        targetEmployeeId,
      )

      toast({
        title: 'Sucesso',
        description: `${itemsToSave.length} itens salvos na tabela de Contagem de Estoque Final.`,
        className: 'bg-green-600 text-white',
      })

      // Update initial counts to prevent sending duplicates
      setInitialCounts({ ...counts })
    } catch (error: any) {
      console.error('Save error:', error)
      toast({
        title: 'Falha ao Salvar',
        description:
          error.message || 'Ocorreu um erro ao processar a contagem.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/inventario">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Contagem de Saldo Final
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {activeSession ? (
                <>
                  <span className="font-semibold text-primary">
                    Sessão #{activeSession['ID INVENTÁRIO'] || activeSession.id}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {activeSession.TIPO}
                  </span>
                </>
              ) : (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Nenhuma sessão ativa
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={handleBulkSave}
          disabled={saving || !activeSession}
          className="bg-green-600 hover:bg-green-700 font-bold shadow-md transition-all hover:scale-105 min-w-[240px]"
        >
          {saving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Save className="mr-2 h-5 w-5" />
          )}
          {saving ? 'Gravando...' : 'Gravar Contagem de Estoque Final'}
        </Button>
      </div>

      {/* Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Quantidade Total Contada
            </CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 tracking-tight">
              {summaries.totalQty}
            </div>
            <p className="text-xs text-blue-600/80 mt-1">
              Soma das quantidades inseridas
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Valor Total Contado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 tracking-tight">
              R$ {formatCurrency(summaries.totalVal)}
            </div>
            <p className="text-xs text-green-600/80 mt-1">
              Valor de venda estimado do estoque contado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Produtos para Contagem</CardTitle>
          <CardDescription>
            Utilize o campo de busca para encontrar produtos por Código de
            Barras, Código Interno ou Nome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/20 p-4 rounded-lg border">
            <div className="w-full md:w-1/3 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar (Scan de Código de Barras)..."
                className="pl-9 pr-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                onClick={focusSearch}
                title="Focar para Leitor"
              >
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-full md:w-auto flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filterType}
                onValueChange={(val: any) => setFilterType(val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtro de Quantidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  <SelectItem value="gt0">Contagem &gt; 0</SelectItem>
                  <SelectItem value="eq">Contagem Igual a...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterType === 'eq' && (
              <div className="w-32">
                <Input
                  type="number"
                  placeholder="Qtd..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border overflow-hidden relative">
            <div className="overflow-x-auto max-h-[600px]">
              <Table className="min-w-[800px] relative">
                <TableHeader className="bg-muted/90 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[80px]">Cód.</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Barras
                    </TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="w-[180px] text-center bg-yellow-100/80 text-yellow-900 font-extrabold border-l border-yellow-200">
                      Saldo Final (Qtd)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                          <p>Carregando produtos...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.ID} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">
                          {product.CODIGO || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{product.PRODUTO}</span>
                            <span className="text-xs text-muted-foreground md:hidden mt-0.5">
                              {product['CÓDIGO BARRAS']}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-xs">
                          {product['CÓDIGO BARRAS'] || '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          R$ {formatCurrency(parseCurrency(product.PREÇO))}
                        </TableCell>
                        <TableCell className="border-l border-yellow-100 bg-yellow-50/30 p-2">
                          <Input
                            type="number"
                            min="0"
                            className={cn(
                              'text-center font-bold text-lg h-10 transition-all border-dashed border-2',
                              (counts[product.ID] || 0) > 0
                                ? 'bg-yellow-100 border-yellow-400 text-yellow-900 shadow-sm'
                                : 'bg-transparent border-muted-foreground/20 focus:bg-white focus:border-primary',
                            )}
                            placeholder="0"
                            value={
                              counts[product.ID] !== undefined
                                ? counts[product.ID]
                                : ''
                            }
                            onChange={(e) =>
                              handleCountChange(product.ID, e.target.value)
                            }
                            onFocus={(e) => e.target.select()}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
            <div>
              Exibindo{' '}
              <span className="font-medium text-foreground">
                {filteredProducts.length}
              </span>{' '}
              de{' '}
              <span className="font-medium text-foreground">
                {allProducts.length}
              </span>{' '}
              produtos
            </div>
            {Object.keys(counts).length > 0 && (
              <div className="text-xs">
                {Object.keys(counts).length} produtos com contagem registrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
