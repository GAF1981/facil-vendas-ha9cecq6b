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
import { formatCurrency, parseCurrency } from '@/lib/formatters'

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
      valor: '',
    },
  })

  useEffect(() => {
    if (open && receipt) {
      // Do NOT pre-fill nome_no_pix as per User Story requirements
      // Only pre-fill non-sensitive defaults or structural data
      form.reset({
        nome_no_pix: '', // Explicitly empty
        banco_pix: receipt.banco_pix || 'BS2',
        data_pix_realizado: receipt.data_pix_realizado
          ? format(new Date(receipt.data_pix_realizado), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        valor: '', // Explicitly empty, user must type to confirm
      })
    }
  }, [open, receipt, form])

  const onSubmit = async (data: PixConferenceFormData) => {
    if (!receipt || !employee) return

    // Validation: Check if entered value matches the receipt value
    const enteredValue = parseCurrency(data.valor)
    const receiptValue = receipt.valor_pago || 0

    // Allow small margin for floating point errors
    if (Math.abs(enteredValue - receiptValue) > 0.05) {
      form.setError('valor', {
        type: 'manual',
        message: `Valor incorreto. O valor esperado é R$ ${formatCurrency(receiptValue)}.`,
      })
      return
    }

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
            <div className="bg-muted/30 p-3 rounded-md border text-sm text-muted-foreground mb-2">
              <p>
                <strong>Pedido:</strong> #
                {receipt?.id_da_femea || receipt?.venda_id}
              </p>
              <p>
                <strong>Cliente:</strong> {receipt?.cliente_nome}
              </p>
              <p>
                <strong>Valor Esperado:</strong> R${' '}
                {formatCurrency(receipt?.valor_pago || 0)}
              </p>
            </div>

            <FormField
              control={form.control}
              name="nome_no_pix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome no Pix (Pagador) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome conforme comprovante"
                      {...field}
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Pix *</FormLabel>
                    <FormControl>
                      <Input placeholder="0,00" {...field} autoComplete="off" />
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
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
            </div>

            <FormField
              control={form.control}
              name="data_pix_realizado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Realizada</FormLabel>
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
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
