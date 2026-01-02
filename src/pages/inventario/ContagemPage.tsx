import { useState, useEffect, useMemo } from 'react'
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
  const [counts, setCounts] = useState<Record<number, number>>({})
  const { toast } = useToast()
  const [activeSession, setActiveSession] = useState<any>(null)

  // Filter State
  const [filterType, setFilterType] = useState<'all' | 'gt0' | 'eq'>('all')
  const [filterValue, setFilterValue] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        // Check session
        const session = await inventarioService.getActiveSession()
        setActiveSession(session)

        // Fetch ALL products for client-side filtering and summary
        // Using a large page size to effectively get all
        const { data } = await productsService.getProducts(1, 10000, '')
        setAllProducts(data)
        setFilteredProducts(data)
      } catch (err) {
        console.error('Error initialization', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados iniciais.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Filtering Logic
  useEffect(() => {
    let result = allProducts

    // 1. Search Term
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          p.PRODUTO?.toLowerCase().includes(lower) ||
          p.CODIGO?.toString().includes(lower) ||
          p['CÓDIGO BARRAS']?.toString().includes(lower),
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

    const itemsToSave = Object.entries(counts)
      .filter(([_, qty]) => qty >= 0) // Save all entries, even 0 if intended? Usually we save > 0 or all touched. Let's save all present in state.
      .map(([idStr, qty]) => {
        const id = parseInt(idStr)
        const product = allProducts.find((p) => p.ID === id)
        return {
          productId: id,
          productCode: product?.CODIGO || null,
          quantity: qty,
          price: product ? parseCurrency(product.PREÇO) : 0,
        }
      })

    if (itemsToSave.length === 0) {
      toast({
        title: 'Nada para salvar',
        description: 'Nenhuma contagem foi realizada.',
      })
      return
    }

    setSaving(true)
    try {
      const targetEmployeeId = activeSession?.['CODIGO FUNCIONARIO'] || null

      await inventarioService.saveFinalCounts(
        itemsToSave,
        activeSession['ID INVENTÁRIO'],
        targetEmployeeId,
      )

      toast({
        title: 'Sucesso',
        description: 'Contagem de estoque final salva com sucesso.',
        className: 'bg-green-600 text-white',
      })

      // Optionally clear counts or keep them? Keeping them allows further editing.
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a contagem em lote.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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
            <p className="text-muted-foreground">
              {activeSession
                ? `Sessão #${activeSession['ID INVENTÁRIO']} | Registre o saldo final de cada produto.`
                : 'Nenhuma sessão ativa encontrada.'}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          onClick={handleBulkSave}
          disabled={saving || !activeSession}
          className="bg-green-600 hover:bg-green-700 font-bold shadow-md transition-all hover:scale-105"
        >
          {saving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Save className="mr-2 h-5 w-5" />
          )}
          Gravar Contagem de Estoque Final
        </Button>
      </div>

      {/* Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Quantidade Total Contada
            </CardTitle>
            <Calculator className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {summaries.totalQty}
            </div>
            <p className="text-xs text-blue-600/80">
              Soma das quantidades inseridas
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Valor Total Contado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              R$ {formatCurrency(summaries.totalVal)}
            </div>
            <p className="text-xs text-green-600/80">
              Baseado no preço atual dos produtos
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            Listagem completa de produtos para contagem. Utilize os filtros para
            facilitar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-end bg-muted/20 p-4 rounded-lg border">
            <div className="w-full md:w-1/3 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto, código ou EAN..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">Cód.</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Barras</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="w-[150px] text-center bg-yellow-50/50 text-yellow-800 font-bold border-l">
                    Saldo Final
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum produto encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.ID} className="hover:bg-muted/30">
                      <TableCell className="font-mono">
                        {product.CODIGO || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{product.PRODUTO}</span>
                          <span className="text-xs text-muted-foreground md:hidden">
                            {product['CÓDIGO BARRAS']}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {product['CÓDIGO BARRAS'] || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {formatCurrency(parseCurrency(product.PREÇO))}
                      </TableCell>
                      <TableCell className="border-l bg-yellow-50/10 p-2">
                        <Input
                          type="number"
                          min="0"
                          className={cn(
                            'text-center font-bold text-lg h-10 transition-colors',
                            (counts[product.ID] || 0) > 0
                              ? 'bg-yellow-100 border-yellow-300 text-yellow-900'
                              : '',
                          )}
                          placeholder="0"
                          value={counts[product.ID] ?? ''}
                          onChange={(e) =>
                            handleCountChange(product.ID, e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <div>
              Exibindo {filteredProducts.length} de {allProducts.length}{' '}
              produtos
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
