import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { kmSchema, KmFormData, RotaMotoqueiroKm } from '@/types/rota_motoqueiro'
import { rotaMotoqueiroService } from '@/services/rotaMotoqueiroService'
import { useUserStore } from '@/stores/useUserStore'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface KmFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingRecord?: RotaMotoqueiroKm | null
}

export function KmFormDialog({
  open,
  onOpenChange,
  onSuccess,
  editingRecord,
}: KmFormDialogProps) {
  const { employee } = useUserStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Helper to get Brazil time ISO string for inputs (YYYY-MM-DDTHH:MM)
  // This simulates converting a Date object to "Brazil Local Time" string
  const getBrazilInputString = (dateObj: Date) => {
    // Subtract 3 hours from UTC timestamp to simulate Brazil Time (UTC-3)
    // Then formatting as ISO gives us the correct "face value" digits for Brazil
    const brazilTime = new Date(dateObj.getTime() - 3 * 60 * 60 * 1000)
    return brazilTime.toISOString().slice(0, 16)
  }

  // Helper to get current Brazil time
  const getCurrentBrazilTimeInput = () => {
    return getBrazilInputString(new Date())
  }

  const form = useForm<KmFormData>({
    resolver: zodResolver(kmSchema),
    defaultValues: {
      data_hora: getCurrentBrazilTimeInput(),
      km_percorrido: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        // DB stores UTC ISO string.
        // We want to display it as Brazil Time in the input.
        const dt = new Date(editingRecord.data_hora)
        form.reset({
          data_hora: getBrazilInputString(dt),
          km_percorrido: editingRecord.km_percorrido,
        })
      } else {
        form.reset({
          data_hora: getCurrentBrazilTimeInput(),
          km_percorrido: 0,
        })
      }
    }
  }, [open, editingRecord, form])

  const onSubmit = async (data: KmFormData) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado. Faça login novamente.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Parse input string as Brazil Time (UTC-3)
      // data.data_hora is YYYY-MM-DDTHH:MM
      // Appending -03:00 tells Date constructor this is BRT
      // We append :00 for seconds to ensure valid format
      const brazilDate = new Date(`${data.data_hora}:00-03:00`)
      const isoDate = brazilDate.toISOString()

      if (editingRecord) {
        await rotaMotoqueiroService.update(editingRecord.id, {
          data_hora: isoDate,
          km_percorrido: data.km_percorrido,
        })
        toast({
          title: 'Atualizado',
          description: 'Registro de KM atualizado com sucesso.',
          className: 'bg-green-600 text-white',
        })
      } else {
        await rotaMotoqueiroService.create({
          data_hora: isoDate,
          km_percorrido: data.km_percorrido,
          funcionario_id: employee.id,
        })
        toast({
          title: 'Registrado',
          description: 'KM registrado com sucesso.',
          className: 'bg-green-600 text-white',
        })
      }
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error(error)
      const errorMsg = error.message || 'Falha ao salvar registro.'
      toast({
        title: 'Erro',
        description: errorMsg,
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
            {editingRecord
              ? 'Editar Registro de KM'
              : 'Registrar KM Rota Motoqueiro'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data e Hora (Horário de Brasília)</Label>
            <Input type="datetime-local" {...form.register('data_hora')} />
            {form.formState.errors.data_hora && (
              <p className="text-red-500 text-xs font-medium">
                {form.formState.errors.data_hora.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>KM Percorrido</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              {...form.register('km_percorrido')}
            />
            {form.formState.errors.km_percorrido && (
              <p className="text-red-500 text-xs font-medium">
                {form.formState.errors.km_percorrido.message}
              </p>
            )}
          </div>
          <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}
