import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Barcode, Search, X } from 'lucide-react'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { suppliersService, Supplier } from '@/services/suppliersService'
import { employeesService } from '@/services/employeesService'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { productsService } from '@/services/productsService'
import { ProductRow } from '@/types/product'
import { Employee } from '@/types/employee'
import { InventoryMovementType } from '@/types/inventory_general'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'
import { ManualProductSelect } from '@/components/products/ManualProductSelect'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface InventoryActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: InventoryMovementType | null
  sessionId: number
  onSuccess: () => void
  persistedEmployeeId: string
  setPersistedEmployeeId: (id: string) => void
  persistedSupplierId: string
  setPersistedSupplierId: (id: string) => void
  preselectedProduct?: {
    ID: number
    CODIGO: number | null
    PRODUTO: string | null
    PREÇO?: string | null
  }
}

export function InventoryActionDialog({
  open,
  onOpenChange,
  type,
  sessionId,
  onSuccess,
  persistedEmployeeId,
  setPersistedEmployeeId,
  persistedSupplierId,
  setPersistedSupplierId,
  preselectedProduct,
}: InventoryActionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  const [inputMode, setInputMode] = useState<'barcode' | 'manual'>('barcode')
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [barcode, setBarcode] = useState<string>('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [costValue, setCostValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const quantityRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  const getTitle = () => {
    switch (type) {
      case 'COMPRA':
        return 'Registrar Compra'
      case 'CARRO_PARA_ESTOQUE':
        return 'Devolução (Carro -> Estoque)'
      case 'ESTOQUE_PARA_CARRO':
        return 'Reposição (Estoque -> Carro)'
      case 'PERDA':
        return 'Registrar Perda/Quebra'
      case 'CONTAGEM':
        return 'Contagem de Estoque'
      default:
        return 'Movimentação de Estoque'
    }
  }

  // F2 Shortcut for Toggling Focus
  useEffect(() => {
    if (!open || preselectedProduct) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        setInputMode((prev) => (prev === 'barcode' ? 'manual' : 'barcode'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, preselectedProduct])

  useEffect(() => {
    if (open && !preselectedProduct) {
      if (inputMode === 'barcode') {
        setTimeout(() => barcodeRef.current?.focus(), 50)
      }
    }
  }, [inputMode, open, preselectedProduct])

  // Initial Data and Focus
  useEffect(() => {
    if (open) {
      setLoading(true)
      const promises = []

      if (preselectedProduct) {
        const prod = {
          ID: preselectedProduct.ID,
          CODIGO: preselectedProduct.CODIGO,
          PRODUTO: preselectedProduct.PRODUTO,
          PREÇO: preselectedProduct.PREÇO,
        } as ProductRow
        setSelectedProduct(prod)
      } else {
        setSelectedProduct(null)
        setBarcode('')
        setInputMode('barcode')
        setTimeout(() => {
          barcodeRef.current?.focus()
        }, 150)
      }

      if (type === 'COMPRA') {
        promises.push(suppliersService.getAll().then(setSuppliers))
      }

      if (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') {
        promises.push(
          employeesService.getEmployees(1, 1000).then(({ data }) => {
            const allowedSectors = ['vendedor', 'administrador', 'gerente']
            const filtered = data.filter((e) =>
              e.setor?.some((s) => allowedSectors.includes(s.toLowerCase())),
            )
            setEmployees(filtered)
          }),
        )
      }

      Promise.all(promises).finally(() => setLoading(false))

      setQuantity('')
      setCostValue('')
      setReason('')

      if (type === 'COMPRA' && persistedSupplierId) {
        setSelectedSupplier(persistedSupplierId)
      }
      if (
        (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') &&
        persistedEmployeeId
      ) {
        setSelectedEmployee(persistedEmployeeId)
      }
    }
  }, [open, type, preselectedProduct, persistedSupplierId, persistedEmployeeId])

  const handleProductSelect = (prod: ProductRow | null) => {
    setSelectedProduct(prod)

    if (prod) {
      if (type === 'COMPRA' && prod.PREÇO) {
        const salePrice = parseCurrency(prod.PREÇO)
        const calculatedCost = salePrice * 0.3
        setCostValue(formatCurrency(calculatedCost))
      }
      // Auto focus quantity input when product is picked
      setTimeout(() => {
        quantityRef.current?.focus()
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
          setBarcode('') // Clear it for visual cleanliness
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

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast({
        title: 'Erro',
        description: 'Selecione um produto.',
        variant: 'destructive',
      })
      return
    }

    const qty = Number(quantity)
    if (type !== 'CONTAGEM' && (!quantity || qty <= 0)) {
      toast({
        title: 'Erro',
        description: 'Informe uma quantidade válida.',
        variant: 'destructive',
      })
      return
    }
    if (type === 'CONTAGEM' && quantity === '') {
      toast({
        title: 'Erro',
        description: 'Informe a quantidade contada.',
        variant: 'destructive',
      })
      return
    }

    const extra: any = {}

    if (type === 'COMPRA') {
      if (!selectedSupplier) {
        toast({
          title: 'Erro',
          description: 'Fornecedor é obrigatório.',
          variant: 'destructive',
        })
        return
      }
      if (!costValue) {
        toast({
          title: 'Erro',
          description: 'Valor de custo é obrigatório.',
          variant: 'destructive',
        })
        return
      }
      extra.fornecedorId = parseInt(selectedSupplier)
      extra.valorUnitario = parseCurrency(costValue)
      setPersistedSupplierId(selectedSupplier)
    }

    if (type === 'PERDA') {
      if (!reason.trim()) {
        toast({
          title: 'Erro',
          description: 'Motivo da perda é obrigatório.',
          variant: 'destructive',
        })
        return
      }
      extra.motivo = reason
    }

    if (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') {
      if (!selectedEmployee) {
        toast({
          title: 'Erro',
          description: 'Funcionário é obrigatório.',
          variant: 'destructive',
        })
        return
      }
      extra.funcionarioId = parseInt(selectedEmployee)
      setPersistedEmployeeId(selectedEmployee)
    }

    setSubmitting(true)
    try {
      await inventoryGeneralService.registerMovement(sessionId, type!, [
        { productId: selectedProduct.ID, quantity: qty, extra },
      ])

      toast({ title: 'Sucesso', description: 'Movimentação registrada.' })
      onSuccess()

      // Preserve dialog open for rapid continuous scanning if no preselected product
      if (!preselectedProduct) {
        setSelectedProduct(null)
        setQuantity('')
        setBarcode('')
        if (type === 'COMPRA') setCostValue('')

        setTimeout(() => {
          if (inputMode === 'barcode') {
            barcodeRef.current?.focus()
          }
        }, 100)
      } else {
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-visible">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!preselectedProduct ? (
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border shadow-sm">
              <RadioGroup
                value={inputMode}
                onValueChange={(val) =>
                  setInputMode(val as 'barcode' | 'manual')
                }
                className="flex items-center space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="barcode" id="ia-barcode" />
                  <Label htmlFor="ia-barcode" className="cursor-pointer">
                    Código de Barras (F2)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="ia-manual" />
                  <Label htmlFor="ia-manual" className="cursor-pointer">
                    Busca Manual (F2)
                  </Label>
                </div>
              </RadioGroup>

              {inputMode === 'barcode' ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-primary font-semibold">
                    <Barcode className="w-4 h-4" />
                    Scanner
                  </Label>
                  {selectedProduct ? (
                    <div className="flex items-center justify-between border rounded-md px-3 py-3 bg-primary/5 border-primary">
                      <div className="flex flex-col">
                        <span className="font-semibold text-primary text-sm truncate">
                          {selectedProduct.PRODUTO}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Cod: {selectedProduct.CODIGO} | Bar:{' '}
                          {selectedProduct['CÓDIGO BARRAS'] || '-'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedProduct(null)
                          setTimeout(() => barcodeRef.current?.focus(), 50)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      ref={barcodeRef}
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={handleBarcodeScan}
                      placeholder="Bipe o código..."
                      disabled={loading || submitting}
                      className="bg-background focus-visible:ring-primary"
                    />
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
                    disabled={loading || submitting}
                    autoFocus={true}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>
                Produto Pré-selecionado <span className="text-red-500">*</span>
              </Label>
              <ManualProductSelect
                selectedProduct={selectedProduct}
                onSelect={handleProductSelect}
                disabled={true}
              />
            </div>
          )}

          {type === 'COMPRA' && (
            <div className="space-y-2">
              <Label>
                Fornecedor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedSupplier}
                onValueChange={setSelectedSupplier}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nome_fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') && (
            <div className="space-y-2">
              <Label>
                Funcionário (Motorista/Responsável){' '}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                ref={quantityRef}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && type !== 'COMPRA') {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="0"
                disabled={submitting}
              />
            </div>

            {type === 'COMPRA' && (
              <div className="space-y-2">
                <Label>
                  Valor Custo (Unit.) <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={costValue}
                  onChange={(e) => setCostValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSubmit()
                    }
                  }}
                  placeholder="0,00"
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          {type === 'PERDA' && (
            <div className="space-y-2">
              <Label>
                Motivo da Perda <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
                disabled={submitting}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
