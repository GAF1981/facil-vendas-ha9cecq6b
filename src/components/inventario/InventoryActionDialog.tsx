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
import { Label } from '@/components/ui/label'
import { parseCurrency } from '@/lib/formatters'
import { ProductRow } from '@/types/product'
import { Supplier } from '@/types/supplier'
import { Loader2, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react'
import { productsService } from '@/services/productsService'
import { suppliersService } from '@/services/suppliersService'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Employee } from '@/types/employee'
import { employeesService } from '@/services/employeesService'

interface InventoryActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type:
    | 'COMPRA'
    | 'PERDA'
    | 'ROUBO'
    | 'OUTROS'
    | 'CARRO_PARA_ESTOQUE'
    | 'ESTOQUE_PARA_CARRO'
    | 'CONTAGEM'
    | null
  sessionId: number
  onSuccess: () => void
  persistedEmployeeId: string
  setPersistedEmployeeId: (id: string) => void
  persistedSupplierId: string
  setPersistedSupplierId: (id: string) => void
  preselectedProduct?: {
    ID: number
    CODIGO?: number | null
    PRODUTO?: string | null
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
  const { toast } = useToast()

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  )
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [quantity, setQuantity] = useState('')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  // Data Sources
  const [products, setProducts] = useState<ProductRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [productSearchOpen, setProductSearchOpen] = useState(false)

  useEffect(() => {
    if (open) {
      // Reset Form
      setQuantity('')
      setReason('')
      setValue('')
      setSelectedProductId(null)
      setSelectedProduct(null)

      if (preselectedProduct) {
        setSelectedProductId(preselectedProduct.ID)
        setSelectedProduct(preselectedProduct)
        if (preselectedProduct.PREÇO && type === 'COMPRA') {
          const selling = parseCurrency(preselectedProduct.PREÇO)
          setValue((selling * 0.3).toFixed(2))
        }
      }

      // Initialize persistent selections
      if (persistedSupplierId) setSelectedSupplierId(persistedSupplierId)
      if (persistedEmployeeId) setSelectedEmployeeId(persistedEmployeeId)

      // Fetch Data
      loadData()
    }
  }, [open, type, preselectedProduct])

  const loadData = async () => {
    try {
      // Parallel Fetch
      const promises = []
      // Always fetch products for search if not preselected
      if (!preselectedProduct) {
        promises.push(
          productsService
            .getProducts(1, 1000)
            .then((res) => setProducts(res.data)),
        )
      }

      if (type === 'COMPRA') {
        promises.push(suppliersService.getAll().then(setSuppliers))
      }

      if (
        type === 'CARRO_PARA_ESTOQUE' ||
        type === 'ESTOQUE_PARA_CARRO' ||
        type === 'PERDA' ||
        type === 'ROUBO' ||
        type === 'OUTROS'
      ) {
        // Fetch Employees for these actions if needed (Currently mainly for Carro actions)
        promises.push(
          employeesService.getEmployees(1, 100).then((res) => {
            const active = res.data.filter((e) => e.situacao === 'ATIVO')
            setEmployees(active)
          }),
        )
      }

      await Promise.all(promises)
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as listas de seleção.',
        variant: 'destructive',
      })
    }
  }

  const handleProductSelect = (product: ProductRow) => {
    setSelectedProductId(product.ID)
    setSelectedProduct(product)
    setProductSearchOpen(false)

    if (type === 'COMPRA' && product.PREÇO) {
      const selling = parseCurrency(product.PREÇO)
      setValue((selling * 0.3).toFixed(2))
    }
  }

  const handleConfirm = async () => {
    if (!sessionId || !type) return

    // Validation
    if (!selectedProductId) {
      toast({
        title: 'Produto Obrigatório',
        description: 'Selecione um produto para continuar.',
        variant: 'destructive',
      })
      return
    }

    if (type === 'COMPRA' && !selectedSupplierId) {
      toast({
        title: 'Fornecedor Obrigatório',
        description: 'Selecione um fornecedor para registrar a compra.',
        variant: 'destructive',
      })
      return
    }

    if (
      (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') &&
      !selectedEmployeeId
    ) {
      toast({
        title: 'Funcionário Obrigatório',
        description: 'Selecione um funcionário responsável.',
        variant: 'destructive',
      })
      return
    }

    const qty = Number(quantity)
    if (qty <= 0) {
      toast({
        title: 'Quantidade Inválida',
        description: 'Informe uma quantidade maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const val = parseCurrency(value)

      // Persist selections
      if (selectedSupplierId) setPersistedSupplierId(selectedSupplierId)
      if (selectedEmployeeId) setPersistedEmployeeId(selectedEmployeeId)

      await inventoryGeneralService.registerMovement(sessionId, type as any, [
        {
          productId: selectedProductId,
          quantity: qty,
          extra: {
            fornecedorId: selectedSupplierId
              ? Number(selectedSupplierId)
              : null,
            funcionarioId: selectedEmployeeId
              ? Number(selectedEmployeeId)
              : null,
            valorUnitario: val,
            motivo: reason,
          },
        },
      ])

      toast({
        title: 'Registrado com Sucesso',
        description: 'Movimentação salva.',
        className: 'bg-green-600 text-white',
      })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao Salvar',
        description: err.message || 'Falha ao registrar movimentação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (type) {
      case 'COMPRA':
        return 'Registrar Compra'
      case 'PERDA':
        return 'Registrar Perda'
      case 'ROUBO':
        return 'Registrar Roubo'
      case 'CONTAGEM':
        return 'Registrar Contagem'
      case 'CARRO_PARA_ESTOQUE':
        return 'Devolução (Carro -> Estoque)'
      case 'ESTOQUE_PARA_CARRO':
        return 'Reposição (Estoque -> Carro)'
      default:
        return 'Registrar Movimento'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Selection */}
          <div className="flex flex-col gap-2">
            <Label>
              Produto <span className="text-red-500">*</span>
            </Label>
            {preselectedProduct ? (
              <div className="p-2 border rounded-md bg-muted/20 font-medium">
                {preselectedProduct.PRODUTO}
                {preselectedProduct.CODIGO && (
                  <span className="text-muted-foreground ml-2 text-xs">
                    (Ref: {preselectedProduct.CODIGO})
                  </span>
                )}
              </div>
            ) : (
              <Popover
                open={productSearchOpen}
                onOpenChange={setProductSearchOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedProductId && selectedProduct
                      ? selectedProduct.PRODUTO
                      : 'Selecione um produto...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar produto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.ID}
                            value={`${product.PRODUTO} ${product.CODIGO || ''}`}
                            onSelect={() => handleProductSelect(product)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedProductId === product.ID
                                  ? 'opacity-100'
                                  : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{product.PRODUTO}</span>
                              <span className="text-xs text-muted-foreground">
                                Ref: {product.CODIGO || '-'} |{' '}
                                {product['CÓDIGO BARRAS'] || ''}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Supplier Selection (Only for COMPRA) */}
          {type === 'COMPRA' && (
            <div className="flex flex-col gap-2">
              <Label>
                Fornecedor <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.nome_fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedSupplierId && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Obrigatório para
                  compras.
                </p>
              )}
            </div>
          )}

          {/* Employee Selection (For Carro Movements) */}
          {(type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') && (
            <div className="flex flex-col gap-2">
              <Label>
                Funcionário <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário..." />
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

          {/* Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>

            {type === 'COMPRA' && (
              <div className="space-y-2">
                <Label>Valor Unit. (Custo)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-[10px] text-muted-foreground">
                  Sugerido: 30% do preço de venda
                </p>
              </div>
            )}
          </div>

          {/* Reason (Optional/Specific) */}
          {(type === 'PERDA' || type === 'ROUBO' || type === 'OUTROS') && (
            <div className="space-y-2">
              <Label>Motivo / Observação</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Descreva o motivo..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
