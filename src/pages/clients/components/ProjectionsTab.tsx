import { useState, useEffect, useMemo } from 'react'
import { reportsService, ProjectionReportRow } from '@/services/reportsService'
import { clientsService } from '@/services/clientsService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Target } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ProjectionsTab() {
  const [data, setData] = useState<ProjectionReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [clientTypes, setClientTypes] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [projections, types] = await Promise.all([
        reportsService.getProjectionsReport(),
        clientsService.getUniqueClientTypes(),
      ])
      setData(projections)
      setClientTypes(types)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredData = useMemo(() => {
    if (selectedType === 'all') return data
    return data.filter((row) => row.clientType === selectedType)
  }, [data, selectedType])

  const exportToCsv = () => {
    const clientsToExport = filteredData.filter(
      (row) => row.daysSinceLastOrder !== null,
    )

    if (clientsToExport.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Não há dados para exportar.',
      })
      return
    }

    const headers = [
      'Código',
      'Cliente',
      'Tipo de Cliente',
      'Projeção (R$)',
      'Dias para Acerto',
      'Média Mensal (R$)',
    ]

    const csvContent = [
      headers.join(';'),
      ...clientsToExport.map((row) => {
        return [
          row.clientCode,
          `"${row.clientName}"`,
          `"${row.clientType || 'N/D'}"`,
          row.projection ? row.projection.toFixed(2).replace('.', ',') : '0,00',
          row.daysSinceLastOrder ?? '0',
          row.monthlyAverage
            ? row.monthlyAverage.toFixed(2).replace('.', ',')
            : '0,00',
        ].join(';')
      }),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `projecoes_metas_${new Date().toISOString().split('T')[0]}.csv`,
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação concluída',
      description: 'O arquivo CSV foi gerado com sucesso.',
    })
  }

  const clientsToShow = useMemo(() => {
    return filteredData.filter((row) => row.daysSinceLastOrder !== null)
  }, [filteredData])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Projeções e Metas
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Análise de projeções de vendas e metas por tipo de cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto bg-card p-2 rounded-lg border shadow-sm">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px] bg-background">
              <SelectValue placeholder="Tipo de Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {clientTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={exportToCsv}
            variant="default"
            className="flex gap-2 whitespace-nowrap"
            disabled={loading || clientsToShow.length === 0}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Card className="border-t-4 border-t-primary shadow-md">
        <CardHeader className="pb-3">
          <CardTitle>Listagem de Projeções</CardTitle>
          <CardDescription>
            {clientsToShow.length}{' '}
            {clientsToShow.length === 1
              ? 'cliente encontrado'
              : 'clientes encontrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
              <p>Carregando projeções...</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[100px] font-semibold">
                      Código
                    </TableHead>
                    <TableHead className="font-semibold min-w-[200px]">
                      Cliente
                    </TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="text-right font-semibold">
                      Média Mensal
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Dias p/ Acerto
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Projeção
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsToShow.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Nenhum dado encontrado para o filtro selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientsToShow.map((row) => (
                      <TableRow
                        key={`${row.clientCode}-${row.orderId}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {row.clientCode}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.clientName}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                            {row.clientType || 'N/D'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.monthlyAverage
                            ? `R$ ${formatCurrency(row.monthlyAverage)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full text-xs font-medium ${
                              row.daysSinceLastOrder &&
                              row.daysSinceLastOrder > 30
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {row.daysSinceLastOrder ?? '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {row.projection
                            ? `R$ ${formatCurrency(row.projection)}`
                            : '-'}
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
    </div>
  )
}
