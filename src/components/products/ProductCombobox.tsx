import * as React from 'react'
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Barcode,
  Box,
  Hash,
  Search,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { productsService } from '@/services/productsService'
import { ProductRow } from '@/types/product'

interface ProductComboboxProps {
  selectedProduct: ProductRow | null
  onSelect: (product: ProductRow | null) => void
  disabled?: boolean
  className?: string
  excludeInternalCode?: boolean
}

export function ProductCombobox({
  selectedProduct,
  onSelect,
  disabled,
  className,
  excludeInternalCode = false,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading] = React.useState(false)

  // Use debouncing to avoid too many requests while typing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchTerm)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchProducts = async (term: string) => {
    setLoading(true)
    try {
      const { data } = await productsService.getProducts(
        1,
        20,
        term,
        null,
        null,
        'PRODUTO',
        true,
        excludeInternalCode,
      )
      setProducts(data)
    } catch (error) {
      console.error('Failed to search products', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen && products.length === 0 && !searchTerm) {
      fetchProducts('')
    }
  }

  const handleSelect = (product: ProductRow) => {
    onSelect(product)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            !selectedProduct && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          {selectedProduct ? (
            <span className="truncate flex items-center gap-2">
              <Box className="h-4 w-4 opacity-50 shrink-0" />
              <span className="truncate">{selectedProduct.PRODUTO}</span>
              {selectedProduct.codigo_interno ? (
                <span className="text-xs text-muted-foreground ml-1">
                  (CI: {selectedProduct.codigo_interno})
                </span>
              ) : selectedProduct['CÓDIGO BARRAS'] ? (
                <span className="text-xs text-muted-foreground ml-1">
                  (EAN: {selectedProduct['CÓDIGO BARRAS']})
                </span>
              ) : null}
            </span>
          ) : (
            'Selecione ou busque um produto...'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={
              excludeInternalCode
                ? 'Buscar por nome ou código de barras...'
                : 'Buscar por nome, código interno ou barras...'
            }
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="h-10"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </div>
            ) : (
              <>
                {products.length === 0 && (
                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                )}
                <CommandGroup>
                  {products.map((product) => (
                    <CommandItem
                      key={product.ID}
                      value={product.ID.toString()}
                      onSelect={() => handleSelect(product)}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex flex-col overflow-hidden w-full">
                        <div className="flex justify-between items-center w-full">
                          <span className="truncate font-medium">
                            {product.PRODUTO}
                          </span>
                          {product.PREÇO && (
                            <span className="text-xs font-semibold ml-2 shrink-0">
                              R$ {product.PREÇO.replace('.', ',')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-3 mt-1 flex-wrap">
                          {product['CÓDIGO BARRAS'] && (
                            <span className="flex items-center text-blue-600 dark:text-blue-400">
                              <Barcode className="h-3 w-3 mr-1" />
                              {product['CÓDIGO BARRAS']}
                            </span>
                          )}
                          {product.codigo_interno && (
                            <span className="flex items-center text-orange-600 dark:text-orange-400">
                              <Hash className="h-3 w-3 mr-1" />
                              CI: {product.codigo_interno}
                            </span>
                          )}
                          {product.ID && <span>ID: {product.ID}</span>}
                        </div>
                      </div>
                      {selectedProduct?.ID === product.ID && (
                        <Check className="ml-2 h-4 w-4 opacity-100 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
