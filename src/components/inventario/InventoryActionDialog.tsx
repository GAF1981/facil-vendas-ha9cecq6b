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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { formatCurrency, parseCurrency } from '@/lib/formatters'
import { productsService } from '@/services/productsService'
import { suppliersService, Supplier } from '@/services/suppliersService'
import { employeesService } from '@/services/employeesService'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { ProductRow } from '@/types/product'
import { Employee } from '@/types/employee'
import { InventoryMovementType } from '@/types/inventory_general'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

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

  // Data Sources
  const [products, setProducts] = useState<ProductRow[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Form State
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [costValue, setCostValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  // Title Mapping
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

  useEffect(() => {
    if (open) {
      setLoading(true)
      const promises = []

      // 1. Load Products (if not preselected to save bandwidth)
      if (preselectedProduct) {
        setProducts([preselectedProduct as ProductRow])
        setSelectedProduct(preselectedProduct.ID.toString())
      } else {
        promises.push(
          productsService.getProducts(1, 10000).then(({ data }) => {
            setProducts(data || [])
          }),
        )
      }

      // 2. Load Suppliers (Only for Purchase)
      if (type === 'COMPRA') {
        promises.push(suppliersService.getAll().then(setSuppliers))
      }

      // 3. Load Employees (Only for Stock Transfers)
      if (type === 'CARRO_PARA_ESTOQUE' || type === 'ESTOQUE_PARA_CARRO') {
        promises.push(
          employeesService.getEmployees(1, 1000).then(({ data }) => {
            // Filter by Role/Sector as per User Story
            const allowedSectors = ['gerente', 'estoque', 'administrador']
            const filtered = data.filter((e) =>
              e.setor?.some((s) => allowedSectors.includes(s.toLowerCase())),
            )
            setEmployees(filtered)
          }),
        )
      }

      Promise.all(promises).finally(() => setLoading(false))

      // Reset Form (Preserving persisted values)
      if (!preselectedProduct) setSelectedProduct('')
      setQuantity('')
      setCostValue('')
      setReason('')

      // Restore persisted values
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

  const handleProductChange = (prodId: string) => {
    setSelectedProduct(prodId)

    // Auto-calculate cost for purchases: 30% of Sale Price
    if (type === 'COMPRA' && prodId) {
      const prod = products.find((p) => p.ID.toString() === prodId)
      if (prod && prod.PREÇO) {
        const salePrice = parseCurrency(prod.PREÇO)
        const calculatedCost = salePrice * 0.3
        setCostValue(formatCurrency(calculatedCost))
      }
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct) {
      toast({
        title: 'Erro',
        description: 'Selecione um produto.',
        variant: 'destructive',
      })
      return
    }

    // For CONTAGEM, quantity can be 0. For others, must be > 0.
    const qty = Number(quantity)
    if (type !== 'CONTAGEM' && (!quantity || qty <= 0)) {
      toast({
        title: 'Erro',
        description: 'Informe uma quantidade válida (maior que zero).',
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
          description: 'Fornecedor é obrigatório para compras.',
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

      // Persist Supplier
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
          description: 'Funcionário é obrigatório para esta movimentação.',
          variant: 'destructive',
        })
        return
      }
      extra.funcionarioId = parseInt(selectedEmployee)

      // Persist Employee
      setPersistedEmployeeId(selectedEmployee)
    }

    setSubmitting(true)
    try {
      await inventoryGeneralService.registerMovement(sessionId, type!, [
        {
          productId: parseInt(selectedProduct),
          quantity: qty,
          extra,
        },
      ])

      toast({ title: 'Sucesso', description: 'Movimentação registrada.' })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao salvar movimentação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label>
              Produto <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedProduct}
              onValueChange={handleProductChange}
              disabled={loading || submitting || !!preselectedProduct}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loading ? 'Carregando...' : 'Selecione o produto'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.ID} value={p.ID.toString()}>
                    {p.PRODUTO} {p.CODIGO ? `(Cod: ${p.CODIGO})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Specific Fields - BEFORE Quantity */}
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
              <p className="text-[10px] text-muted-foreground">
                Exibindo apenas Gerentes, Estoque e Administradores.
              </p>
            </div>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                disabled={submitting}
                autoFocus={!!preselectedProduct}
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
                placeholder="Descreva o motivo (ex: validade, avaria...)"
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
