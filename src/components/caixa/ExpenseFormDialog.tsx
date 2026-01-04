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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { caixaService } from '@/services/caixaService'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { Loader2 } from 'lucide-react'
import { useUserStore } from '@/stores/useUserStore'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  preselectedEmployee?: { id: number; name: string } | null
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedEmployee,
}: ExpenseFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const { toast } = useToast()
  const { employee: loggedInUser } = useUserStore()

  const form = useForm<DespesaFormData>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
      grupo: 'Alimentação',
      detalhamento: '',
      valor: '',
      funcionario_id: '',
    },
  })

  const selectedGrupo = form.watch('grupo')

  useEffect(() => {
    if (open) {
      // Fetch employees list
      employeesService.getEmployees(1, 100).then(({ data }) => {
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      })

      if (preselectedEmployee) {
        form.reset({
          data: new Date().toISOString().split('T')[0],
          grupo: 'Alimentação',
          detalhamento: 'Alimentação',
          valor: '',
          funcionario_id: preselectedEmployee.id.toString(),
        })
      } else {
        // Requirement: Auto-select logged in employee if available
        form.reset({
          data: new Date().toISOString().split('T')[0],
          grupo: 'Alimentação',
          detalhamento: 'Alimentação',
          valor: '',
          funcionario_id: loggedInUser?.id.toString() || '',
        })
      }
    }
  }, [open, form, preselectedEmployee, loggedInUser])

  // Auto-fill detalhamento effect
  useEffect(() => {
    if (selectedGrupo === 'Alimentação') {
      form.setValue('detalhamento', 'Alimentação')
    } else if (selectedGrupo === 'Combustível') {
      form.setValue('detalhamento', 'Combustível')
    } else if (selectedGrupo === 'Outros') {
      // Keep existing or clear if it was an auto-value
      const current = form.getValues('detalhamento')
      if (current === 'Alimentação' || current === 'Combustível') {
        form.setValue('detalhamento', '')
      }
    }
  }, [selectedGrupo, form])

  const onSubmit = async (data: DespesaFormData) => {
    // Logic for detailing
    let detalhamentoToSave = data.detalhamento || ''
    if (data.grupo === 'Outros') {
      if (!detalhamentoToSave.trim()) {
        form.setError('detalhamento', {
          message: 'Detalhamento é obrigatório para Outros',
        })
        return
      }
    } else {
      detalhamentoToSave = data.grupo // Enforce group name as detail for consistency if not others
    }

    setLoading(true)
    try {
      await caixaService.saveDespesa({
        Data: data.data, // Pass date from form
        'Grupo de Despesas': data.grupo,
        Detalhamento: detalhamentoToSave,
        Valor: parseFloat(data.valor.replace(',', '.')),
        funcionario_id: parseInt(data.funcionario_id),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {preselectedEmployee
              ? `Nova Despesa: ${preselectedEmployee.name}`
              : 'Cadastrar Despesa (Saída)'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="Combustível">Combustível</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
