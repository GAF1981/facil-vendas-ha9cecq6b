import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { DespesaFormData, despesaSchema } from '@/types/despesa'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { caixaService } from '@/services/caixaService'
import { employeesService } from '@/services/employeesService'
import { vehicleService } from '@/services/vehicleService'
import { Employee } from '@/types/employee'
import { Vehicle } from '@/types/vehicle'
import { Loader2 } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedEmployee?: { id: number; name: string } | null
  preselectedVehicleId?: number | null
  activeRouteId?: number // Added
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedEmployee,
  preselectedVehicleId,
  activeRouteId,
}: ExpenseFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const { toast } = useToast()
  const { employee: loggedInUser } = useUserStore()

  const getLocalDateString = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const form = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      data: getLocalDateString(),
      grupo: 'Alimentação',
      detalhamento: '',
      valor: '',
      funcionario_id: '',
      saiu_do_caixa: true,
      hodometro: '',
      veiculo_id: '',
      prestador_servico: '',
      tipo_servico: '',
      tipo_combustivel: 'gasolina', // Default per User Story
    },
  })

  const selectedGrupo = form.watch('grupo')

  useEffect(() => {
    if (open) {
      employeesService.getEmployees(1, 100).then(({ data }) => {
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      })

      vehicleService.getActive().then(setVehicles).catch(console.error)

      let initialGrupo = 'Alimentação' as const
      if (preselectedVehicleId) {
        initialGrupo = 'Abastecimento'
      }

      const initialValues = {
        data: getLocalDateString(),
        grupo: initialGrupo,
        detalhamento: initialGrupo === 'Alimentação' ? 'Alimentação' : '',
        valor: '',
        funcionario_id:
          preselectedEmployee?.id.toString() ||
          loggedInUser?.id.toString() ||
          '',
        saiu_do_caixa: true,
        hodometro: '',
        veiculo_id: preselectedVehicleId ? preselectedVehicleId.toString() : '',
        prestador_servico: '',
        tipo_servico: '',
        tipo_combustivel: 'gasolina' as const,
      }
      form.reset(initialValues)
    }
  }, [open, form, preselectedEmployee, loggedInUser, preselectedVehicleId])

  useEffect(() => {
    if (selectedGrupo === 'Alimentação') {
      form.setValue('detalhamento', 'Alimentação')
    } else if (
      selectedGrupo === 'Combustível' ||
      selectedGrupo === 'Gasolina' ||
      selectedGrupo === 'Abastecimento'
    ) {
      if (!form.getValues('detalhamento')) {
        form.setValue('detalhamento', 'Abastecimento')
      }
      // Force default if switched
      if (!form.getValues('tipo_combustivel')) {
        form.setValue('tipo_combustivel', 'gasolina')
      }
    }
  }, [selectedGrupo, form])

  const onSubmit = async (data: DespesaFormData) => {
    let detalhamentoToSave = data.detalhamento || ''
    if (data.grupo === 'Outros') {
      if (!detalhamentoToSave.trim()) {
        form.setError('detalhamento', {
          message: 'Detalhamento é obrigatório para Outros',
        })
        return
      }
    } else if (data.grupo === 'Abastecimento') {
      detalhamentoToSave = `Abastecimento (${data.tipo_combustivel})`
    } else if (data.grupo === 'Manutenção') {
      detalhamentoToSave = `${data.tipo_servico} - ${data.prestador_servico}`
    } else {
      detalhamentoToSave = data.grupo
    }

    const isFuel =
      data.grupo === 'Gasolina' ||
      data.grupo === 'Combustível' ||
      data.grupo === 'Abastecimento'

    if (isFuel && !data.hodometro) {
      form.setError('hodometro', {
        message: 'Hodômetro é obrigatório para Abastecimento',
      })
      return
    }

    if ((isFuel || data.grupo === 'Manutenção') && !data.veiculo_id) {
      form.setError('veiculo_id', {
        message: 'Veículo é obrigatório',
      })
      return
    }

    // Odometer Validation Logic
    if (isFuel && data.veiculo_id && data.hodometro) {
      try {
        const lastOdometer = await vehicleService.getLastOdometer(
          Number(data.veiculo_id),
        )
        const currentOdometer = Number(data.hodometro)

        if (currentOdometer < lastOdometer) {
          form.setError('hodometro', {
            message: `Inválido. Menor que anterior (${lastOdometer} km).`,
          })
          return
        }

        if (currentOdometer - lastOdometer > 5000) {
          form.setError('hodometro', {
            message: `Inválido. Diferença > 5000km. Anterior: ${lastOdometer} km.`,
          })
          return
        }
      } catch (error) {
        console.error('Failed to validate odometer', error)
        toast({
          title: 'Erro de Validação',
          description: 'Não foi possível validar o hodômetro.',
          variant: 'destructive',
        })
        return
      }
    }

    if (data.grupo === 'Manutenção') {
      if (!data.prestador_servico) {
        form.setError('prestador_servico', {
          message: 'Prestador de Serviço obrigatório',
        })
        return
      }
      if (!data.tipo_servico) {
        form.setError('tipo_servico', {
          message: 'Tipo de Serviço obrigatório',
        })
        return
      }
    }

    setLoading(true)
    try {
      await caixaService.saveDespesa({
        Data: data.data,
        'Grupo de Despesas': data.grupo,
        Detalhamento: detalhamentoToSave,
        Valor: parseFloat(data.valor.replace(',', '.')),
        funcionario_id: parseInt(data.funcionario_id),
        saiu_do_caixa: data.saiu_do_caixa,
        hodometro: data.hodometro ? parseFloat(data.hodometro) : null,
        veiculo_id: data.veiculo_id ? parseInt(data.veiculo_id) : null,
        prestador_servico: data.prestador_servico || null,
        tipo_servico: data.tipo_servico || null,
        tipo_combustivel: isFuel ? data.tipo_combustivel : null,
        rota_id: activeRouteId, // Use the active route ID
      })

      toast({
        title: 'Despesa Registrada',
        description: 'Lançamento de saída realizado com sucesso.',
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

  const isFuel =
    selectedGrupo === 'Abastecimento' ||
    selectedGrupo === 'Gasolina' ||
    selectedGrupo === 'Combustível'
  const isMaintenance = selectedGrupo === 'Manutenção'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {preselectedEmployee
              ? `Nova Despesa: ${preselectedEmployee.name}`
              : 'Cadastrar Despesa (Saída)'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 hidden">
              {/* Keeping the logic but hiding the input as required to strictly use exact moment */}
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
            </div>

            {!preselectedEmployee && (
              <FormField
                control={form.control}
                name="funcionario_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funcionário</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Quem realizou a despesa?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="grupo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo de Despesas</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                      <SelectItem value="Abastecimento">
                        Abastecimento
                      </SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(isFuel || isMaintenance) && (
              <FormField
                control={form.control}
                name="veiculo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veículo *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!preselectedVehicleId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o veículo" />
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
            )}

            {isFuel && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_combustivel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Combustível</FormLabel>
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
                          <SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="alcool">Álcool</SelectItem>
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
                        <Input
                          type="number"
                          placeholder="Km atual"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isMaintenance && (
              <div className="space-y-4 border p-3 rounded-md bg-muted/10">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="hodometro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hodômetro</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Km atual"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
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
                </div>
                <FormField
                  control={form.control}
                  name="prestador_servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prestador de Serviço *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da Oficina/Loja" {...field} />
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
                        <Input
                          placeholder="Ex: Troca de Óleo, Pneu..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {selectedGrupo === 'Outros' && (
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

            {!isMaintenance && (
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
            )}

            <FormField
              control={form.control}
              name="saiu_do_caixa"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>O valor saiu do Caixa?</FormLabel>
                    <FormDescription>
                      Se desmarcado, não descontará do saldo do acerto.
                    </FormDescription>
                  </div>
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
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
