import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { dreService } from '@/services/dreService'
import { formatCurrency } from '@/lib/formatters'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Activity,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import useDreStore from '@/stores/useDreStore'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

interface DREMensalGalleryProps {
  mesReferencia: string
  startDate: string
  endDate: string
}

export function DREMensalGallery({
  mesReferencia,
  startDate,
  endDate,
}: DREMensalGalleryProps) {
  const { toast } = useToast()
  const { cmvTotal, vendaTotal } = useDreStore()
  const [custoFixo, setCustoFixo] = useState(0)
  const [despesaOp, setDespesaOp] = useState(0)
  const [descontoPercent, setDescontoPercent] = useState<string>('0')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const percent = await dreService.getDescontoClientePercentual()
        setDescontoPercent(String(percent))

        const { data: despesas } = await supabase
          .from('DESPESAS')
          .select('Valor')
          .gte('Data', startDate)
          .lte('Data', endDate + 'T23:59:59')

        let sumDespesas = 0
        despesas?.forEach((d) => {
          sumDespesas += Number(d.Valor || 0)
        })
        setDespesaOp(sumDespesas)

        const custos = await dreService.getCustosFixos(startDate, endDate)
        let sumCustos = 0
        custos?.forEach((c) => {
          sumCustos += Number(c.valor || 0)
        })
        setCustoFixo(sumCustos)
      } catch (error) {
        console.error('Failed to load DRE Mensal Gallery', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mesReferencia, startDate, endDate])

  const handleSaveDesconto = async () => {
    try {
      const val = parseFloat(descontoPercent) || 0
      await dreService.saveDescontoClientePercentual(val)
      toast({
        title: 'Configuração salva',
        description: 'Percentual de desconto atualizado com sucesso.',
      })
    } catch (e) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const percentNum = parseFloat(descontoPercent) || 0
  const descontoValor = vendaTotal * (percentNum / 100)
  const resultadoBruto = vendaTotal - cmvTotal - descontoValor
  const lucroLiquido = resultadoBruto - custoFixo - despesaOp

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in-up">
      <MetricCard
        title="Venda Total"
        value={`R$ ${formatCurrency(vendaTotal)}`}
        icon={TrendingUp}
        iconClassName="text-emerald-500"
        className="border-emerald-200 bg-emerald-50/20"
      />

      <Card className="border-red-200 bg-red-50/20 relative overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Desconto Cliente
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 group">
            <span className="text-2xl font-bold text-red-600">R$</span>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(descontoValor)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              className="w-20 h-7 text-xs bg-white/50 border-red-200 focus-visible:ring-red-400"
              value={descontoPercent}
              onChange={(e) => setDescontoPercent(e.target.value)}
              onBlur={handleSaveDesconto}
            />
            <span className="text-xs text-muted-foreground">
              % sobre vendas
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/20 relative overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Custo da Mercadoria Total (CMV)
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 group">
            <span className="text-2xl font-bold text-red-600">R$</span>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(cmvTotal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sincronizado com a aba Vendas
          </p>
        </CardContent>
      </Card>

      <MetricCard
        title="Resultado Bruto"
        value={`R$ ${formatCurrency(resultadoBruto)}`}
        icon={DollarSign}
        iconClassName="text-blue-500"
        className="border-blue-200 bg-blue-50/20"
      />

      <MetricCard
        title="Custo Fixo"
        value={`R$ ${formatCurrency(custoFixo)}`}
        icon={TrendingDown}
        iconClassName="text-red-500"
        className="border-red-200 bg-red-50/10"
      />
      <MetricCard
        title="Despesa Operacional"
        value={`R$ ${formatCurrency(despesaOp)}`}
        icon={TrendingDown}
        iconClassName="text-red-500"
        className="border-red-200 bg-red-50/10"
      />
      <MetricCard
        title="Lucro Líquido"
        value={`R$ ${formatCurrency(lucroLiquido)}`}
        icon={Activity}
        iconClassName={lucroLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}
        className={cn(
          'border-2',
          lucroLiquido >= 0
            ? 'border-emerald-300 bg-emerald-50/40'
            : 'border-rose-300 bg-rose-50/40',
        )}
      />
    </div>
  )
}
