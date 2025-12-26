import { useState } from 'react'
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
import { Loader2, Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { maskCPF, maskCNPJ, maskPhone, maskCEP, unmask } from '@/lib/masks'
import { clientsService } from '@/services/clientsService'
import { useToast } from '@/hooks/use-toast'

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
          'NOTA FISCAL': '',
          EXPOSITOR: '',
          Desconto: '0',
          'OBSERVAÇÃO FIXA': '',
          'ALTERAÇÃO CLIENTE': '',
        },
  })

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    try {
      // Ensure numeric CODIGO
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Auto"
                      {...field}
                      disabled={!!initialData}
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
              name="NOME CLIENTE"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do cliente"
                      {...field}
                      value={field.value || ''}
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
              name="CNPJ"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF / CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Documento"
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

          <div className="md:col-span-4">
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
                      <SelectItem value="Juridica">Pessoa Jurídica</SelectItem>
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
              name="CEP OFICIO"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00000-000"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(maskCEP(e.target.value))}
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
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rua, Número"
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

          <div className="md:col-span-4">
            <FormField
              control={form.control}
              name="MUNICÍPIO"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Município</FormLabel>
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

          <div className="md:col-span-6">
            <FormField
              control={form.control}
              name="OBSERVAÇÃO FIXA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações gerais"
                      className="resize-none"
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
              name="NOTA FISCAL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Info Nota Fiscal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dados para NF"
                      className="resize-none"
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

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
