import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUserStore } from '@/stores/useUserStore'
import {
  PixReceiptRow,
  pixConferenceSchema,
  PixConferenceFormData,
} from '@/types/pix'
import { pixService } from '@/services/pixService'
import { format } from 'date-fns'

interface PixConferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: PixReceiptRow | null
  onSuccess: () => void
}

export function PixConferenceDialog({
  open,
  onOpenChange,
  receipt,
  onSuccess,
}: PixConferenceDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { employee } = useUserStore()

  const form = useForm<PixConferenceFormData>({
    resolver: zodResolver(pixConferenceSchema),
    defaultValues: {
      nome_no_pix: '',
      banco_pix: 'BS2',
      data_pix_realizado: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  useEffect(() => {
    if (open && receipt) {
      form.reset({
        nome_no_pix: receipt.nome_no_pix || '',
        banco_pix: receipt.banco_pix || 'BS2',
        data_pix_realizado: receipt.data_pix_realizado
          ? format(new Date(receipt.data_pix_realizado), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
      })
    }
  }, [open, receipt, form])

  const onSubmit = async (data: PixConferenceFormData) => {
    if (!receipt || !employee) return

    setLoading(true)
    try {
      await pixService.saveConference(
        receipt.id,
        receipt.venda_id,
        data,
        employee.nome_completo,
      )

      toast({
        title: 'Conferência Salva',
        description: 'Os dados do Pix foram registrados com sucesso.',
        className: 'bg-green-600 text-white',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a conferência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Conferência de Pix</DialogTitle>
        </DialogHeader>

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
                    value={field.value}
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
              name="data_pix_realizado"
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

            <div className="space-y-2">
              <FormLabel>Realizado por</FormLabel>
              <Input
                value={employee?.nome_completo || 'Usuário'}
                disabled
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Conferência
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
