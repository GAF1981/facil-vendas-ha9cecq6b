import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { employeesService } from '@/services/employeesService'
import { productsService } from '@/services/productsService'
import { Employee } from '@/types/employee'
import { ProductRow } from '@/types/product'
import { Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

interface MovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    employeeId: number,
    productId: number,
    quantity: number,
  ) => Promise<void>
  type: 'REPOSICAO' | 'DEVOLUCAO'
}

export function MovementDialog({
  open,
  onOpenChange,
  onConfirm,
  type,
}: MovementDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [keepEmployee, setKeepEmployee] = useState(false)
  const { toast } = useToast()

  // Product Search State
  const [searchProduct, setSearchProduct] = useState('')
  const [foundProducts, setFoundProducts] = useState<ProductRow[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
  const [isSearchingProduct, setIsSearchingProduct] = useState(false)

  // Quantity State
  const [quantity, setQuantity] = useState<string>('')

  useEffect(() => {
    if (open) {
      const fetchEmployees = async () => {
        setLoadingEmployees(true)
        try {
          const { data } = await employeesService.getEmployees(1, 100)
          setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
        } catch (error) {
          console.error('Failed to fetch employees', error)
        } finally {
          setLoadingEmployees(false)
        }
      }
      fetchEmployees()

      // Only reset employee if not pinned
      if (!keepEmployee) {
        setSelectedEmployeeId('')
      }

      // Always reset these
      setSearchProduct('')
      setFoundProducts([])
      setSelectedProduct(null)
      setQuantity('')
    }
  }, [open, keepEmployee])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchProduct.length > 1) {
        handleSearchProduct()
      } else {
        setFoundProducts([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchProduct])

  const handleSearchProduct = async () => {
    setIsSearchingProduct(true)
    try {
      const { data } = await productsService.getProducts(1, 10, searchProduct)
      setFoundProducts(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsSearchingProduct(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedEmployeeId || !selectedProduct || !quantity) return

    setLoading(true)
    try {
      await onConfirm(
        parseInt(selectedEmployeeId),
        selectedProduct.CODIGO || selectedProduct.ID,
        parseInt(quantity),
      )

      if (keepEmployee) {
        // Reset form but keep dialog open and employee selected
        setSelectedProduct(null)
        setQuantity('')
        setSearchProduct('')
        // Toast is handled by parent, but we might want to show visual feedback here if needed
      } else {
        onOpenChange(false)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const title =
    type === 'REPOSICAO'
      ? 'Nova Reposição (Estoque → Carro)'
      : 'Nova Devolução (Carro → Estoque)'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preencha os dados para registrar a movimentação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Employee Select */}
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <div className="flex flex-col gap-2">
              {loadingEmployees ? (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />{' '}
                  Carregando...
                </div>
              ) : (
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem
                        key={employee.id}
                        value={employee.id.toString()}
                      >
                        {employee.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keep-employee"
                  checked={keepEmployee}
                  onCheckedChange={(checked) =>
                    setKeepEmployee(checked as boolean)
                  }
                />
                <Label
                  htmlFor="keep-employee"
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Fixar funcionário para o próximo lançamento
                </Label>
              </div>
            </div>
          </div>

          {/* Product Search */}
          <div className="space-y-2">
            <Label>Produto</Label>
            {!selectedProduct ? (
              <div className="relative">
                <Input
                  placeholder="Buscar produto por nome ou código..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                />
                {isSearchingProduct && (
                  <div className="absolute right-3 top-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {foundProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[200px] overflow-auto">
                    {foundProducts.map((product) => (
                      <div
                        key={product.ID}
                        className="p-2 hover:bg-muted cursor-pointer text-sm"
                        onClick={() => {
                          setSelectedProduct(product)
                          setSearchProduct('')
                          setFoundProducts([])
                        }}
                      >
                        <div className="font-medium">{product.PRODUTO}</div>
                        <div className="text-xs text-muted-foreground">
                          Cód: {product.CODIGO} | R${' '}
                          {product.PREÇO ? product.PREÇO : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                <div>
                  <div className="font-medium">{selectedProduct.PRODUTO}</div>
                  <div className="text-xs text-muted-foreground">
                    Cód: {selectedProduct.CODIGO}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProduct(null)}
                >
                  Trocar
                </Button>
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              placeholder="Digite a quantidade"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedEmployeeId || !selectedProduct || !quantity || loading
            }
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {keepEmployee ? 'Confirmar e Próximo' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
