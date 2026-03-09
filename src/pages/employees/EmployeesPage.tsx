import { useEffect, useState, useCallback } from 'react'
import { EmployeeTable } from '@/components/employees/EmployeeTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { employeesService } from '@/services/employeesService'
import { Employee } from '@/types/employee'
import { useToast } from '@/hooks/use-toast'

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const { toast } = useToast()

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await employeesService.getEmployees(
        page,
        pageSize,
        debouncedSearch,
      )
      setEmployees(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setEmployees([])
      setTotalCount(0)
      toast({
        title: 'Erro de conexão',
        description:
          'Não foi possível carregar os funcionários. Verifique sua rede e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, toast])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Menu Principal
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua equipe ({totalCount} registros).
          </p>
        </div>
        <Button asChild>
          <Link to="/funcionarios/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Link>
        </Button>
      </div>

      <div className="flex items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : employees.length > 0 ? (
        <div className="space-y-4">
          <EmployeeTable employees={employees} onUpdate={fetchEmployees} />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              Nenhum funcionário encontrado
            </h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Não encontramos resultados para sua busca. Tente ajustar os
              filtros ou cadastre um novo funcionário.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default EmployeesPage
