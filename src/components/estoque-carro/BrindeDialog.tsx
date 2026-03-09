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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { brindeSchema, BrindeFormData } from '@/types/brinde'
import { brindeService } from '@/services/brindeService'
import { clientsService } from '@/services/clientsService'
import { ClientRow } from '@/types/client'
import { ProductRow } from '@/types/product'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { Loader2, Gift } from 'lucide-react'
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
import { Check, ChevronsUpDown } from 'lucide-react'
import { ProductCombobox } from '@/components/products/ProductCombobox'

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
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(
    null,
  )
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

  useEffect(() => {
    if (open) {
      setLoading(true)
      clientsService
        .getAll() // Fetch all or implement search if heavy
        .then((clientsList) => {
          setClients(clientsList)
        })
        .finally(() => setLoading(false))

      // Reset form and state
      form.reset({
        data: format(new Date(), 'yyyy-MM-dd'),
        quantidade: 1,
        funcionario_id: employee?.id || 0,
        funcionario_nome: employee?.nome_completo || '',
      })
      setSelectedProduct(null)
    }
  }, [open, employee, form])

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
      onOpenChange(false)
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
            <ProductCombobox
              selectedProduct={selectedProduct}
              onSelect={(p) => {
                setSelectedProduct(p)
                if (p) {
                  form.setValue('produto_codigo', p.CODIGO || p.ID || 0, {
                    shouldValidate: true,
                  })
                  form.setValue('produto_nome', p.PRODUTO || '', {
                    shouldValidate: true,
                  })
                } else {
                  form.setValue('produto_codigo', undefined as any, {
                    shouldValidate: true,
                  })
                  form.setValue('produto_nome', '', { shouldValidate: true })
                }
              }}
              excludeInternalCode={true}
              className="w-full"
            />
            {form.formState.errors.produto_codigo && (
              <span className="text-xs text-red-500">
                {form.formState.errors.produto_codigo.message}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data</Label>
              <Input type="date" {...form.register('data')} />
            </div>
            <div className="grid gap-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" {...form.register('quantidade')} />
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
