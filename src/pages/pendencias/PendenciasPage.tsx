import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  Users,
  MessageSquare,
} from 'lucide-react'
import { PendenciaFormDialog } from '@/components/pendencias/PendenciaFormDialog'
import { ResolvePendenciaDialog } from '@/components/pendencias/ResolvePendenciaDialog'
import { AnotacoesDialog } from '@/components/pendencias/AnotacoesDialog'
import { Pendencia } from '@/types/pendencia'
import { pendenciasService } from '@/services/pendenciasService'
import { employeesService } from '@/services/employeesService'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatBrazilDate } from '@/lib/dateUtils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useSearchParams } from 'react-router-dom'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Employee } from '@/types/employee'
import { useUserStore } from '@/stores/useUserStore'

export default function PendenciasPage() {
  const { employee: currentUser } = useUserStore()
  const [pendencias, setPendencias] = useState<Pendencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [openResolve, setOpenResolve] = useState(false)
  const [openAnotacoes, setOpenAnotacoes] = useState(false)
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(
    null,
  )
  const [viewResolution, setViewResolution] = useState<Pendencia | null>(null)

  // Filters
  const [filterExiste, setFilterExiste] = useState('SIM')
  const [filterResolvida, setFilterResolvida] = useState('NÃO')
  const [filterResponsavel, setFilterResponsavel] = useState(
    currentUser?.id ? currentUser.id.toString() : 'TODOS',
  )
  const initialSet = useRef(!!currentUser?.id)

  const [employees, setEmployees] = useState<Employee[]>([])

  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (currentUser?.id && !initialSet.current) {
      setFilterResponsavel(currentUser.id.toString())
      initialSet.current = true
    }
  }, [currentUser])

  // Handle Initial Search from Query Param
  useEffect(() => {
    const clientIdParam = searchParams.get('cliente_id')
    const searchParam = searchParams.get('search')

    if (clientIdParam) {
      setSearchTerm(clientIdParam)
    } else if (searchParam) {
      setSearchTerm(searchParam)
    }
  }, [searchParams])

  // Load Employees for Filter
  useEffect(() => {
    employeesService.getEmployees(1, 100).then(({ data }) => {
      setEmployees(data.filter((e) => e.situacao === 'ATIVO'))
    })
  }, [])

  const fetchPendencias = useCallback(async () => {
    if (filterExiste === 'NÃO') {
      setPendencias([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      let resolvedFilter: boolean | undefined = undefined
      if (filterResolvida === 'SIM') resolvedFilter = true
      if (filterResolvida === 'NÃO') resolvedFilter = false

      const data = await pendenciasService.getAll(resolvedFilter)
      setPendencias(data)
    } catch (error: any) {
      console.error(error)
      setError('Não foi possível carregar a lista de pendências.')
      toast({
        title: 'Erro ao carregar',
        description: 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [filterExiste, filterResolvida, toast])

  useEffect(() => {
    fetchPendencias()
  }, [fetchPendencias])

  const filteredPendencias = pendencias.filter((p) => {
    if (filterResponsavel !== 'TODOS') {
      const respId = Number(filterResponsavel)
      if (p.responsavel_id !== respId) return false
    }

    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      p.CLIENTES?.['NOME CLIENTE']?.toLowerCase().includes(searchLower) ||
      p.CLIENTES?.CODIGO?.toString().includes(searchLower) ||
      p.creator?.nome_completo?.toLowerCase().includes(searchLower) ||
      p.responsible?.nome_completo?.toLowerCase().includes(searchLower) ||
      p.descricao_pendencia.toLowerCase().includes(searchLower)
    )
  })

  const handleResolveClick = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia)
    setOpenResolve(true)
  }

  const handleAnotacoesClick = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia)
    setOpenAnotacoes(true)
  }

  const handleRefresh = () => {
    fetchPendencias()
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pendências</h1>
            <p className="text-muted-foreground">
              Gerenciamento de itens pendentes e resoluções.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw
              className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
            />
            Atualizar
          </Button>
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Incluir Pendência
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Busca</CardTitle>
          <CardDescription>
            Utilize os filtros para localizar pendências específicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Existe Pendências?</label>
              <Select value={filterExiste} onValueChange={setFilterExiste}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pendência Resolvida</label>
              <Select
                value={filterResolvida}
                onValueChange={setFilterResolvida}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">TODOS</SelectItem>
                  <SelectItem value="SIM">SIM</SelectItem>
                  <SelectItem value="NÃO">NÃO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select
                value={filterResponsavel}
                onValueChange={setFilterResponsavel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                cliente (número ou nome)
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="w-fit"
            >
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[80px]">CÓDIGO</TableHead>
                      <TableHead>NOME CLIENTE</TableHead>
                      <TableHead className="w-[100px]">DATA</TableHead>
                      <TableHead className="hidden md:table-cell">
                        STATUS
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Responsável
                      </TableHead>
                      <TableHead className="min-w-[200px]">PENDENCIA</TableHead>
                      <TableHead className="text-center w-[120px]">
                        RESOLVIDA?
                      </TableHead>
                      <TableHead className="text-right w-[200px]">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendencias.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {filterExiste === 'NÃO'
                            ? 'Filtro "Existe Pendências" está definido como NÃO.'
                            : 'Nenhuma pendência encontrada.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPendencias.map((pendencia) => (
                        <TableRow
                          key={pendencia.id}
                          className={cn(
                            'hover:bg-muted/50 transition-colors',
                            pendencia.resolvida ? 'bg-green-50/30' : '',
                          )}
                        >
                          <TableCell className="font-mono">
                            {pendencia.CLIENTES?.CODIGO || 'N/A'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {pendencia.CLIENTES?.['NOME CLIENTE'] ||
                              'Cliente não encontrado'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatBrazilDate(
                              pendencia.created_at || new Date().toISOString(),
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {pendencia.CLIENTES?.['TIPO DE CLIENTE'] || 'N/D'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {pendencia.responsavel_id ? (
                              <div className="flex items-center gap-1 text-blue-700 font-medium">
                                <Users className="w-3 h-3" />
                                {employees.find(
                                  (e) => e.id === pendencia.responsavel_id,
                                )?.nome_completo ||
                                  `ID: ${pendencia.responsavel_id}`}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Todos
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div
                                className="max-w-[300px] truncate"
                                title={pendencia.descricao_pendencia}
                              >
                                {pendencia.descricao_pendencia}
                              </div>
                              <div className="sm:hidden text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                <Users className="w-3 h-3" />
                                Responsável:{' '}
                                {pendencia.responsavel_id
                                  ? employees.find(
                                      (e) => e.id === pendencia.responsavel_id,
                                    )?.nome_completo ||
                                    `ID: ${pendencia.responsavel_id}`
                                  : 'Todos'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={pendencia.resolvida}
                                onCheckedChange={() => {
                                  if (pendencia.resolvida) {
                                    setViewResolution(pendencia)
                                  }
                                }}
                                className={cn(
                                  'cursor-default',
                                  pendencia.resolvida &&
                                    'cursor-pointer data-[state=checked]:bg-green-600 border-green-600',
                                )}
                                title={
                                  pendencia.resolvida
                                    ? 'Clique para ver a resolução'
                                    : 'Pendente'
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!pendencia.resolvida && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() =>
                                      handleAnotacoesClick(pendencia)
                                    }
                                    title="Anotações"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                    onClick={() =>
                                      handleResolveClick(pendencia)
                                    }
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                    Resolver
                                  </Button>
                                </>
                              )}
                              {pendencia.resolvida && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-muted-foreground"
                                  onClick={() => setViewResolution(pendencia)}
                                >
                                  Ver Detalhes
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <PendenciaFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={fetchPendencias}
      />

      <ResolvePendenciaDialog
        open={openResolve}
        onOpenChange={setOpenResolve}
        onSuccess={fetchPendencias}
        pendencia={selectedPendencia}
      />

      <AnotacoesDialog
        open={openAnotacoes}
        onOpenChange={setOpenAnotacoes}
        pendencia={selectedPendencia}
      />

      {/* View Resolution Details Dialog */}
      <Dialog
        open={!!viewResolution}
        onOpenChange={(o) => !o && setViewResolution(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Pendência Resolvida
            </DialogTitle>
            <DialogDescription>
              Detalhes da resolução para o cliente{' '}
              <strong>{viewResolution?.CLIENTES?.['NOME CLIENTE']}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded border">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Problema Original
              </p>
              <p className="text-sm">{viewResolution?.descricao_pendencia}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Criado por: {viewResolution?.creator?.nome_completo || 'N/A'} em{' '}
                {formatBrazilDate(
                  viewResolution?.created_at || new Date().toISOString(),
                )}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-100 text-green-900">
              <p className="text-xs font-bold uppercase mb-1 text-green-700">
                Resolução
              </p>
              <p className="text-sm">
                {viewResolution?.descricao_resolucao || 'Sem descrição.'}
              </p>
              <p className="text-xs text-green-800 mt-2">
                Resolvido por:{' '}
                {viewResolution?.responsible?.nome_completo || 'N/A'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
