import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { employeesService } from '@/services/employeesService'
import { fechamentoService } from '@/services/fechamentoService'
import { Employee } from '@/types/employee'
import { Rota } from '@/types/rota'
import { Loader2 } from 'lucide-react'

interface CloseCashierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRoute: Rota | undefined
  onSuccess?: () => void
}

export function CloseCashierDialog({
  open,
  onOpenChange,
  currentRoute,
  onSuccess,
}: CloseCashierDialogProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      employeesService.getEmployees(1, 100).then(({ data }) => {
        setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
      })
      setSelectedEmployeeId('')
    }
  }, [open])

  const handleConfirm = async () => {
    if (!currentRoute) {
      toast({
        title: 'Erro',
        description: 'Nenhuma rota ativa selecionada.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedEmployeeId) {
      toast({
        title: 'Atenção',
        description: 'Selecione um funcionário.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const empId = parseInt(selectedEmployeeId)

      // Check if already closed
      const exists = await fechamentoService.checkExistingClosing(
        currentRoute.id,
        empId,
      )
      if (exists) {
        toast({
          title: 'Já Iniciado',
          description:
            'Já existe um fechamento de caixa para este funcionário nesta rota.',
          variant: 'warning',
        })
        onOpenChange(false)
        return
      }

      await fechamentoService.createClosing(currentRoute, empId)

      toast({
        title: 'Fechamento Iniciado',
        description:
          'O processo de fechamento foi aberto. Verifique na aba "Fechamentos".',
        className: 'bg-green-600 text-white',
      })
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao iniciar fechamento de caixa.',
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
          <DialogTitle>Fechar Caixa</DialogTitle>
          <DialogDescription>
            Inicie o processo de conferência e fechamento para um funcionário na{' '}
            <strong>Rota #{currentRoute?.id}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Funcionário</Label>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedEmployeeId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
