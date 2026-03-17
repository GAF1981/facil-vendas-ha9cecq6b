import { useState, useEffect, useRef } from 'react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Loader2,
  ChevronsUpDown,
  Check,
  Plus,
  MapPin,
  ArrowRight,
  Globe,
} from 'lucide-react'
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
import { cobrancaService } from '@/services/cobrancaService'
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
import { DuplicateWarningDialog } from './DuplicateWarningDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

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
  const [groups, setGroups] = useState<string[]>([])
  const [openRoute, setOpenRoute] = useState(false)
  const [openGroup, setOpenGroup] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchGroupValue, setSearchGroupValue] = useState('')
  const [searchingCep, setSearchingCep] = useState(false)
  const [newGroupOpen, setNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [capturingLocation, setCapturingLocation] = useState(false)
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Address helper state
  const [addressNumber, setAddressNumber] = useState('')
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false)

  // Duplicate check
  const [duplicateWarning, setDuplicateWarning] = useState<{
    open: boolean
    data: { name: string; debt?: number } | null
    resolve: (proceed: boolean) => void
  } | null>(null)

  const { toast } = useToast()

  const hasAutoGeocoded = useRef(false)
  const autoGeocode =
    new URLSearchParams(window.location.search).get('autoGeocode') === 'true'

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          EMAIL: initialData.EMAIL || '',
          Desconto: initialData.Desconto
            ? initialData.Desconto.replace('%', '')
            : '30',
          telefone_cobranca:
            initialData.telefone_cobranca || initialData['FONE 1'],
          email_cobranca: initialData.email_cobranca || initialData.EMAIL,
          tipo_venda: (initialData.tipo_venda as any) || 'consignado',
          latitude:
            initialData.latitude != null ? String(initialData.latitude) : '',
          longitude:
            initialData.longitude != null ? String(initialData.longitude) : '',
          favorito: initialData.favorito || false,
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
          'FORMA DE PAGAMENTO': 'BOLETO',
          'NOTA FISCAL': 'NÃO',
          EXPOSITOR: 'expositor de 46 cm', // Updated Default Value
          Desconto: '30',
          'DESCONTO ACESSORIO CELULAR': '',
          'DESCONTO BRINQUEDO': '',
          'DESCONTO ACESSORIO': '',
          'DESCONTO OUTROS': '',
          GRUPO: '',
          'GRUPO ROTA': '',
          'OBSERVAÇÃO FIXA': '',
          'ALTERAÇÃO CLIENTE': '',
          telefone_cobranca: '',
          email_cobranca: '',
          tipo_venda: 'consignado',
          latitude: '',
          longitude: '',
          favorito: false,
        },
    mode: 'onChange',
  })

  // Watch fields for auto-population logic
  const watchFone1 = form.watch('FONE 1')
  const watchEmail = form.watch('EMAIL')

  useEffect(() => {
    // Only auto-populate if cobrança field is empty
    if (watchFone1 && !form.getValues('telefone_cobranca')) {
      form.setValue('telefone_cobranca', watchFone1)
    }
  }, [watchFone1, form])

  useEffect(() => {
    // Only auto-populate if cobrança field is empty
    if (watchEmail && !form.getValues('email_cobranca')) {
      form.setValue('email_cobranca', watchEmail)
    }
  }, [watchEmail, form])

  useEffect(() => {
    clientsService.getRoutes().then((data) => setRoutes(data))
    clientsService.getUniqueClientTypes().then((data) => {
      const defaultTypes = ['ATIVO', 'INATIVO - ROTA', 'INATIVO-COBRANÇA']
      const mergedTypes = Array.from(new Set([...defaultTypes, ...data]))
      setClientTypes(mergedTypes)
    })
    clientsService.getUniqueGroups().then((data) => setGroups(data))

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

  const handleGeocodeAddress = async () => {
    const endereco = form.getValues('ENDEREÇO')
    const bairro = form.getValues('BAIRRO')
    const municipio = form.getValues('MUNICÍPIO')

    if (!endereco || !municipio) {
      toast({
        title: 'Dados insuficientes',
        description:
          'Preencha o endereço e o município para obter as coordenadas.',
        variant: 'destructive',
      })
      return
    }

    setIsGeocoding(true)
    const fullAddress = `${endereco}, ${bairro ? bairro + ', ' : ''}${municipio}`

    try {
      const coords = await clientsService.geocodeAddress(fullAddress)
      if (coords && coords.lat && coords.lon) {
        form.setValue('latitude', String(coords.lat))
        form.setValue('longitude', String(coords.lon))
        toast({
          title: 'Coordenadas obtidas',
          description: 'Latitude e longitude preenchidas com sucesso.',
        })
      } else {
        toast({
          title: 'Não encontrado',
          description:
            'Não foi possível encontrar as coordenadas para este endereço.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao buscar as coordenadas.',
        variant: 'destructive',
      })
    } finally {
      setIsGeocoding(false)
    }
  }

  useEffect(() => {
    if (initialData && autoGeocode && !hasAutoGeocoded.current) {
      hasAutoGeocoded.current = true
      const timer = setTimeout(() => {
        handleGeocodeAddress()
      }, 800)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, autoGeocode])

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

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Erro',
        description: 'Geolocalização não suportada pelo navegador.',
        variant: 'destructive',
      })
      return
    }

    setCapturingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', position.coords.latitude.toString())
        form.setValue('longitude', position.coords.longitude.toString())
        toast({
          title: 'Sucesso',
          description: 'Localização atual capturada com sucesso!',
        })
        setCapturingLocation(false)
      },
      (error) => {
        toast({
          title: 'Erro',
          description: 'Não foi possível capturar a localização atual.',
          variant: 'destructive',
        })
        setCapturingLocation(false)
      },
      { enableHighAccuracy: true },
    )
  }

  const checkDuplicate = async (
    cpfCnpj: string,
  ): Promise<'proceed' | 'cancel'> => {
    if (!cpfCnpj) return 'proceed'

    try {
      const duplicate = await clientsService.checkDuplicateCpfCnpj(
        cpfCnpj,
        initialData?.CODIGO,
      )

      if (duplicate) {
        let debt = 0
        try {
          debt = await cobrancaService.getClientDebtSummary(duplicate.CODIGO)
        } catch (e) {
          console.error('Error fetching duplicate debt info', e)
        }

        return new Promise((resolve) => {
          setDuplicateWarning({
            open: true,
            data: {
              name: duplicate['NOME CLIENTE'],
              debt: debt,
            },
            resolve: (proceed) => {
              setDuplicateWarning(null)
              resolve(proceed ? 'proceed' : 'cancel')
            },
          })
        })
      }
    } catch (e) {
      console.error('Error checking duplicate', e)
    }
    return 'proceed'
  }

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    try {
      const proceed = await checkDuplicate(data.CNPJ)
      if (proceed === 'cancel') {
        setLoading(false)
        return
      }

      let finalLat = data.latitude
      let finalLon = data.longitude

      // Automatic Geocoding on Save if empty or zero
      if (!finalLat || !finalLon || finalLat === '0' || finalLon === '0') {
        const endereco = data.ENDEREÇO
        const bairro = data.BAIRRO
        const municipio = data.MUNICÍPIO

        if (endereco && municipio) {
          const fullAddress = `${endereco}, ${bairro ? bairro + ', ' : ''}${municipio}`
          try {
            toast({
              title: 'Obtendo coordenadas...',
              description: 'Buscando latitude e longitude automaticamente.',
            })
            const coords = await clientsService.geocodeAddress(fullAddress)
            if (coords && coords.lat && coords.lon) {
              finalLat = String(coords.lat)
              finalLon = String(coords.lon)
              form.setValue('latitude', finalLat)
              form.setValue('longitude', finalLon)
            }
          } catch (err) {
            console.error('Auto geocode failed', err)
            // Silently continue without coordinates as per acceptance criteria
          }
        }
      }

      const discountVal = data.Desconto
        ? data.Desconto.includes('%')
          ? data.Desconto
          : `${data.Desconto}%`
        : null

      const payload = {
        ...data,
        CODIGO: Number(data.CODIGO),
        Desconto: discountVal,
        latitude: finalLat ? Number(finalLat) : null,
        longitude: finalLon ? Number(finalLon) : null,
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

  const handleAddNewGroup = () => {
    if (newGroupName.trim()) {
      const newG = newGroupName.trim()
      setGroups((prev) => [...prev, newG])
      form.setValue('GRUPO', newG)
      setNewGroupOpen(false)
      setNewGroupName('')
    }
  }

  const appendAddressNumber = () => {
    if (!addressNumber.trim()) return

    const currentAddress = form.getValues('ENDEREÇO') || ''
    const newAddress = currentAddress
      ? `${currentAddress}, ${addressNumber.trim()}`
      : addressNumber.trim()

    form.setValue('ENDEREÇO', newAddress)
    setAddressNumber('')
    setAddressPopoverOpen(false)
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
                      <FormLabel>Razão Social *</FormLabel>
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

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contato e Cobrança</h3>
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

              <div className="md:col-span-4">
                <FormField
                  control={form.control}
                  name="email_cobranca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Cobrança</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="cobranca@email.com"
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
                  name="telefone_cobranca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone Cobrança</FormLabel>
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
                      <FormLabel>Contato 1 *</FormLabel>
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
                      <FormLabel>CEP *</FormLabel>
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
                      <FormLabel>Endereço Completo *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Rua, Número, Comp."
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <Popover
                          open={addressPopoverOpen}
                          onOpenChange={setAddressPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Adicionar Número"
                              type="button"
                              className="shrink-0"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2">
                            <div className="flex flex-col gap-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Adicionar número ao endereço
                              </p>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Número"
                                  value={addressNumber}
                                  onChange={(e) =>
                                    setAddressNumber(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      appendAddressNumber()
                                    }
                                  }}
                                  className="h-8"
                                />
                                <Button
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={appendAddressNumber}
                                  type="button"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
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
                      <FormLabel>Município - UF *</FormLabel>
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

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Geolocalização</h3>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <p className="text-sm text-muted-foreground">
                    Você pode inserir as coordenadas manualmente copiando do
                    Google Maps, capturar a localização atual ou obter pelo
                    endereço.
                  </p>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding || capturingLocation}
                      className="h-9"
                    >
                      {isGeocoding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="mr-2 h-4 w-4" />
                      )}
                      Obter Coordenadas pelo Endereço
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCaptureLocation}
                      disabled={capturingLocation || isGeocoding}
                      className="h-9"
                    >
                      {capturingLocation ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="mr-2 h-4 w-4" />
                      )}
                      Capturar Atual
                    </Button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-6">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Ex: -23.550520"
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
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Ex: -46.633308"
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
                  name="tipo_venda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Venda Padrão</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'consignado'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consignado">Consignado</SelectItem>
                          <SelectItem value="venda de mercadorias">
                            Venda de Mercadorias
                          </SelectItem>
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
                        value={field.value || 'expositor de 46 cm'} // Updated Default
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expositor de 46 cm">
                            expositor de 46 cm
                          </SelectItem>
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
                      <FormLabel>Desconto Padrão (30% - 50%) *</FormLabel>
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

              <div className="md:col-span-8">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="GRUPO"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Grupo</FormLabel>
                          <Popover open={openGroup} onOpenChange={setOpenGroup}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openGroup}
                                  className={cn(
                                    'w-full justify-between',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {field.value || 'Selecione ou crie'}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Buscar grupo..."
                                  onValueChange={setSearchGroupValue}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="p-2">
                                      <p className="text-sm text-muted-foreground mb-2">
                                        Nenhum grupo encontrado.
                                      </p>
                                      <Button
                                        variant="secondary"
                                        className="w-full justify-start"
                                        onClick={() => {
                                          field.onChange(searchGroupValue)
                                          setOpenGroup(false)
                                        }}
                                      >
                                        Usar "{searchGroupValue}"
                                      </Button>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup heading="Grupos Existentes">
                                    {groups.map((grupo) => (
                                      <CommandItem
                                        key={grupo}
                                        value={grupo}
                                        onSelect={(currentValue) => {
                                          field.onChange(currentValue)
                                          setOpenGroup(false)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            field.value === grupo
                                              ? 'opacity-100'
                                              : 'opacity-0',
                                          )}
                                        />
                                        {grupo}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewGroupOpen(true)}
                    title="Cadastrar Novo Grupo"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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

      <DuplicateWarningDialog
        open={!!duplicateWarning}
        onOpenChange={(o) => !o && duplicateWarning?.resolve(false)}
        onConfirm={() => duplicateWarning?.resolve(true)}
        duplicateData={duplicateWarning?.data || null}
      />

      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Grupo</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Especiais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddNewGroup}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
