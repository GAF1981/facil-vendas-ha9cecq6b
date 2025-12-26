import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { EmployeeForm } from '@/components/employees/EmployeeForm'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'

const EmployeeFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [employee, setEmployee] = useState<Employee | undefined>(undefined)

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) return

      setLoading(true)
      try {
        const data = await employeesService.getById(Number(id))
        setEmployee(data)
      } catch (error) {
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar os dados do funcionário.',
          variant: 'destructive',
        })
        navigate('/funcionarios')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployee()
  }, [id, navigate, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/funcionarios')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h1>
          <p className="text-muted-foreground">
            {id
              ? `Editando funcionário #${id}`
              : 'Preencha os dados completos para cadastrar um novo funcionário.'}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <EmployeeForm
          initialData={employee}
          onSuccess={() => navigate('/funcionarios')}
          onCancel={() => navigate('/funcionarios')}
        />
      </div>
    </div>
  )
}

export default EmployeeFormPage
