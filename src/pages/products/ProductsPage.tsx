import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Loader2,
  ScanBarcode,
  ChevronLeft,
  ChevronRight,
  PackageX,
  X,
  Plus,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productsService } from '@/services/productsService'
import { Product } from '@/types/product'
import { BarcodeScannerDialog } from '@/components/products/BarcodeScannerDialog'
import { ProductTable } from '@/components/products/ProductTable'
import { ProductCardItem } from '@/components/products/ProductCardItem'
import { useToast } from '@/hooks/use-toast'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const [scannerOpen, setScannerOpen] = useState(false)
  const { toast } = useToast()

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await productsService.getProducts(
        page,
        pageSize,
        debouncedSearch,
      )
      setProducts(data)
      setTotalCount(count)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar produtos',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, toast])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleScan = (code: string) => {
    setSearchTerm(code)
    toast({
      title: 'Código escaneado',
      description: `Buscando por: ${code}`,
    })
  }

  const handleClearSearch = () => {
    setSearchTerm('')
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link
                to="/dashboard"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Menu Principal
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de produtos ({totalCount} registros)
          </p>
        </div>
        <Button asChild>
          <Link to="/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou código de barras..."
            className="pl-8 pr-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Limpar busca</span>
            </Button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setScannerOpen(true)}
          title="Escanear Código de Barras"
          className="shrink-0"
        >
          <ScanBarcode className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Escanear</span>
        </Button>
      </div>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-4">
          {/* Mobile View - Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {products.map((product) => (
              <ProductCardItem
                key={product.CODIGO}
                product={product}
                onUpdate={fetchProducts}
              />
            ))}
          </div>

          {/* Desktop View - Table */}
          <ProductTable products={products} onUpdate={fetchProducts} />

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <PackageX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Produto não encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Nenhum produto corresponde à sua busca. Verifique o código ou nome
              digitado.
            </p>
            {searchTerm && (
              <Button
                variant="link"
                onClick={handleClearSearch}
                className="mt-2"
              >
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
