import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2 } from 'lucide-react'
import { vehicleService } from '@/services/vehicleService'
import { useToast } from '@/hooks/use-toast'
import { Vehicle } from '@/types/vehicle'
import { caixaService } from '@/services/caixaService'
import { useUserStore } from '@/stores/useUserStore'

// Specialized Schema for Vehicle Management
const vehicleExpenseSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  veiculo_id: z.string().min(1, 'Veículo é obrigatório'),
  hodometro: z.string().min(1, 'Hodômetro é obrigatório'),
  grupo: z.enum(['Manutenção', 'Outras'], {
    required_error: 'Selecione o grupo',
  }),
  valor: z.string().min(1, 'Valor é obrigatório'),

  // Conditional fields
  prestador_servico: z.string().optional(),
  tipo_servico: z.string().optional(),
  detalhamento: z.string().optional(),
})

type VehicleExpenseFormData = z.infer<typeof vehicleExpenseSchema>

interface VehicleExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function VehicleExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: VehicleExpenseFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const { toast } = useToast()
  const { employee } = useUserStore()

  const form = useForm<VehicleExpenseFormData>({
    resolver: zodResolver(vehicleExpenseSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      grupo: 'Manutenção',
      veiculo_id: '',
      hodometro: '',
      valor: '',
      prestador_servico: '',
      tipo_servico: '',
      detalhamento: '',
    },
  })

  const selectedGrupo = form.watch('grupo')

  useEffect(() => {
    if (open) {
      vehicleService.getActive().then(setVehicles).catch(console.error)
      form.reset({
        data: new Date().toISOString().split('T')[0],
        grupo: 'Manutenção',
        veiculo_id: '',
        hodometro: '',
        valor: '',
        prestador_servico: '',
        tipo_servico: '',
        detalhamento: '',
      })
    }
  }, [open, form])

  const onSubmit = async (data: VehicleExpenseFormData) => {
    // 1. Detail Logic
    let finalDetail = ''
    if (data.grupo === 'Manutenção') {
      if (!data.prestador_servico || !data.tipo_servico) {
        if (!data.prestador_servico)
          form.setError('prestador_servico', {
            message: 'Obrigatório para manutenção',
          })
        if (!data.tipo_servico)
          form.setError('tipo_servico', {
            message: 'Obrigatório para manutenção',
          })
        return
      }
      finalDetail = `${data.tipo_servico} - ${data.prestador_servico}`
    } else {
      if (!data.detalhamento) {
        form.setError('detalhamento', { message: 'Obrigatório para Outros' })
        return
      }
      finalDetail = data.detalhamento
    }

    // 2. Odometer Validation
    try {
      setLoading(true)
      const lastOdometer = await vehicleService.getLastOdometer(
        Number(data.veiculo_id),
      )
      const currentOdometer = Number(data.hodometro)

      if (currentOdometer < lastOdometer) {
        form.setError('hodometro', {
          message: `O hodômetro não pode ser inferior ao último registro deste veículo (${lastOdometer} km).`,
        })
        setLoading(false)
        return
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro de validação',
        description: 'Falha ao verificar hodômetro.',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // 3. Save
    try {
      await caixaService.saveDespesa({
        Data: data.data,
        'Grupo de Despesas': data.grupo === 'Outras' ? 'Outros' : data.grupo, // Map 'Outras' to 'Outros' enum in DB if needed, or keep consistent
        Detalhamento: finalDetail,
        Valor: parseFloat(data.valor.replace(',', '.')),
        funcionario_id: employee?.id || 0, // Fallback if no user logged in (should enforce auth)
        saiu_do_caixa: false, // MANDATORY requirement
        hodometro: Number(data.hodometro),
        veiculo_id: Number(data.veiculo_id),
        prestador_servico: data.prestador_servico || null,
        tipo_servico: data.tipo_servico || null,
        tipo_combustivel: null, // Not used in this restricted form
      })

      toast({
        title: 'Despesa Registrada',
        description: 'Despesa de veículo salva com sucesso.',
        className: 'bg-green-600 text-white',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a despesa.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Despesa de Veículo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="veiculo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.placa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hodometro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hodômetro *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Km atual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="grupo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de Despesas *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o grupo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Outras">Outras</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedGrupo === 'Manutenção' && (
              <div className="space-y-4 border p-3 rounded-md bg-muted/10">
                <FormField
                  control={form.control}
                  name="prestador_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prestador de Serviço *</FormLabel>
                      <FormControl>
                        <Input placeholder="Oficina / Loja" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Serviço *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Troca de óleo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {selectedGrupo === 'Outras' && (
              <FormField
                control={form.control}
                name="detalhamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detalhamento *</FormLabel>
                    <FormControl>
                      <Input placeholder="Descreva a despesa..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
