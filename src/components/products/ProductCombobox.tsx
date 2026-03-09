import * as React from 'react'
import { Loader2, Barcode, Hash, Search, X } from 'lucide-react'
import { Command as CommandPrimitive } from 'cmdk'

import { cn } from '@/lib/utils'
import { productsService } from '@/services/productsService'
import { ProductRow } from '@/types/product'

interface ProductComboboxProps {
  selectedProduct: ProductRow | null
  onSelect: (product: ProductRow | null) => void
  disabled?: boolean
  className?: string
  excludeInternalCode?: boolean
  autoFocus?: boolean
}

export function ProductCombobox({
  selectedProduct,
  onSelect,
  disabled,
  className,
  excludeInternalCode = false,
  autoFocus = false,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [products, setProducts] = React.useState<ProductRow[]>([])
  const [loading, setLoading] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const lastKeyTime = React.useRef(Date.now())
  const keyPressCount = React.useRef(0)
  const previousTermLength = React.useRef(0)
  const isNavigating = React.useRef(false)

  // Sync selected product to input display
  React.useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(selectedProduct.PRODUTO || '')
      setOpen(false)
    } else {
      setSearchTerm('')
    }
  }, [selectedProduct])

  // Handle autoFocus explicitly, specially useful for rapid consecutive scanning
  React.useEffect(() => {
    if (autoFocus && !disabled && !selectedProduct) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus, disabled, selectedProduct])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced Search for manual typing
  React.useEffect(() => {
    // If we already selected something, no need to search
    if (selectedProduct && searchTerm === selectedProduct.PRODUTO) return

    if (!searchTerm) {
      setProducts([])
      setOpen(false)
      return
    }

    const timer = setTimeout(() => {
      fetchProducts(searchTerm)
    }, 400)

    return () => clearTimeout(timer)
  }, [searchTerm, selectedProduct])

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
      setOpen(true)
    } catch (error) {
      console.error('Failed to search products', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (product: ProductRow) => {
    onSelect(product)
    setOpen(false)
    keyPressCount.current = 0
    isNavigating.current = false
  }

  const handleClear = () => {
    onSelect(null)
    setSearchTerm('')
    setProducts([])
    keyPressCount.current = 0
    isNavigating.current = false
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  // Priority Matching for Barcode Scanners (Detect Enter & Speed)
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If a product is already selected, let normal key events bubble up
    if (selectedProduct) {
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      isNavigating.current = true
      return
    }

    const now = Date.now()
    const diff = now - lastKeyTime.current

    // A scanner usually sends keystrokes < 30ms apart
    if (diff < 50 && e.key !== 'Enter') {
      keyPressCount.current += 1
    } else if (diff > 200 && e.key !== 'Enter') {
      keyPressCount.current = 0
    }

    lastKeyTime.current = now

    if (e.key === 'Enter') {
      e.preventDefault() // Always prevent form submission on Enter in search box

      const term = searchTerm.trim()
      if (!term) return

      // If user has actively navigated the list with arrows, let cmdk handle the Enter key
      if (isNavigating.current) {
        return
      }

      // Consider it a fast scan if typed fast OR pasted (length jump handled in onChange)
      const isFastScan = keyPressCount.current >= 3

      const exactMatchInState = products.find(
        (p) =>
          p['CÓDIGO BARRAS'] === term ||
          (!excludeInternalCode && p.codigo_interno === term) ||
          p.CODIGO?.toString() === term,
      )

      // Only intercept if we know it's a scanner OR we have an exact code match WITHOUT user navigating
      if (isFastScan || exactMatchInState) {
        e.stopPropagation() // Prevent cmdk from selecting highlighted item incorrectly

        if (exactMatchInState) {
          handleSelect(exactMatchInState)
          return
        }

        // Force a direct DB query to ensure priority matching for fast scans
        setLoading(true)
        try {
          const { data } = await productsService.getProducts(
            1,
            5,
            term,
            null,
            null,
            'PRODUTO',
            true,
            excludeInternalCode,
          )

          const exactMatch = data.find(
            (p) =>
              p['CÓDIGO BARRAS'] === term ||
              (!excludeInternalCode && p.codigo_interno === term) ||
              p.CODIGO?.toString() === term,
          )

          if (exactMatch) {
            handleSelect(exactMatch)
          } else if (data.length === 1) {
            handleSelect(data[0])
          } else {
            setProducts(data)
            setOpen(true)
          }
        } catch (err) {
          console.error(err)
        } finally {
          setLoading(false)
          keyPressCount.current = 0
        }
      } else {
        // Let normal Enter event through so cmdk can select the actively highlighted item
        keyPressCount.current = 0
      }
    }
  }

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      <CommandPrimitive
        shouldFilter={false}
        className="overflow-visible bg-transparent"
      >
        <div
          className={cn(
            'flex items-center border rounded-md px-3 bg-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            disabled && 'opacity-50 cursor-not-allowed',
            selectedProduct && 'border-primary bg-primary/5',
          )}
        >
          <Search
            className={cn(
              'mr-2 h-4 w-4 shrink-0',
              selectedProduct ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <CommandPrimitive.Input
            ref={inputRef}
            value={searchTerm}
            onValueChange={(val) => {
              isNavigating.current = false // Reset navigation state when typing
              // Detect sudden jumps in length (Pasting barcode)
              const lengthDiff = Math.abs(
                val.length - previousTermLength.current,
              )
              if (lengthDiff > 4) {
                keyPressCount.current += lengthDiff
              }
              previousTermLength.current = val.length

              setSearchTerm(val)
              if (selectedProduct) {
                onSelect(null)
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              isNavigating.current = false
              if (searchTerm && !selectedProduct && products.length > 0) {
                setOpen(true)
              }
            }}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              selectedProduct && 'font-semibold text-primary',
            )}
            placeholder={
              excludeInternalCode
                ? 'Buscar por nome ou código de barras...'
                : 'Buscar por nome, código interno ou barras...'
            }
          />
          {selectedProduct && !disabled ? (
            <X
              className="ml-2 h-4 w-4 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            />
          ) : loading && !selectedProduct ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {open && products.length > 0 && !selectedProduct && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <CommandPrimitive.List className="max-h-[300px] overflow-y-auto p-1">
              <CommandPrimitive.Group>
                {products.map((product) => (
                  <CommandPrimitive.Item
                    key={product.ID}
                    value={product.ID.toString()}
                    onSelect={() => handleSelect(product)}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            </CommandPrimitive.List>
          </div>
        )}
      </CommandPrimitive>
    </div>
  )
}
