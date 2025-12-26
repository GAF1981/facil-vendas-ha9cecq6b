import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ProductFormData, productSchema, Product } from '@/types/product'
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
import { Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { productsService } from '@/services/productsService'
import { useToast } from '@/hooks/use-toast'

interface ProductFormProps {
  initialData?: Product
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductForm({
  initialData,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData
      ? {
          ...initialData,
        }
      : {
          CODIGO: 0,
          'CÓDIGO BARRAS': null,
          MERCADORIA: '',
          'DESCRIÇÃO RESUMIDA': '',
          GRUPO: '',
          PREÇO: '',
          'PRODUTOS CONCATENADOS': '',
          TIPO: '',
        },
  })

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true)
    try {
      const payload = { ...data, CODIGO: Number(data.CODIGO) }

      if (initialData) {
        await productsService.update(initialData.CODIGO, payload)
        toast({
          title: 'Produto atualizado',
          description: 'Os dados foram salvos com sucesso.',
          className: 'bg-green-50 border-green-200 text-green-900',
        })
      } else {
        await productsService.create(payload)
        toast({
          title: 'Produto cadastrado',
          description: 'Novo produto adicionado com sucesso.',
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
          <h3 className="text-lg font-medium">Dados do Produto</h3>
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
                        placeholder="Ex: 100"
                        {...field}
                        disabled={!!initialData}
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
                name="CÓDIGO BARRAS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="EAN-13"
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
                name="MERCADORIA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mercadoria *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do produto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-6">
              <FormField
                control={form.control}
                name="DESCRIÇÃO RESUMIDA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Resumida</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Descrição curta"
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
                name="GRUPO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Grupo"
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
                name="TIPO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tipo"
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
                name="PREÇO"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="R$ 0,00"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-9">
              <FormField
                control={form.control}
                name="PRODUTOS CONCATENADOS"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produtos Concatenados</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Informações adicionais"
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
            {initialData ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
