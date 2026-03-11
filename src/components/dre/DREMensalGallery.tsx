import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { dreService } from '@/services/dreService'
import { parseCurrency, formatCurrency } from '@/lib/formatters'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Activity,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
  const [vendaTotal, setVendaTotal] = useState(0)
  const [custoFixo, setCustoFixo] = useState(0)
  const [despesaOp, setDespesaOp] = useState(0)
  const [cmv, setCmv] = useState<{ valor: number; id?: number }>({ valor: 0 })
  const [loading, setLoading] = useState(true)
  const [savingCmv, setSavingCmv] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Fetch Vendas - explicitly quoting column name with spaces to avoid PostgREST parsing errors
        const { data: vendas } = await supabase
          .from('BANCO_DE_DADOS')
          .select('"VALOR VENDIDO"')
          .gte('DATA DO ACERTO', startDate)
          .lte('DATA DO ACERTO', endDate)

        let sumVendas = 0
        vendas?.forEach((v) => {
          sumVendas += parseCurrency(v['VALOR VENDIDO'])
        })
        setVendaTotal(sumVendas)

        // Fetch Despesas
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

        // Fetch Custos Fixos
        const custos = await dreService.getCustosFixos(startDate, endDate)
        let sumCustos = 0
        custos?.forEach((c) => {
          sumCustos += Number(c.valor || 0)
        })
        setCustoFixo(sumCustos)

        // Fetch CMV
        const cmvData = await dreService.getCMV(mesReferencia)
        setCmv(
          cmvData
            ? { valor: Number(cmvData.valor), id: cmvData.id }
            : { valor: 0, id: undefined },
        )
      } catch (error) {
        console.error('Failed to load DRE Mensal Gallery', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [mesReferencia, startDate, endDate])

  const handleCmvBlur = async () => {
    setSavingCmv(true)
    try {
      await dreService.saveCMV(mesReferencia, cmv.valor || 0, cmv.id)
      toast({ title: 'CMV salvo com sucesso!' })
      // Reload to get the new ID if it was an insert
      const cmvData = await dreService.getCMV(mesReferencia)
      if (cmvData) {
        setCmv({ valor: Number(cmvData.valor), id: cmvData.id })
      }
    } catch (e) {
      toast({ title: 'Erro ao salvar CMV', variant: 'destructive' })
    } finally {
      setSavingCmv(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const resultadoBruto = vendaTotal - cmv.valor
  const lucroLiquido = resultadoBruto - custoFixo - despesaOp

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
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
            Custo da Mercadoria Total (CMV)
          </CardTitle>
          {savingCmv ? (
            <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 group">
            <span className="text-2xl font-bold text-red-600">R$</span>
            <Input
              type="number"
              value={cmv.valor === 0 ? '' : cmv.valor}
              placeholder="0,00"
              onChange={(e) =>
                setCmv({ ...cmv, valor: Number(e.target.value) })
              }
              onBlur={handleCmvBlur}
              className="text-2xl font-bold border-transparent bg-transparent p-0 h-auto text-red-600 focus-visible:ring-1 focus-visible:ring-red-300 w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Editável (Salva automaticamente)
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
