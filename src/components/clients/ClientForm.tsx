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
  const [openRoute, setOpenRoute] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { toast } = useToast()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          EMAIL: initialData.EMAIL || '',
        }
      : {
          CODIGO: 0,
          'NOME CLIENTE': '',
          'RAZÃO SOCIAL': '',
          CNPJ: '',
          IE: '',
          TIPO: 'Fisica',
          'TIPO DE CLIENTE': 'Consumidor Final',
          ENDEREÇO: '',
          BAIRRO: '',
          MUNICÍPIO: '',
          'CEP OFICIO': '',
          EMAIL: '',
          'FONE 1': '',
          'FONE 2': '',
          'CONTATO 1': '',
          'CONTATO 2': '',
          'FORMA DE PAGAMENTO': '',
          'NOTA FISCAL': 'NÃO', // Default to NÃO
          EXPOSITOR: '',
          Desconto: '',
          'DESCONTO ACESSORIO CELULAR': '',
          'DESCONTO BRINQUEDO': '',
          'DESCONTO ACESSORIO': '',
          'DESCONTO OUTROS': '',
          GRUPO: '',
          'GRUPO ROTA': '',
          'OBSERVAÇÃO FIXA': '',
          'ALTERAÇÃO CLIENTE': '',
        },
  })

  useEffect(() => {
    // Fetch unique routes
    clientsService.getRoutes().then((data) => setRoutes(data))

    if (!initialData) {
      clientsService
        .getNextCode()
        .then((nextCode) => {
          form.setValue('CODIGO', nextCode)
        })
        .catch((err) => {
          console.error('Failed to fetch next code', err)
          toast({
            title: 'Aviso',
            description:
              'Não foi possível gerar o próximo código automaticamente.',
            variant: 'destructive',
          })
        })
    }
  }, [initialData, form, toast])

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    try {
      const payload = { ...data, CODIGO: Number(data.CODIGO) }

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
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
                    <FormLabel>Tipo</FormLabel>
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
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Consumidor Final"
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
                name="CNPJ"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF / CNPJ</FormLabel>
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
                    <FormLabel>Telefone 1</FormLabel>
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
                    <FormControl>
                      <Input
                        placeholder="00000-000"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(maskCEP(e.target.value))
                        }
                      />
                    </FormControl>
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
                    <FormControl>
                      <Input
                        placeholder="Ex: 30 dias"
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
                name="EXPOSITOR"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expositor</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Info expositor"
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
                name="Desconto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto Padrão</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="%"
                        {...field}
                        value={field.value || ''}
                      />
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
                                  Criar "{searchValue}"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* New Discount Fields */}
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
  )
}
