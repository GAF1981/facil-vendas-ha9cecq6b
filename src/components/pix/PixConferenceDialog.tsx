import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  PixConferenceFormData,
  pixConferenceSchema,
  PixRecebimentoRow,
} from '@/types/pix'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { pixService } from '@/services/pixService'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import { formatCurrency } from '@/lib/formatters'

interface PixConferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: PixRecebimentoRow | null
  onSuccess: () => void
}

export function PixConferenceDialog({
  open,
  onOpenChange,
  row,
  onSuccess,
}: PixConferenceDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  const form = useForm<PixConferenceFormData>({
    resolver: zodResolver(pixConferenceSchema),
    defaultValues: {
      recebimento_id: 0,
      nome_no_pix: '',
      banco_pix: 'BS2',
      data_realizada: new Date().toISOString().split('T')[0],
    },
  })

  // Effect to reset form when row changes
  if (row && form.getValues('recebimento_id') !== row.id) {
    form.reset({
      recebimento_id: row.id,
      nome_no_pix: '',
      banco_pix: 'BS2',
      data_realizada: new Date().toISOString().split('T')[0],
    })
  }

  const onSubmit = async (data: PixConferenceFormData) => {
    if (!employee) {
      toast({
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para realizar esta ação.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Ensure the correct ID is being used
      data.recebimento_id = row?.id || 0

      await pixService.registerConference(
        data,
        employee.nome_completo || employee.apelido || 'Funcionário',
      )

      toast({
        title: 'Conferência Registrada',
        description: 'Os detalhes do Pix foram salvos com sucesso.',
        className: 'bg-green-600 text-white',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar os dados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!row) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Conferência de Pix</DialogTitle>
          <DialogDescription>
            Informe os detalhes do pagamento Pix para o pedido #{row.orderId}.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-3 rounded-md text-sm mb-4 space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{row.clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor:</span>
            <span className="font-bold text-green-600">
              R$ {formatCurrency(row.value)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_no_pix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome no Pix</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do pagador" {...field} />
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
                  <FormLabel>Banco Pix</FormLabel>
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
                <FormItem>
                  <FormLabel>Data do Pix Realizado</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
