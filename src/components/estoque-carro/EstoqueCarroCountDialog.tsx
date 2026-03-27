import { useState, useEffect, useRef } from 'react'
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
import { productsService } from '@/services/productsService'
import { ProductRow } from '@/types/product'
import { Loader2, Barcode, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { ManualProductSelect } from '@/components/products/ManualProductSelect'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

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
  const [inputMode, setInputMode] = useState<
    'barcode' | 'manual' | 'auto-barcode'
  >('barcode')
  const [barcode, setBarcode] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
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
        setQuantity('1')
        setTimeout(() => {
          quantityRef.current?.focus()
          quantityRef.current?.select()
        }, 150)
      } else {
        setStep(1)
        setSelectedProduct(null)
        setQuantity('')
        setInputMode('barcode')
        setBarcode('')
      }
    }
  }, [open, preselectedProduct])

  useEffect(() => {
    if (open && step === 1 && !preselectedProduct) {
      if (inputMode === 'barcode') {
        setTimeout(() => barcodeRef.current?.focus(), 50)
      }
    }
  }, [inputMode, open, step, preselectedProduct])

  useEffect(() => {
    if (!open || step !== 1 || preselectedProduct) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        setInputMode((prev) => (prev === 'barcode' ? 'manual' : 'barcode'))
      } else if (e.key === 'F3') {
        e.preventDefault()
        setInputMode('auto-barcode')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, step, preselectedProduct])

  const handleAutoBarcodeScan = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = barcode.trim()
      if (!code) return

      setLoading(true)
      try {
        const { data } = await productsService.getProducts(
          1,
          10,
          code,
          null,
          null,
          'PRODUTO',
          true,
          false,
        )

        const exactMatch = data.find(
          (p) =>
            p['CÓDIGO BARRAS'] === code ||
            p.codigo_interno === code ||
            p.CODIGO?.toString() === code,
        )

        if (exactMatch) {
          await estoqueCarroService.saveCount(
            sessionId,
            exactMatch.ID,
            1,
            employee?.id,
            employee?.nome_completo,
          )
          toast({
            title: 'Soma Aplicada (+1)',
            description: exactMatch.PRODUTO,
          })

          if (onSuccess) onSuccess()
          setBarcode('')
        } else {
          toast({
            title: 'Não encontrado',
            description: `Nenhum produto com código ${code}.`,
            variant: 'destructive',
          })
          barcodeRef.current?.select()
        }
      } catch (err: any) {
        console.error(err)
        toast({
          title: 'Erro',
          description: 'Erro ao buscar produto.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        setTimeout(() => {
          barcodeRef.current?.focus()
        }, 50)
      }
    }
  }

  const handleProductSelect = (p: ProductRow | null) => {
    if (p) {
      setSelectedProduct(p)
      setStep(2)
      setQuantity('1')
      setTimeout(() => {
        quantityRef.current?.focus()
        quantityRef.current?.select()
      }, 50)
    }
  }

  const handleBarcodeScan = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const code = barcode.trim()
      if (!code) return

      setLoading(true)
      try {
        const { data } = await productsService.getProducts(
          1,
          10,
          code,
          null,
          null,
          'PRODUTO',
          true,
          false,
        )

        const exactMatch = data.find(
          (p) =>
            p['CÓDIGO BARRAS'] === code ||
            p.codigo_interno === code ||
            p.CODIGO?.toString() === code,
        )

        if (exactMatch) {
          handleProductSelect(exactMatch)
          setBarcode('')
        } else {
          toast({
            title: 'Não encontrado',
            description: `Nenhum produto com código ${code}.`,
            variant: 'destructive',
          })
          barcodeRef.current?.select()
        }
      } catch (err: any) {
        console.error(err)
        toast({
          title: 'Erro',
          description: 'Erro ao buscar produto.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
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
      toast({ title: 'Contagem Atualizada (Soma Aplicada)' })

      if (onSuccess) onSuccess()

      if (preselectedProduct) {
        onOpenChange(false)
      } else {
        setStep(1)
        setQuantity('')
        setSelectedProduct(null)
        setBarcode('')
        setTimeout(() => {
          if (inputMode === 'barcode') {
            barcodeRef.current?.focus()
          }
        }, 100)
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
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border shadow-sm">
              <RadioGroup
                value={inputMode}
                onValueChange={(val) =>
                  setInputMode(val as 'barcode' | 'manual' | 'auto-barcode')
                }
                className="flex items-center space-x-4 flex-wrap gap-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="barcode" id="cc-barcode" />
                  <Label htmlFor="cc-barcode" className="cursor-pointer">
                    Código de Barras (F2)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="cc-manual" />
                  <Label htmlFor="cc-manual" className="cursor-pointer">
                    Busca Manual (F2)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto-barcode" id="cc-auto-barcode" />
                  <Label htmlFor="cc-auto-barcode" className="cursor-pointer">
                    Barras Automático (F3)
                  </Label>
                </div>
              </RadioGroup>

              {inputMode === 'barcode' || inputMode === 'auto-barcode' ? (
                <div className="space-y-2">
                  <Label
                    className={cn(
                      'flex items-center gap-2 font-semibold',
                      inputMode === 'auto-barcode'
                        ? 'text-green-600'
                        : 'text-primary',
                    )}
                  >
                    <Barcode className="w-4 h-4" />
                    {inputMode === 'auto-barcode'
                      ? 'Scanner Automático (Soma 1)'
                      : 'Scanner'}
                  </Label>
                  <Input
                    ref={barcodeRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={
                      inputMode === 'auto-barcode'
                        ? handleAutoBarcodeScan
                        : handleBarcodeScan
                    }
                    placeholder="Bipe o código..."
                    disabled={loading}
                    className={cn(
                      'bg-background focus-visible:ring-primary',
                      inputMode === 'auto-barcode' &&
                        'border-green-500 focus-visible:ring-green-500',
                    )}
                  />
                  {inputMode === 'auto-barcode' && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      O produto será salvo automaticamente com quantidade 1 e o
                      cursor continuará no campo.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <Search className="w-4 h-4" />
                    Busca Manual
                  </Label>
                  <ManualProductSelect
                    selectedProduct={selectedProduct}
                    onSelect={handleProductSelect}
                    disabled={loading}
                    autoFocus={true}
                  />
                </div>
              )}
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
              <label className="text-sm font-medium">Quantidade a Somar</label>
              <Input
                ref={quantityRef}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSave()
                  }
                }}
                placeholder="0"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                O valor inserido será adicionado ao total já existente.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  if (preselectedProduct) {
                    onOpenChange(false)
                  } else {
                    setStep(1)
                    setSelectedProduct(null)
                    setTimeout(() => {
                      if (inputMode === 'barcode') {
                        barcodeRef.current?.focus()
                      }
                    }, 50)
                  }
                }}
              >
                {preselectedProduct ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Soma
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
