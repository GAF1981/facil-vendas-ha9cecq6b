import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { reportsService, TopSellingItemV5 } from '@/services/reportsService'
import { formatCurrency } from '@/lib/formatters'
import {
  Package,
  DollarSign,
  Loader2,
  Search,
  TrendingDown,
  Percent,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface DREVendasProps {
  startDate: string
  endDate: string
}

export function DREVendas({ startDate, endDate }: DREVendasProps) {
  const { toast } = useToast()
  const [data, setData] = useState<TopSellingItemV5[]>([])
  const [loading, setLoading] = useState(false)
  const [grupoFiltro, setGrupoFiltro] = useState('todos')
  const [funcionarioFiltro, setFuncionarioFiltro] = useState('todos')

  const [grupos, setGrupos] = useState<string[]>([])
  const [funcionarios, setFuncionarios] = useState<
    { id: number; nome: string }[]
  >([])

  const [customCosts, setCustomCosts] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')
      .order('nome_completo')
      .then(({ data }) => {
        if (data)
          setFuncionarios(
            data.map((f) => ({ id: f.id, nome: f.nome_completo })),
          )
      })

    reportsService.getUniqueProductGroups().then((groups) => {
      setGrupos(groups.filter(Boolean))
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const funcId =
        funcionarioFiltro === 'todos' ? undefined : Number(funcionarioFiltro)
      const grupo = grupoFiltro === 'todos' ? undefined : grupoFiltro

      const result = await reportsService.getTopSellingItemsV5(
        startDate,
        endDate,
        funcId,
        grupo,
      )

      const newCosts: Record<string, string> = {}
      result.forEach((item, index) => {
        const id = item.produto_codigo
          ? String(item.produto_codigo)
          : `idx_${index}`
        const precoMedio =
          item.quantidade_total > 0
            ? item.valor_total / item.quantidade_total
            : 0
        newCosts[id] = (precoMedio * 0.3).toFixed(2)
      })
      setCustomCosts(newCosts)

      setData(result)
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro ao buscar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, funcionarioFiltro, grupoFiltro, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalQtd = data.reduce((acc, row) => acc + row.quantidade_total, 0)
  const totalVal = data.reduce((acc, row) => acc + row.valor_total, 0)

  const totalCMV = data.reduce((acc, item, index) => {
    const id = item.produto_codigo
      ? String(item.produto_codigo)
      : `idx_${index}`
    const custo = parseFloat(customCosts[id] || '0')
    return acc + custo * item.quantidade_total
  }, 0)

  const percentCusto = totalVal > 0 ? (totalCMV / totalVal) * 100 : 0

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filtros de Vendas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 w-full sm:w-auto min-w-[200px]">
            <Label>Grupo do Produto</Label>
            <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 w-full sm:w-auto min-w-[200px]">
            <Label>Funcionário (Vendedor)</Label>
            <Select
              value={funcionarioFiltro}
              onValueChange={setFuncionarioFiltro}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {funcionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={fetchData}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Filtrar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Quantidade Total Vendida"
          value={totalQtd}
          icon={Package}
        />
        <MetricCard
          title="Valor Total Vendido"
          value={`R$ ${formatCurrency(totalVal)}`}
          icon={DollarSign}
          className="border-emerald-200 bg-emerald-50/20"
          iconClassName="text-emerald-500"
        />
        <MetricCard
          title="CMV Total"
          value={`R$ ${formatCurrency(totalCMV)}`}
          icon={TrendingDown}
          className="border-rose-200 bg-rose-50/20"
          iconClassName="text-rose-500"
        />
        <MetricCard
          title="% Custo Total"
          value={`${formatCurrency(percentCusto)}%`}
          icon={Percent}
          className="border-blue-200 bg-blue-50/20"
          iconClassName="text-blue-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px]">Cód.</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Qtd. Vendida</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right w-[150px]">
                  Custo Unitário (R$)
                </TableHead>
                <TableHead className="text-right">CMV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum item vendido neste período.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => {
                  const id = item.produto_codigo
                    ? String(item.produto_codigo)
                    : `idx_${index}`
                  const custoStr = customCosts[id] || '0'
                  const custoNum = parseFloat(custoStr) || 0
                  const cmv = custoNum * item.quantidade_total

                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {item.produto_codigo || '-'}
                      </TableCell>
                      <TableCell>{item.produto_nome}</TableCell>
                      <TableCell>{item.grupo || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantidade_total}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-emerald-600">
                        R$ {formatCurrency(item.valor_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-24 ml-auto text-right h-8"
                          value={customCosts[id] ?? ''}
                          onChange={(e) => {
                            setCustomCosts((prev) => ({
                              ...prev,
                              [id]: e.target.value,
                            }))
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-rose-600">
                        R$ {formatCurrency(cmv)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
