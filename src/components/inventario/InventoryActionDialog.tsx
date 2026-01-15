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
import { ProductSelectorTable } from '@/components/acerto/ProductSelectorTable'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'
import { inventoryGeneralService } from '@/services/inventoryGeneralService'
import { employeesService } from '@/services/employeesService'
import { suppliersService } from '@/services/suppliersService'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { Search, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Employee } from '@/types/employee'
import { Supplier } from '@/types/supplier'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: string
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
  } | null
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

  // Selectors State
  const [employees, setEmployees] = useState<Employee[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Inactivity Logic
  const lastActivityRef = useRef<number>(Date.now())

  const { toast } = useToast()

  // Track activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }
    window.addEventListener('mousemove', updateActivity)
    window.addEventListener('keydown', updateActivity)
    return () => {
      window.removeEventListener('mousemove', updateActivity)
      window.removeEventListener('keydown', updateActivity)
    }
  }, [])

  // Initial Data Load
  useEffect(() => {
    if (open) {
      if (['CARRO_PARA_ESTOQUE', 'ESTOQUE_PARA_CARRO'].includes(type)) {
        employeesService
          .getEmployees(1, 100)
          .then((res) => setEmployees(res.data))
        if (persistedEmployeeId) {
          setExtraData((prev: any) => ({
            ...prev,
            funcionarioId: persistedEmployeeId,
          }))
        }
      }
      if (type === 'COMPRA') {
        suppliersService.getAll().then(setSuppliers)
        if (persistedSupplierId) {
          setExtraData((prev: any) => ({
            ...prev,
            fornecedorId: persistedSupplierId,
          }))
        }
      }

      // Handle Preselection
      if (preselectedProduct) {
        setSelectedProduct(preselectedProduct as ProductRow)
        setStep(2)
        setQuantity('')
      } else {
        setStep(1)
        setSearchTerm('')
        setProducts([])
        setSelectedProduct(null)
      }
    }
  }, [open, type, persistedEmployeeId, persistedSupplierId, preselectedProduct])

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
  }

  const handleSave = async () => {
    if (!selectedProduct || !quantity) return

    // Inactivity Check (30 mins = 1800000 ms)
    const inactivityTime = Date.now() - lastActivityRef.current
    if (inactivityTime > 1800000) {
      const fieldName = type === 'COMPRA' ? 'fornecedor' : 'funcionário'
      const confirmed = confirm(
        `A tela ficou 30 minutos INATIVA, favor conferir o nome do ${fieldName}!!!`,
      )

      setPersistedEmployeeId('')
      setPersistedSupplierId('')
      setExtraData((prev: any) => ({
        ...prev,
        funcionarioId: undefined,
        fornecedorId: undefined,
      }))

      if (!confirmed) {
        lastActivityRef.current = Date.now()
        return
      }
      lastActivityRef.current = Date.now()
    }

    // Validation
    if (['CARRO_PARA_ESTOQUE', 'ESTOQUE_PARA_CARRO'].includes(type)) {
      if (!extraData.funcionarioId) {
        toast({ title: 'Selecione um Funcionário', variant: 'destructive' })
        return
      }
    }
    if (type === 'COMPRA' && !extraData.fornecedorId) {
      toast({ title: 'Selecione um Fornecedor', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      await inventoryGeneralService.registerMovement(sessionId, type as any, [
        {
          productId: selectedProduct.ID,
          quantity: parseFloat(quantity),
          extra: extraData,
        },
      ])

      if (extraData.funcionarioId)
        setPersistedEmployeeId(extraData.funcionarioId)
      if (extraData.fornecedorId) setPersistedSupplierId(extraData.fornecedorId)

      toast({
        title:
          type === 'CONTAGEM'
            ? 'Contagem Salva'
            : type === 'COMPRA'
              ? 'Compra Registrada'
              : 'Movimento Salvo',
        description:
          type === 'CONTAGEM'
            ? `Quantidade do produto ${selectedProduct.PRODUTO} atualizada.`
            : undefined,
        className: 'bg-green-600 text-white',
      })
      onSuccess()

      if (preselectedProduct) {
        onOpenChange(false)
      } else {
        setStep(1)
        setQuantity('')
        setSelectedProduct(null)
        // Keep persisted IDs in extraData
        const keptData: any = {}
        if (extraData.funcionarioId)
          keptData.funcionarioId = extraData.funcionarioId
        if (extraData.fornecedorId)
          keptData.fornecedorId = extraData.fornecedorId
        setExtraData(keptData)
      }
    } catch (e: any) {
      console.error(e)
      toast({
        title: 'Erro ao Salvar',
        description:
          e.message || 'Ocorreu um erro ao tentar salvar o movimento.',
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
              />
            </div>

            {['CARRO_PARA_ESTOQUE', 'ESTOQUE_PARA_CARRO'].includes(type) && (
              <div className="grid gap-2">
                <Label>Funcionário *</Label>
                <Select
                  value={extraData.funcionarioId?.toString()}
                  onValueChange={(val) =>
                    setExtraData({ ...extraData, funcionarioId: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'COMPRA' && (
              <>
                <div className="grid gap-2">
                  <Label>Fornecedor *</Label>
                  <Select
                    value={extraData.fornecedorId?.toString()}
                    onValueChange={(val) =>
                      setExtraData({ ...extraData, fornecedorId: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id.toString()}>
                          {sup.nome_fornecedor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </>
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
              <Button
                variant="outline"
                onClick={() => {
                  if (preselectedProduct) onOpenChange(false)
                  else setStep(1)
                }}
                disabled={loading}
              >
                {preselectedProduct ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
