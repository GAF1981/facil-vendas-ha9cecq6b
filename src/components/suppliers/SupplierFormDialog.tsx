import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Loader2 } from 'lucide-react'
import { maskCNPJ, maskPhone } from '@/lib/masks'

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
    },
  })

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          nome_fornecedor: supplier.nome_fornecedor,
          cnpj: supplier.cnpj || '',
          endereco: supplier.endereco || '',
          telefone: supplier.telefone || '',
        })
      } else {
        form.reset({
          nome_fornecedor: '',
          cnpj: '',
          endereco: '',
          telefone: '',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
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
                  <FormLabel>Telefone (WhatsApp)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}
