import { useState, useEffect, useCallback } from 'react'
import { dreService, DRELancamento } from '@/services/dreService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { formatCurrency, safeFormatDate } from '@/lib/formatters'
import { Trash2, Plus, DollarSign, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'

interface DRECustosFixosProps {
  mesReferencia: string
  startDate: string
  endDate: string
}

export function DRECustosFixos({
  mesReferencia,
  startDate,
  endDate,
}: DRECustosFixosProps) {
  const { toast } = useToast()
  const [lancamentos, setLancamentos] = useState<DRELancamento[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [categoria, setCategoria] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [valor, setValor] = useState('')
  const [dataLancamento, setDataLancamento] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [lan, cats] = await Promise.all([
        dreService.getCustosFixos(startDate, endDate),
        dreService.getCategorias(),
      ])
      setLancamentos(lan)
      setCategorias(cats)
    } catch (e) {
      console.error(e)
    } finally {
      setInitialLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = async () => {
    if (!valor || Number(valor) <= 0) {
      return toast({
        title: 'Informe um valor válido',
        variant: 'destructive',
      })
    }
    if (!categoria) {
      return toast({
        title: 'Selecione uma categoria',
        variant: 'destructive',
      })
    }
    if (!dataLancamento) {
      return toast({ title: 'Informe a data', variant: 'destructive' })
    }

    setLoading(true)
    try {
      let catNome = categoria
      if (categoria === 'NOVA' && novaCategoria) {
        const newCat = await dreService.addCategoria(
          novaCategoria,
          'CUSTO_FIXO',
        )
        catNome = newCat.nome
      }

      await dreService.addLancamento({
        mes_referencia: mesReferencia,
        data_lancamento: dataLancamento,
        categoria: catNome,
        valor: Number(valor),
        tipo: 'CUSTO_FIXO',
      })

      toast({ title: 'Custo adicionado!' })
      setCategoria('')
      setNovaCategoria('')
      setValor('')
      loadData()
    } catch (e) {
      toast({ title: 'Erro ao adicionar custo', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este lançamento?')) return
    try {
      await dreService.deleteLancamento(id)
      loadData()
      toast({ title: 'Excluído com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const custoTotal = lancamentos.reduce((acc, l) => acc + Number(l.valor), 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Custo Fixo Total"
          value={`R$ ${formatCurrency(custoTotal)}`}
          icon={DollarSign}
          className="border-red-200 bg-red-50/30 text-red-600"
          iconClassName="text-red-500"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Custo Fixo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 w-full sm:flex-1">
            <Label>Data do Custo</Label>
            <Input
              type="date"
              value={dataLancamento}
              onChange={(e) => setDataLancamento(e.target.value)}
            />
          </div>
          <div className="space-y-2 w-full sm:flex-1">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {c.nome}
                  </SelectItem>
                ))}
                <SelectItem value="NOVA" className="text-primary font-medium">
                  + Nova Categoria
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {categoria === 'NOVA' && (
            <div className="space-y-2 w-full sm:flex-1 animate-fade-in">
              <Label>Nome da Nova Categoria</Label>
              <Input
                placeholder="Ex: Manutenção"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2 w-full sm:flex-1">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Custos Fixos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Mês Referência</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Custo (Categoria)</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : lancamentos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum custo registrado neste período.
                  </TableCell>
                </TableRow>
              ) : (
                lancamentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.mes_referencia}</TableCell>
                    <TableCell>
                      {safeFormatDate(l.data_lancamento, 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{l.categoria}</TableCell>
                    <TableCell className="text-right font-medium text-red-600 font-mono">
                      R$ {formatCurrency(l.valor)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(l.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
