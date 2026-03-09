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
import { estoqueCarroService } from '@/services/estoqueCarroService'
import { ProductRow } from '@/types/product'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { ProductCombobox } from '@/components/products/ProductCombobox'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onSuccess?: () => void
  preselectedProduct?: {
    id: number
    codigo: number | null
    produto: string
  } | null
}

export function EstoqueCarroCountDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
  preselectedProduct,
}: Props) {
  const [step, setStep] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  useEffect(() => {
    if (open) {
      if (preselectedProduct) {
        setSelectedProduct({
          ID: preselectedProduct.id,
          CODIGO: preselectedProduct.codigo,
          PRODUTO: preselectedProduct.produto,
        } as ProductRow)
        setStep(2)
        setQuantity('')
      } else {
        setStep(1)
        setSelectedProduct(null)
        setQuantity('')
      }
    }
  }, [open, preselectedProduct])

  const handleProductSelect = (p: ProductRow | null) => {
    if (p) {
      setSelectedProduct(p)
      setStep(2)
    }
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return
    setLoading(true)
    try {
      await estoqueCarroService.saveCount(
        sessionId,
        selectedProduct.ID,
        parseInt(quantity),
        employee?.id,
        employee?.nome_completo,
      )
      toast({ title: 'Contagem Salva' })

      if (onSuccess) onSuccess()

      // Reset for next count for continuous scanning efficiency
      if (preselectedProduct) {
        onOpenChange(false)
      } else {
        setStep(1)
        setQuantity('')
        setSelectedProduct(null)
      }
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Erro ao salvar',
        description: e.message || 'Falha ao salvar contagem.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle>Contagem Carro</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selecione o Produto</label>
              <ProductCombobox
                selectedProduct={selectedProduct}
                onSelect={handleProductSelect}
                className="w-full"
                excludeInternalCode={true}
                autoFocus={true}
              />
              <p className="text-xs text-muted-foreground">
                Busque por nome ou escaneie o código de barras.
              </p>
            </div>
          </div>
        )}

        {step === 2 && selectedProduct && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded">
              <p className="font-bold">{selectedProduct.PRODUTO}</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Cod: {selectedProduct.CODIGO}</span>
                {selectedProduct['CÓDIGO BARRAS'] && (
                  <span>Bar: {selectedProduct['CÓDIGO BARRAS']}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade Contada</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                autoFocus
                placeholder="0"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (preselectedProduct) {
                    onOpenChange(false)
                  } else {
                    setStep(1)
                    setSelectedProduct(null)
                  }
                }}
              >
                {preselectedProduct ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
