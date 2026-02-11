import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SupplierFormData, supplierSchema, Supplier } from '@/types/supplier'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { suppliersService } from '@/services/suppliersService'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Trash } from 'lucide-react'
import { maskCNPJ, maskPhone } from '@/lib/masks'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier
  onSuccess: () => void
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      nome_fornecedor: '',
      cnpj: '',
      endereco: '',
      telefone: '',
      contatos: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contatos',
  })

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          nome_fornecedor: supplier.nome_fornecedor,
          cnpj: supplier.cnpj || '',
          endereco: supplier.endereco || '',
          telefone: supplier.telefone || '',
          contatos: supplier.contatos || [],
        })
      } else {
        form.reset({
          nome_fornecedor: '',
          cnpj: '',
          endereco: '',
          telefone: '',
          contatos: [],
        })
      }
    }
  }, [open, supplier, form])

  const onSubmit = async (data: SupplierFormData) => {
    setLoading(true)
    try {
      if (supplier) {
        await suppliersService.update(supplier.id, data)
      } else {
        await suppliersService.create(data)
      }
      toast({ title: 'Sucesso', description: 'Fornecedor salvo.' })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar fornecedor.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 px-1"
            >
              <FormField
                control={form.control}
                name="nome_fornecedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) =>
                          field.onChange(maskCNPJ(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Principal</FormLabel>
                    <FormControl>
                      <Input
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
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Contatos Adicionais</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ nome: '', telefone: '' })}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex gap-2 items-end bg-muted/30 p-2 rounded"
                  >
                    <div className="flex-1 space-y-1">
                      <FormLabel className="text-xs">Nome</FormLabel>
                      <FormField
                        control={form.control}
                        name={`contatos.${index}.nome`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="Nome"
                          />
                        )}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <FormLabel className="text-xs">Telefone</FormLabel>
                      <FormField
                        control={form.control}
                        name={`contatos.${index}.telefone`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="h-8 text-sm"
                            placeholder="Telefone"
                            onChange={(e) =>
                              field.onChange(maskPhone(e.target.value))
                            }
                          />
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{' '}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
