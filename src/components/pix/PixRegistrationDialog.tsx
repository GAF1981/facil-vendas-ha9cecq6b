import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'
import { pixService } from '@/services/pixService'
import { useUserStore } from '@/stores/useUserStore'
import { cn } from '@/lib/utils'
import { PixRecebimentoRow } from '@/types/pix'

const formSchema = z.object({
  nome_no_pix: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  banco_pix: z.enum(['BS2', 'CORA', 'OUTROS']),
  data_realizada: z.date({
    required_error: 'A data é obrigatória',
  }),
})

type FormData = z.infer<typeof formSchema>

interface PixRegistrationDialogProps {
  row: PixRecebimentoRow
  onSuccess: () => void
}

export function PixRegistrationDialog({
  row,
  onSuccess,
}: PixRegistrationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  const existingDetails = row.pixDetails

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_no_pix: existingDetails?.nome_no_pix || '',
      banco_pix: (existingDetails?.banco_pix as any) || 'BS2',
      data_realizada: existingDetails?.data_realizada
        ? new Date(existingDetails.data_realizada)
        : new Date(),
    },
  })

  const onSubmit = async (values: FormData) => {
    if (!employee) {
      toast({
        title: 'Erro de autenticação',
        description: 'Funcionário não identificado.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await pixService.registerPixConference({
        recebimento_id: row.id,
        nome_no_pix: values.nome_no_pix,
        banco_pix: values.banco_pix,
        data_realizada: values.data_realizada.toISOString(),
        confirmado_por: employee.nome_completo,
      })

      toast({
        title: 'Sucesso',
        description: 'Conferência de Pix registrada com sucesso.',
        className: 'bg-green-600 text-white',
      })
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={existingDetails ? 'outline' : 'default'}
          size="sm"
          className={cn(
            'w-full',
            !existingDetails && 'bg-teal-600 hover:bg-teal-700',
          )}
        >
          {existingDetails ? 'Editar Conferência' : 'Registrar Conferência'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Conferência de Pix</DialogTitle>
          <DialogDescription>
            Informe os detalhes da transação Pix para o pedido #{row.orderId}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Nome do Cliente
            </span>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              <User className="mr-2 h-4 w-4 opacity-50" />
              {row.clientName}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Conferido Por
            </span>
            <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
              <User className="mr-2 h-4 w-4 opacity-50" />
              {employee?.nome_completo || 'N/A'}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_no_pix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome no Pix (Quem transferiu)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="banco_pix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco Destino</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o banco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BS2">BS2</SelectItem>
                      <SelectItem value="CORA">CORA</SelectItem>
                      <SelectItem value="OUTROS">OUTROS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_realizada"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data da Transferência</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy')
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Conferência
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
