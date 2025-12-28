import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus } from 'lucide-react'
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'
import { useToast } from '@/hooks/use-toast'
import { ProductSelectorTable } from './ProductSelectorTable'

interface ProductSelectorProps {
  onSelect: (product: ProductRow) => void
}

export function ProductSelector({ onSelect }: ProductSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<string[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('todos')
  // Default to 'SIM' to show frequent products first
  const [selectedFrequentes, setSelectedFrequentes] = useState<string>('SIM')
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
      // Now requesting alphabetical sort by PRODUTO name
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

  const handleSelect = (product: ProductRow) => {
    onSelect(product)
    setOpen(false)
    setSearchTerm('')
    setProducts([])
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      // We keep the state of filters when reopening to provide better UX
      // But we ensure the search term is reset if needed, currently kept for continuity
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Inserir Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
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
            onSelect={handleSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
