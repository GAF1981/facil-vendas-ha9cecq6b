import { useEffect, useState, useCallback } from 'react'
import { ProductTable } from '@/components/products/ProductTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { productsService } from '@/services/productsService'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'
import { ProductImportDialog } from '@/components/products/ProductImportDialog'
import { useUserStore } from '@/stores/useUserStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KitList } from '@/components/products/KitList'

const ProductsPage = () => {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const { toast } = useToast()
  const { employee } = useUserStore()

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
        description: 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, toast])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const totalPages = Math.ceil(totalCount / pageSize)

  // Check permissions for CSV Import
  const canImport =
    employee?.setor &&
    (Array.isArray(employee.setor)
      ? employee.setor.some((s) =>
          ['Administrador', 'Gerente', 'Estoque'].includes(s),
        )
      : ['Administrador', 'Gerente', 'Estoque'].includes(employee.setor))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Menu Principal
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus produtos e kits.
          </p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="kits">Kits de Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">
              {totalCount} itens encontrados.
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {canImport && <ProductImportDialog onSuccess={fetchProducts} />}
              <Button asChild>
                <Link to="/produtos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou código de barras..."
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
          ) : products.length > 0 ? (
            <div className="space-y-4">
              <ProductTable products={products} onUpdate={fetchProducts} />

              <div className="flex items-center justify-between">
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
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  Não encontramos resultados para sua busca. Tente ajustar os
                  filtros ou cadastre um novo produto.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="kits">
          <KitList />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProductsPage
