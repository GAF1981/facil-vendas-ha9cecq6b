import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PackageX,
  Plus,
  ArrowLeft,
  ScanBarcode,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { productsService } from '@/services/productsService'
import { Product } from '@/types/product'
import { ProductTable } from '@/components/products/ProductTable'
import { ProductForm } from '@/components/products/ProductForm'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BarcodeScannerDialog } from '@/components/products/BarcodeScannerDialog'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const { toast } = useToast()

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

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
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <div className="flex items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full max-w-sm flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, barras ou nome..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            title="Escanear"
          >
            <ScanBarcode className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : products.length > 0 ? (
        <div className="space-y-4">
          <ProductTable
            products={products}
            onUpdate={fetchProducts}
            onEdit={setEditingProduct}
          />

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
                onClick={() => setSearchTerm('')}
                className="mt-2"
              >
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo produto.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSuccess={() => {
              setIsCreateOpen(false)
              fetchProducts()
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={editingProduct}
              onSuccess={() => {
                setEditingProduct(null)
                fetchProducts()
              }}
              onCancel={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
      />
    </div>
  )
}
