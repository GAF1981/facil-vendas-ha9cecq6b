import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Check } from 'lucide-react'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'
import { useToast } from '@/hooks/use-toast'
import { ProductSelectorTable } from './ProductSelectorTable'
import { Badge } from '@/components/ui/badge'

interface ProductSelectorProps {
  onSelect: (products: ProductRow[]) => void
}

export function ProductSelector({ onSelect }: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('todos')
  const [selectedFrequentes, setSelectedFrequentes] = useState<string>('SIM')
  const [selectedProducts, setSelectedProducts] = useState<
    Map<number, ProductRow>
  >(new Map())
  const { toast } = useToast()

  // Fetch groups on mount
  useEffect(() => {
    productsService
      .getGroups()
      .then(setGroups)
      .catch((err) => console.error('Failed to load groups', err))
  }, [])

  // Debounce search and filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        handleSearch(searchTerm)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, open, selectedGroup, selectedFrequentes])

  const handleSearch = async (term: string) => {
    setLoading(true)
    try {
      // Fetch products with optional group and frequentes filter
      const { data } = await productsService.getProducts(
        1,
        20,
        term,
        selectedGroup === 'todos' ? null : selectedGroup,
        selectedFrequentes === 'todos' ? null : selectedFrequentes,
        'PRODUTO', // Order by Name
        true, // Ascending (A-Z)
      )
      setProducts(data)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao buscar produtos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSingleSelect = (product: ProductRow) => {
    // Individual selection action: Add immediately and close
    onSelect([product])
    closeAndReset()
  }

  const handleConfirmBulk = () => {
    if (selectedProducts.size === 0) return
    onSelect(Array.from(selectedProducts.values()))
    closeAndReset()
  }

  const closeAndReset = () => {
    setOpen(false)
    setSearchTerm('')
    setProducts([])
    setSelectedProducts(new Map())
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset selection when closing modal without confirming?
      // User story says maintenance of existing behavior.
      // Usually standard is to clear selection on cancel/close.
      setSelectedProducts(new Map())
    } else {
      // Refresh search when opening
      if (searchTerm || selectedGroup !== 'todos') {
        // Keeps state
      }
    }
  }

  const handleToggleSelect = (product: ProductRow) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(product.ID)) {
      newSelected.delete(product.ID)
    } else {
      newSelected.set(product.ID, product)
    }
    setSelectedProducts(newSelected)
  }

  const handleToggleSelectAll = (currentProducts: ProductRow[]) => {
    if (currentProducts.length === 0) return

    const allSelected = currentProducts.every((p) => selectedProducts.has(p.ID))
    const newSelected = new Map(selectedProducts)

    if (allSelected) {
      // Deselect all visible
      currentProducts.forEach((p) => newSelected.delete(p.ID))
    } else {
      // Select all visible
      currentProducts.forEach((p) => newSelected.set(p.ID, p))
    }
    setSelectedProducts(newSelected)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Inserir Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Selecionar Produto</DialogTitle>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="w-full sm:w-[180px]">
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Grupos</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[150px]">
              <Select
                value={selectedFrequentes}
                onValueChange={setSelectedFrequentes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas Freq.</SelectItem>
                  <SelectItem value="SIM">Frequentes: SIM</SelectItem>
                  <SelectItem value="NÃO">Frequentes: NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou barras..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2">
          <ProductSelectorTable
            products={products}
            loading={loading}
            searchTerm={searchTerm}
            selectedIds={new Set(selectedProducts.keys())}
            onSelect={handleSingleSelect}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
          />
        </div>

        {selectedProducts.size > 0 && (
          <DialogFooter className="p-4 border-t bg-muted/20">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                <Badge variant="secondary" className="mr-2">
                  {selectedProducts.size}
                </Badge>
                produto(s) selecionado(s)
              </div>
              <Button onClick={handleConfirmBulk} className="gap-2">
                <Check className="h-4 w-4" />
                Confirmar Seleção ({selectedProducts.size})
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
