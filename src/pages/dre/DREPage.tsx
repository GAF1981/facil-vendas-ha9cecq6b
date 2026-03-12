import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, parse } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DREMensalGallery } from '@/components/dre/DREMensalGallery'
import { DREVendas } from '@/components/dre/DREVendas'
import { DREDespesas } from '@/components/dre/DREDespesas'
import { DRECustosFixos } from '@/components/dre/DRECustosFixos'
import { LayoutDashboard } from 'lucide-react'
import { DreProvider } from '@/stores/useDreStore'
import useDreStore from '@/stores/useDreStore'
import { reportsService } from '@/services/reportsService'

function DREPageContent() {
  const [mesReferencia, setMesReferencia] = useState(
    format(new Date(), 'yyyy-MM'),
  )
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  )
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  )

  const {
    costsPeriod,
    setCostsPeriod,
    setAllCustomCosts,
    setCmvTotal,
    setVendaTotal,
  } = useDreStore()

  useEffect(() => {
    const periodKey = `${startDate}-${endDate}`
    if (costsPeriod !== periodKey) {
      reportsService.getTopSellingItemsV5(startDate, endDate).then((result) => {
        let totalCmv = 0
        let totalVenda = 0
        const newCosts: Record<string, string> = {}
        result.forEach((item, index) => {
          const id = item.produto_codigo
            ? String(item.produto_codigo)
            : `idx_${index}`
          const precoMedio =
            item.quantidade_total > 0
              ? item.valor_total / item.quantidade_total
              : 0
          const custo = precoMedio * 0.3
          newCosts[id] = custo.toFixed(2)
          totalCmv += custo * item.quantidade_total
          totalVenda += item.valor_total
        })
        setAllCustomCosts(newCosts)
        setCmvTotal(totalCmv)
        setVendaTotal(totalVenda)
        setCostsPeriod(periodKey)
      })
    }
  }, [
    startDate,
    endDate,
    costsPeriod,
    setAllCustomCosts,
    setCmvTotal,
    setVendaTotal,
    setCostsPeriod,
  ])

  const handleMesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return
    setMesReferencia(val)
    const date = parse(val, 'yyyy-MM', new Date())
    setStartDate(format(startOfMonth(date), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(date), 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRE</h1>
          <p className="text-muted-foreground">
            Demonstrativo de Resultados do Exercício
          </p>
        </div>
      </div>

      <Card className="bg-muted/30 border-muted">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2 w-full sm:w-auto">
            <Label>Mês de Referência</Label>
            <Input
              type="month"
              value={mesReferencia}
              onChange={handleMesChange}
            />
          </div>
          <div className="space-y-2 w-full sm:w-auto">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 w-full sm:w-auto">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="mensal" className="w-full">
        <TabsList className="w-full sm:w-auto flex overflow-x-auto justify-start mb-6 border-b rounded-none bg-transparent p-0">
          <TabsTrigger
            value="mensal"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            DRE Mensal
          </TabsTrigger>
          <TabsTrigger
            value="vendas"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Vendas
          </TabsTrigger>
          <TabsTrigger
            value="despesas"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Despesas
          </TabsTrigger>
          <TabsTrigger
            value="custos-fixos"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Custos Fixos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensal" className="mt-0">
          <DREMensalGallery
            mesReferencia={mesReferencia}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
        <TabsContent value="vendas" className="mt-0">
          <DREVendas startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="despesas" className="mt-0">
          <DREDespesas startDate={startDate} endDate={endDate} />
        </TabsContent>
        <TabsContent value="custos-fixos" className="mt-0">
          <DRECustosFixos
            mesReferencia={mesReferencia}
            startDate={startDate}
            endDate={endDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function DREPage() {
  return (
    <DreProvider>
      <DREPageContent />
    </DreProvider>
  )
}
