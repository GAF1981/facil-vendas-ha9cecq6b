import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClientFormData, clientSchema, ClientRow } from '@/types/client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ChevronsUpDown, Check } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { maskCPF, maskCNPJ, maskPhone, maskCEP, unmask } from '@/lib/masks'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'
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
import { cn } from '@/lib/utils'
import { NewRouteDialog } from './NewRouteDialog'
import { DuplicateClientDialog } from './DuplicateClientDialog'

interface ClientFormProps {
  initialData?: ClientRow
  onSuccess?: () => void
  onCancel?: () => void
}

export function ClientForm({
  initialData,
  onSuccess,
  onCancel,
}: ClientFormProps) {
  const [loading, setLoading] = useState(false)
  const [routes, setRoutes] = useState<string[]>([])
  const [clientTypes, setClientTypes] = useState<string[]>([])
  const [openRoute, setOpenRoute] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchingCep, setSearchingCep] = useState(false)

  // Duplicate check
  const [duplicateClient, setDuplicateClient] = useState<any>(null)

  const { toast } = useToast()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          EMAIL: initialData.EMAIL || '',
          // Ensure discount is just the number string for editing
          Desconto: initialData.Desconto
            ? initialData.Desconto.replace('%', '')
            : '30',
        }
      : {
          CODIGO: 0,
          'NOME CLIENTE': '',
          'RAZÃO SOCIAL': '',
          CNPJ: '',
          IE: '',
          TIPO: 'Fisica',
          'TIPO DE CLIENTE': 'ATIVO',
          ENDEREÇO: '',
          BAIRRO: '',
          MUNICÍPIO: '',
          'CEP OFICIO': '',
          EMAIL: '',
          'FONE 1': '',
          'FONE 2': '',
          'CONTATO 1': '',
          'CONTATO 2': '',
          'FORMA DE PAGAMENTO': 'BOLETO', // Default
          'NOTA FISCAL': 'NÃO',
          EXPOSITOR: 'OUTROS', // Default
          Desconto: '30', // Default without % for the input
          'DESCONTO ACESSORIO CELULAR': '',
          'DESCONTO BRINQUEDO': '',
          'DESCONTO ACESSORIO': '',
          'DESCONTO OUTROS': '',
          GRUPO: '',
          'GRUPO ROTA': '',
          'OBSERVAÇÃO FIXA': '',
          'ALTERAÇÃO CLIENTE': '',
        },
    mode: 'onChange', // Enable real-time validation
  })

  useEffect(() => {
    clientsService.getRoutes().then((data) => setRoutes(data))
    clientsService.getUniqueClientTypes().then((data) => {
      // Ensure "ATIVO" and "INATIVO - ROTA" are always available options
      const defaultTypes = ['ATIVO', 'INATIVO - ROTA']
      const mergedTypes = Array.from(new Set([...defaultTypes, ...data]))
      setClientTypes(mergedTypes)
    })

    if (!initialData) {
      clientsService
        .getNextCode()
        .then((nextCode) => {
          form.setValue('CODIGO', nextCode)
        })
        .catch((err) => {
          console.error('Failed to fetch next code', err)
        })
    }
  }, [initialData, form])

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value
    if (unmask(cep).length === 8) {
      setSearchingCep(true)
      const addressData = await clientsService.getAddressByCep(cep)
      setSearchingCep(false)

      if (addressData) {
        form.setValue('ENDEREÇO', addressData.logradouro)
        form.setValue('BAIRRO', addressData.bairro)
        form.setValue('MUNICÍPIO', addressData.municipio)
        toast({
          title: 'Endereço encontrado',
          description: 'Os campos de endereço foram preenchidos.',
        })
      } else {
        toast({
          title: 'CEP não encontrado',
          description: 'Verifique o CEP digitado.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleCpfBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return

    try {
      const duplicate = await clientsService.checkDuplicateCpfCnpj(
        val,
        initialData?.CODIGO,
      )
      if (duplicate) {
        setDuplicateClient(duplicate)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    try {
      // Append % to discount before saving if not present
      const discountVal = data.Desconto
        ? data.Desconto.includes('%')
          ? data.Desconto
          : `${data.Desconto}%`
        : null

      const payload = {
        ...data,
        CODIGO: Number(data.CODIGO),
        Desconto: discountVal,
      }

      if (initialData) {
        await clientsService.update(initialData.CODIGO, payload)
        toast({
          title: 'Cliente atualizado',
          description: 'Os dados foram salvos com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      } else {
        await clientsService.create(payload)
        toast({
          title: 'Cliente cadastrado',
          description: 'Novo cliente adicionado com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      }
      onSuccess?.()
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Identificação</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="CODIGO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Automático"
                          {...field}
                          disabled={!!initialData}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="TIPO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Pessoa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'Fisica'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Fisica">Pessoa Física</SelectItem>
                          <SelectItem value="Juridica">
                            Pessoa Jurídica
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="TIPO DE CLIENTE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cliente *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'ATIVO'}
                        value={field.value || 'ATIVO'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="CNPJ"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF / CNPJ *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const v = e.target.value
                            if (unmask(v).length > 11) {
                              field.onChange(maskCNPJ(v))
                            } else {
                              field.onChange(maskCPF(v))
                            }
                          }}
                          onBlur={handleCpfBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="NOME CLIENTE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome Completo"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="RAZÃO SOCIAL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Razão Social"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="IE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inscrição Estadual</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="IE"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contato</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="EMAIL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="cliente@email.com"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="FONE 1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone 1 *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 0000-0000"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(maskPhone(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="FONE 2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 0000-0000"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(maskPhone(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="CONTATO 1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato 1</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome contato"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="CONTATO 2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato 2</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome contato"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Endereço</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="CEP OFICIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="00000-000"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) =>
                              field.onChange(maskCEP(e.target.value))
                            }
                            onBlur={handleCepBlur}
                          />
                        </FormControl>
                        {searchingCep && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-5">
                <FormField
                  control={form.control}
                  name="ENDEREÇO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, Número, Comp."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="BAIRRO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bairro"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="MUNICÍPIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Município - UF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cidade - UF"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Comercial / Financeiro */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Comercial</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="FORMA DE PAGAMENTO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'BOLETO'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BOLETO">BOLETO</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="EXPOSITOR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expositor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'OUTROS'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MADEIRA 46 CM">
                            MADEIRA 46 CM
                          </SelectItem>
                          <SelectItem value="MADEIRA 66 CM">
                            MADEIRA 66 CM
                          </SelectItem>
                          <SelectItem value="FERRO">FERRO</SelectItem>
                          <SelectItem value="PAREDE">PAREDE</SelectItem>
                          <SelectItem value="SEM EXPOSITOR">
                            SEM EXPOSITOR
                          </SelectItem>
                          <SelectItem value="OUTROS">OUTROS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="Desconto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto Padrão (30% - 50%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="30"
                            type="number"
                            min="30"
                            max="50"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              // Ensure only numbers are entered and update
                              const val = e.target.value
                              field.onChange(val)
                            }}
                            className={cn(
                              'pr-8',
                              form.formState.errors.Desconto &&
                                'border-destructive focus-visible:ring-destructive',
                            )}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none select-none">
                            %
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Classification Fields */}
              <div className="md:col-span-6">
                <FormField
                  control={form.control}
                  name="GRUPO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Grupo de clientes"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-6">
                <FormField
                  control={form.control}
                  name="GRUPO ROTA"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Rota / Grupo Rota</FormLabel>
                      <Popover open={openRoute} onOpenChange={setOpenRoute}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openRoute}
                              className={cn(
                                'w-full justify-between',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              {field.value || 'Selecione ou crie uma rota'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Buscar rota..."
                              onValueChange={setSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <div className="p-2">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Nenhuma rota encontrada.
                                  </p>
                                  <Button
                                    variant="secondary"
                                    className="w-full justify-start"
                                    onClick={() => {
                                      field.onChange(searchValue)
                                      setOpenRoute(false)
                                    }}
                                  >
                                    Usar "{searchValue}"
                                  </Button>
                                </div>
                              </CommandEmpty>
                              <CommandGroup heading="Rotas Existentes">
                                {routes.map((rota) => (
                                  <CommandItem
                                    key={rota}
                                    value={rota}
                                    onSelect={(currentValue) => {
                                      field.onChange(currentValue)
                                      setOpenRoute(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        field.value === rota
                                          ? 'opacity-100'
                                          : 'opacity-0',
                                      )}
                                    />
                                    {rota}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <NewRouteDialog
                        onSuccess={() =>
                          clientsService.getRoutes().then(setRoutes)
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Disabled Discount Fields */}
              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="DESCONTO ACESSORIO CELULAR"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto Acessório Celular</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="%"
                          {...field}
                          value={field.value || ''}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="DESCONTO BRINQUEDO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto Brinquedo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="%"
                          {...field}
                          value={field.value || ''}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="DESCONTO ACESSORIO"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto Acessório</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="%"
                          {...field}
                          value={field.value || ''}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-3">
                <FormField
                  control={form.control}
                  name="DESCONTO OUTROS"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto Outros</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="%"
                          {...field}
                          value={field.value || ''}
                          readOnly
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Observações</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <FormField
                  control={form.control}
                  name="NOTA FISCAL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Informação sobre a emissão de nota fiscal
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || 'NÃO'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SIM">SIM</SelectItem>
                          <SelectItem value="NÃO">NÃO</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-6">
                <FormField
                  control={form.control}
                  name="OBSERVAÇÃO FIXA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Gerais</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Anotações internas"
                          className="resize-none h-20"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="md:col-span-12">
                <FormField
                  control={form.control}
                  name="ALTERAÇÃO CLIENTE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Histórico de Alterações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Registro de alterações"
                          className="resize-none h-20"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </Form>

      <DuplicateClientDialog
        open={!!duplicateClient}
        onOpenChange={() => setDuplicateClient(null)}
        existingClient={duplicateClient}
      />
    </>
  )
}
