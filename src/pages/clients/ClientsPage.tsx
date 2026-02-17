import { useEffect, useState, useCallback } from 'react'
import { ClientTable } from '@/components/clients/ClientTable'
import { ClientImportDialog } from '@/components/clients/ClientImportDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Filter,
  CreditCard,
  Download,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { clientsService } from '@/services/clientsService'
import { ClientRow } from '@/types/client'
import { useToast } from '@/hooks/use-toast'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useUserStore } from '@/stores/useUserStore'

const ClientsPage = () => {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [cnpjFilter, setCnpjFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [municipioFilter, setMunicipioFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [routeFilter, setRouteFilter] = useState<string>('all')
  const [duplicateFilter, setDuplicateFilter] = useState(false)

  const [municipios, setMunicipios] = useState<string[]>([])
  const [groups, setGroups] = useState<string[]>([])
  const [routes, setRoutes] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set())

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  const { toast } = useToast()
  const { employee } = useUserStore()
  const [exporting, setExporting] = useState(false)

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)
  const [debouncedCnpj, setDebouncedCnpj] = useState(cnpjFilter)

  // Permission check for Export button
  const canExport = employee?.setor?.some((s) =>
    ['Administrador', 'Gerente'].includes(s),
  )

  // Permission check for Import button (same as export)
  const canImport = employee?.setor?.some((s) =>
    ['Administrador', 'Gerente'].includes(s),
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCnpj(cnpjFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [cnpjFilter])

  useEffect(() => {
    setPage(1)
  }, [
    debouncedSearch,
    debouncedCnpj,
    typeFilter,
    municipioFilter,
    groupFilter,
    routeFilter,
    duplicateFilter,
  ])

  useEffect(() => {
    // Load Filters Options
    clientsService.getUniqueMunicipios().then(setMunicipios)
    clientsService.getUniqueGroups().then(setGroups)
    clientsService.getRoutes().then(setRoutes)

    // Check duplicates globally
    clientsService.getAllCNPJs().then((data) => {
      const cnjs = data.map((c) => c.CNPJ).filter(Boolean)
      const counts: Record<string, number> = {}
      cnjs.forEach(
        (c) => (counts[c as string] = (counts[c as string] || 0) + 1),
      )
      const dupCnpjs = Object.keys(counts).filter((k) => counts[k] > 1)
      const dupIds = new Set(
        data
          .filter((c) => dupCnpjs.includes(c.CNPJ as string))
          .map((c) => c.CODIGO),
      )
      setDuplicates(dupIds)
    })
  }, [])

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await clientsService.getClients(
        page,
        pageSize,
        debouncedSearch,
        typeFilter,
        municipioFilter,
        groupFilter,
        routeFilter,
        debouncedCnpj,
      )

      // Only client-side logic would go here if needed
      setClients(data)
      setTotalCount(count)
    } catch (error) {
      toast({
        title: 'Erro ao carregar clientes',
        description: 'Verifique sua conexão e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    typeFilter,
    municipioFilter,
    groupFilter,
    routeFilter,
    debouncedCnpj,
    toast,
  ])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await clientsService.getAllForExport()

      // Headers exactly as requested
      const headers = [
        'CODIGO',
        'NOME CLIENTE',
        'RAZÃO SOCIAL',
        'CNPJ',
        'IE',
        'TIPO DE CLIENTE',
        'TIPO',
        'MUNICÍPIO',
        'BAIRRO',
        'ENDEREÇO',
        'CEP OFICIO',
        'FONE 1',
        'FONE 2',
        'CONTATO 1',
        'CONTATO 2',
        'EMAIL',
        'email_cobranca',
        'telefone_cobranca',
        'GRUPO',
        'GRUPO ROTA',
        'FORMA DE PAGAMENTO',
        'NOTA FISCAL',
        'EXPOSITOR',
        'OBSERVAÇÃO FIXA',
        'Desconto',
        'DESCONTO BRINQUEDO',
        'DESCONTO ACESSORIO',
        'DESCONTO ACESSORIO CELULAR',
        'DESCONTO OUTROS',
        'ALTERAÇÃO CLIENTE',
        'situacao',
      ]

      // Generate CSV content
      const csvContent = [
        headers.join(','), // CSV header row
        ...data.map((row: any) =>
          headers
            .map((header) => {
              const val = row[header]
              // Handle null/undefined and escape double quotes
              if (val === null || val === undefined) return '""'
              const str = String(val).replace(/"/g, '""')
              return `"${str}"`
            })
            .join(','),
        ),
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'clientes.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Exportação concluída',
        description: 'O arquivo clientes.csv foi baixado com sucesso.',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo CSV.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-20">
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
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua base de clientes ({totalCount} registros).
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {canImport && <ClientImportDialog onSuccess={fetchClients} />}
          {canExport && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 sm:flex-none"
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          )}
          <Button asChild className="flex-1 sm:flex-none">
            <Link to="/clientes/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full lg:w-[250px]">
            <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CNPJ/CPF..."
              className="pl-8"
              value={cnpjFilter}
              onChange={(e) => setCnpjFilter(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-[200px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tipo de Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
                <SelectItem value="INATIVO - ROTA">Inativo - Rota</SelectItem>
                <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Município: Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Município: Todos</SelectItem>
              {municipios.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Grupo: Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Grupo: Todos</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Rota: Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Rota: Todas</SelectItem>
              {routes.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2 border rounded-md px-3 bg-muted/20">
            <Checkbox
              id="dup"
              checked={duplicateFilter}
              onCheckedChange={(c) => setDuplicateFilter(!!c)}
              // Only visual filter supported for now logic
              disabled
            />
            <Label htmlFor="dup" className="text-muted-foreground text-xs">
              CNPJ Duplicado (Visual)
            </Label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : clients.length > 0 ? (
        <div className="space-y-4">
          <ClientTable
            clients={clients}
            onUpdate={fetchClients}
            duplicates={duplicates} // Pass duplicate set
          />

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
            <h3 className="text-lg font-semibold">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Não encontramos resultados para sua busca. Tente ajustar os
              filtros ou cadastre um novo cliente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ClientsPage
