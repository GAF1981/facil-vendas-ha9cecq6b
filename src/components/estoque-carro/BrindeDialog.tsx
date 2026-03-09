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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brindeSchema, BrindeFormData } from '@/types/brinde'
import { brindeService } from '@/services/brindeService'
import { clientsService } from '@/services/clientsService'
import { productsService } from '@/services/productsService'
import { ClientRow } from '@/types/client'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  Loader2,
  Gift,
  Check,
  ChevronsUpDown,
  Barcode,
  Search,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { ProductCombobox } from '@/components/products/ProductCombobox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  onSuccess: () => void
}

export function BrindeDialog({
  open,
  onOpenChange,
  sessionId,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [clientOpen, setClientOpen] = useState(false)

  const [inputMode, setInputMode] = useState<'barcode' | 'manual'>('barcode')
  const [barcode, setBarcode] = useState('')
  const barcodeRef = useRef<HTMLInputElement | null>(null)

  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )

  const quantityRef = useRef<HTMLInputElement | null>(null)

  const { toast } = useToast()
  const { employee } = useUserStore()

  const form = useForm<BrindeFormData>({
    resolver: zodResolver(brindeSchema),
    defaultValues: {
      data: format(new Date(), 'yyyy-MM-dd'),
      quantidade: 1,
      funcionario_id: employee?.id || 0,
      funcionario_nome: employee?.nome_completo || '',
    },
  })

  const { ref: qtyRegisterRef, ...qtyRest } = form.register('quantidade')

  useEffect(() => {
    if (open) {
      setLoading(true)
      clientsService
        .getAll()
        .then((clientsList) => {
          setClients(clientsList)
        })
        .finally(() => setLoading(false))

      form.reset({
        data: format(new Date(), 'yyyy-MM-dd'),
        quantidade: 1,
        funcionario_id: employee?.id || 0,
        funcionario_nome: employee?.nome_completo || '',
      })
      setSelectedProduct(null)
      setBarcode('')
      setInputMode('barcode')
    }
  }, [open, employee, form])

  useEffect(() => {
    if (open) {
      if (inputMode === 'barcode') {
        setTimeout(() => barcodeRef.current?.focus(), 50)
      } else {
        setTimeout(
          () => document.getElementById('brinde-manual-input')?.focus(),
          50,
        )
      }
    }
  }, [inputMode, open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        setInputMode((prev) => (prev === 'barcode' ? 'manual' : 'barcode'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

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
          setBarcode('')
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

  const handleProductSelect = (p: ProductRow | null) => {
    setSelectedProduct(p)
    if (p) {
      form.setValue('produto_codigo', p.CODIGO || p.ID || 0, {
        shouldValidate: true,
      })
      form.setValue('produto_nome', p.PRODUTO || '', {
        shouldValidate: true,
      })
      setTimeout(() => quantityRef.current?.focus(), 50)
    } else {
      form.setValue('produto_codigo', undefined as any, {
        shouldValidate: true,
      })
      form.setValue('produto_nome', '', { shouldValidate: true })
    }
  }

  const onSubmit = async (data: BrindeFormData) => {
    if (!sessionId) {
      toast({
        title: 'Erro',
        description: 'Sessão de estoque não encontrada.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await brindeService.create(data, sessionId)
      toast({
        title: 'Brinde Registrado',
        description: 'A saída do estoque foi contabilizada com sucesso.',
        className: 'bg-green-600 text-white',
      })
      onSuccess()

      setSelectedProduct(null)
      form.setValue('produto_codigo', undefined as any)
      form.setValue('produto_nome', '')
      form.setValue('quantidade', 1)
      setBarcode('')
      setTimeout(() => {
        if (inputMode === 'barcode') {
          barcodeRef.current?.focus()
        } else {
          document.getElementById('brinde-manual-input')?.focus()
        }
      }, 100)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao registrar brinde.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Registrar Brinde
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-2">
            <Label>Cliente</Label>
            <Popover open={clientOpen} onOpenChange={setClientOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientOpen}
                  className="w-full justify-between"
                  disabled={loading}
                >
                  {form.watch('cliente_nome')
                    ? form.watch('cliente_nome')
                    : 'Selecione o cliente...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandList>
                    <CommandEmpty>Cliente não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {clients.map((client) => (
                        <CommandItem
                          key={client.CODIGO}
                          value={client['NOME CLIENTE'] + ' ' + client.CODIGO}
                          onSelect={() => {
                            form.setValue('cliente_codigo', client.CODIGO)
                            form.setValue(
                              'cliente_nome',
                              client['NOME CLIENTE'],
                            )
                            setClientOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              form.watch('cliente_codigo') === client.CODIGO
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          {client['NOME CLIENTE']}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.cliente_codigo && (
              <span className="text-xs text-red-500">
                {form.formState.errors.cliente_codigo.message}
              </span>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Produto</Label>
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border border-border shadow-sm">
              <RadioGroup
                value={inputMode}
                onValueChange={(val) =>
                  setInputMode(val as 'barcode' | 'manual')
                }
                className="flex items-center space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="barcode" id="bd-barcode" />
                  <Label htmlFor="bd-barcode" className="cursor-pointer">
                    Código de Barras (F2)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="bd-manual" />
                  <Label htmlFor="bd-manual" className="cursor-pointer">
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
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleProductSelect(null)
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
                      className="bg-background focus-visible:ring-primary"
                      disabled={loading}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <Search className="w-4 h-4" />
                    Busca Manual
                  </Label>
                  <ProductCombobox
                    inputId="brinde-manual-input"
                    selectedProduct={selectedProduct}
                    onSelect={handleProductSelect}
                    excludeInternalCode={true}
                    className="w-full"
                    autoFocus={true}
                    disableScanner={true}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
            {form.formState.errors.produto_codigo && (
              <span className="text-xs text-red-500">
                {form.formState.errors.produto_codigo.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data</Label>
              <Input
                type="date"
                {...form.register('data')}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                {...qtyRest}
                ref={(e) => {
                  qtyRegisterRef(e)
                  quantityRef.current = e
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Funcionário (Auto)</Label>
            <Input
              value={form.watch('funcionario_nome')}
              disabled
              className="bg-muted text-muted-foreground"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
