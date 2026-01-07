import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { productsService } from '@/services/productsService'
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { ProductRow } from '@/types/product'
import { Loader2, Search, Camera } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ProductSelectorTable } from '@/components/acerto/ProductSelectorTable'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onSuccess: () => void
}

export function EstoqueCarroCountDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setStep(1)
      setSearchTerm('')
      setProducts([])
      setSelectedProduct(null)
      setQuantity('')
    }
  }, [open])

  const handleSearch = async (term: string) => {
    if (!term) return
    setLoading(true)
    try {
      const { data } = await productsService.getProducts(1, 20, term)
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (p: ProductRow) => {
    setSelectedProduct(p)
    setStep(2)
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return
    setLoading(true)
    try {
      await estoqueCarroService.saveCount(
        sessionId,
        selectedProduct.ID,
        parseInt(quantity),
      )
      toast({ title: 'Contagem Salva' })
      onSuccess()

      // Reset for next count
      setStep(1)
      setQuantity('')
      setSelectedProduct(null)
      // Keep dialog open for rapid entry? Or close? User story implies standard modal flow.
      // "Allow editing/deleting individual lines via icons" -> implies this modal is for adding/editing.
      // I'll close it to follow standard dialog pattern, user can reopen or use "Save & Next" if implemented.
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contagem Carro</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    // Simple debounce
                    if (e.target.value.length > 2) handleSearch(e.target.value)
                  }}
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                title="Scan Barcode (Placeholder)"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              <ProductSelectorTable
                products={products}
                loading={loading}
                searchTerm={searchTerm}
                selectedIds={new Set()}
                onSelect={handleSelect}
                onToggleSelect={() => {}}
                onToggleSelectAll={() => {}}
              />
            </div>
          </div>
        )}

        {step === 2 && selectedProduct && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded">
              <p className="font-bold">{selectedProduct.PRODUTO}</p>
              <p className="text-sm">Cod: {selectedProduct.CODIGO}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade Contada</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
