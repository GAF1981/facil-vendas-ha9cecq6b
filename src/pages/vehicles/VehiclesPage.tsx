import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Car, ArrowLeft, Loader2, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { VehicleTable } from '@/components/vehicles/VehicleTable'
import { VehicleFormDialog } from '@/components/vehicles/VehicleFormDialog'
import { VehicleExpenseGallery } from '@/components/vehicles/VehicleExpenseGallery'
import { VehicleExpenseFormDialog } from '@/components/vehicles/VehicleExpenseFormDialog'
import { vehicleService } from '@/services/vehicleService'
import { Vehicle } from '@/types/vehicle'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>(
    undefined,
  )
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const { toast } = useToast()

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const data = await vehicleService.getAll()
      setVehicles(data)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os veículos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [])

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await vehicleService.delete(deleteId)
      toast({ title: 'Veículo excluído com sucesso' })
      loadVehicles()
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          'Falha ao excluir veículo. Verifique se existem despesas vinculadas.',
        variant: 'destructive',
      })
    } finally {
      setDeleteId(null)
    }
  }

  const handleAddExpense = () => {
    setIsExpenseDialogOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Car className="h-8 w-8 text-blue-600" />
              Gestão de Veículos
            </h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie a frota de veículos.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddExpense}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Wrench className="mr-2 h-4 w-4" /> Cadastrar Despesa
          </Button>
          <Button
            onClick={() => {
              setEditingVehicle(undefined)
              setIsDialogOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Veículo
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <VehicleTable
              data={vehicles}
              onEdit={handleEdit}
              onDelete={setDeleteId}
            />
          )}
        </CardContent>
      </Card>

      <VehicleExpenseGallery />

      <VehicleFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        vehicle={editingVehicle}
        onSuccess={loadVehicles}
      />

      <VehicleExpenseFormDialog
        open={isExpenseDialogOpen}
        onOpenChange={setIsExpenseDialogOpen}
        onSuccess={() => {
          // Force reload to update gallery (can be improved with query invalidation in future)
          window.location.reload()
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este veículo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
