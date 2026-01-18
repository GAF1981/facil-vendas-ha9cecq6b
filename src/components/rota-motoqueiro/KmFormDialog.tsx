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
import { format } from 'date-fns'

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

  const form = useForm<KmFormData>({
    resolver: zodResolver(kmSchema),
    defaultValues: {
      data_hora: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      km_percorrido: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        const dt = new Date(editingRecord.data_hora)
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const formattedDt = format(dt, "yyyy-MM-dd'T'HH:mm")
        form.reset({
          data_hora: formattedDt,
          km_percorrido: editingRecord.km_percorrido,
        })
      } else {
        form.reset({
          data_hora: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          km_percorrido: 0,
        })
      }
    }
  }, [open, editingRecord, form])

  const onSubmit = async (data: KmFormData) => {
    if (!employee) {
      toast({
        title: 'Erro',
        description: 'Usuário não identificado',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Ensure ISO string for DB
      const isoDate = new Date(data.data_hora).toISOString()

      if (editingRecord) {
        await rotaMotoqueiroService.update(editingRecord.id, {
          data_hora: isoDate,
          km_percorrido: data.km_percorrido,
        })
        toast({
          title: 'Atualizado',
          description: 'Registro de KM atualizado.',
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
        })
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar registro.',
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
            <Label>Data e Hora</Label>
            <Input type="datetime-local" {...form.register('data_hora')} />
            {form.formState.errors.data_hora && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.data_hora.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>KM Percorrido</Label>
            <Input
              type="number"
              step="0.1"
              {...form.register('km_percorrido')}
            />
            {form.formState.errors.km_percorrido && (
              <p className="text-red-500 text-xs">
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
