import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RefreshCw, LayoutTemplate } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Rota } from '@/types/rota'
import { resumoAcertosService } from '@/services/resumoAcertosService'
import { fechamentoService } from '@/services/fechamentoService'
import { FechamentoCaixa } from '@/types/fechamento'
import { FechamentoHeaderGallery } from '@/components/fechamento/FechamentoHeaderGallery'
import { FechamentoTable } from '@/components/fechamento/FechamentoTable'
import { safeFormatDate } from '@/lib/formatters'

export function ClosingTabContent() {
  const [routes, setRoutes] = useState<Rota[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string>('')
  const [data, setData] = useState<FechamentoCaixa[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchRoutes = async () => {
    try {
      const allRoutes = await resumoAcertosService.getAllRoutes()
      setRoutes(allRoutes)
      if (allRoutes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(allRoutes[0].id.toString())
      }
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar rotas.',
        variant: 'destructive',
      })
    }
  }

  const fetchData = async () => {
    if (!selectedRouteId) return
    setLoading(true)
    try {
      const result = await fechamentoService.getByRoute(
        parseInt(selectedRouteId),
      )
      setData(result)
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar os fechamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutes()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedRouteId])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar Dados
        </Button>
      </div>

      <Card className="bg-muted/20 border-l-4 border-l-purple-600">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-purple-600" />
                Seleção de Rota
              </CardTitle>
              <CardDescription>
                Selecione a rota para visualizar os fechamentos de caixa.
              </CardDescription>
            </div>
            <div className="w-full md:w-[300px]">
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id.toString()}>
                      Rota #{route.id} (
                      {safeFormatDate(route.data_inicio, 'dd/MM')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <FechamentoHeaderGallery items={data} />

      <Card>
        <CardHeader>
          <CardTitle>Confirmar Caixa</CardTitle>
          <CardDescription>
            Valide os valores físicos (Dinheiro, PIX, Cheque) e confirme o
            fechamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <FechamentoTable data={data} onRefresh={fetchData} />
        </CardContent>
      </Card>
    </div>
  )
}
