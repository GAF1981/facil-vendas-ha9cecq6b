import * as React from 'react'
import { Check, ChevronsUpDown, Loader2, Barcode, Hash, X } from 'lucide-react'
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
import { ProductRow } from '@/types/product'
import { productsService } from '@/services/productsService'

interface ManualProductSelectProps {
  selectedProduct: ProductRow | null
  onSelect: (product: ProductRow | null) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function ManualProductSelect({
  selectedProduct,
  onSelect,
  disabled,
  autoFocus,
}: ManualProductSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      // Reset search when closing to avoid stale state next time it opens
      setSearchTerm('')
      return
    }

    const fetchProducts = async (term: string) => {
      setLoading(true)
      try {
        const { data } = await productsService.getProducts(
          1,
          30,
          term,
          null,
          null,
          'PRODUTO',
          true,
          false,
        )
        setProducts(data)
        setHasSearched(true)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(() => {
      fetchProducts(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, open])

  return (
    <div className="flex w-full items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between bg-background px-3 font-normal',
              selectedProduct ? 'border-primary bg-primary/5' : '',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            disabled={disabled}
            autoFocus={autoFocus}
          >
            {selectedProduct ? (
              <span className="truncate font-semibold text-primary">
                {selectedProduct.PRODUTO}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Selecione um produto da lista...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nome, código ou barras..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {loading && (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && hasSearched && products.length === 0 && (
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
              )}
              <CommandGroup>
                {products.map((product) => (
                  <CommandItem
                    key={product.ID}
                    value={product.ID.toString()}
                    onSelect={() => {
                      onSelect(product)
                      setOpen(false)
                    }}
                    className="flex flex-col items-start cursor-pointer py-2"
                  >
                    <div className="flex w-full justify-between items-center">
                      <span className="font-medium truncate">
                        {product.PRODUTO}
                      </span>
                      {selectedProduct?.ID === product.ID && (
                        <Check className="ml-2 h-4 w-4 text-primary" />
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
                      <span>Cod: {product.CODIGO}</span>
                      {product.PREÇO && (
                        <span className="font-semibold ml-auto">
                          R$ {product.PREÇO.replace('.', ',')}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedProduct && !disabled && (
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onSelect(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
