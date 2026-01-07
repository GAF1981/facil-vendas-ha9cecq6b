import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductSelectorTable } from '@/components/acerto/ProductSelectorTable'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: string
  sessionId: number
  onSuccess: () => void
}

export function InventoryActionDialog({
  open,
  onOpenChange,
  type,
  sessionId,
  onSuccess,
}: Props) {
  const [step, setStep] = useState(1) // 1: Select, 2: Input Details
  const [products, setProducts] = useState<ProductRow[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState('')
  const [extraData, setExtraData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const searchProducts = async (term: string) => {
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
    setQuantity('')
    setExtraData({})
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return
    setLoading(true)
    try {
      await inventoryGeneralService.registerMovement(sessionId, type as any, [
        {
          productId: selectedProduct.ID,
          quantity: parseFloat(quantity),
          extra: extraData,
        },
      ])
      toast({ title: 'Movimento Salvo' })
      onSuccess()
      // Reset for next
      setStep(1)
      setQuantity('')
      setSelectedProduct(null)
      onOpenChange(false)
    } catch (e) {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'COMPRA':
        return 'Registrar Compra'
      case 'CARRO_PARA_ESTOQUE':
        return 'Devolução (Carro -> Estoque)'
      case 'PERDA':
        return 'Registrar Perda'
      case 'ESTOQUE_PARA_CARRO':
        return 'Reposição (Estoque -> Carro)'
      case 'CONTAGEM':
        return 'Registrar Contagem'
      default:
        return 'Movimento'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  searchProducts(e.target.value)
                }}
                autoFocus
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
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

            <div className="grid gap-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>

            {type === 'COMPRA' && (
              <div className="grid gap-2">
                <Label>Valor Unitário (Custo)</Label>
                <Input
                  type="number"
                  onChange={(e) =>
                    setExtraData({
                      ...extraData,
                      valorUnitario: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            )}

            {type === 'PERDA' && (
              <div className="grid gap-2">
                <Label>Motivo</Label>
                <Input
                  onChange={(e) =>
                    setExtraData({ ...extraData, motivo: e.target.value })
                  }
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
