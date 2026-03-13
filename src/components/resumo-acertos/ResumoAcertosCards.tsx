import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface ResumoAcertosCardsProps {
  totalVendas: number
  totalDescontos: number
  percentualDesconto: number
  totalPago: number
  totalReceber: number
  totalAcertos: number
}

export function ResumoAcertosCards({
  totalVendas,
  totalDescontos,
  percentualDesconto,
  totalPago,
  totalReceber,
  totalAcertos,
}: ResumoAcertosCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Venda Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {formatCurrency(totalVendas)}
          </div>
          <p className="text-xs text-muted-foreground">Valor bruto de vendas</p>
        </CardContent>
      </Card>
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Desconto Total</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-600">
              R$ {formatCurrency(totalDescontos)}
            </div>
            <div className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {percentualDesconto.toFixed(2)}%
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Descontos aplicados
          </p>
        </CardContent>
      </Card>
      <Card className="bg-card border-green-200 bg-green-50/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Valor Pago Total
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            R$ {formatCurrency(totalPago)}
          </div>
          <p className="text-xs text-green-600/80">Recebimentos confirmados</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-blue-200 bg-blue-50/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Valor a Receber
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">
            R$ {formatCurrency(totalReceber)}
          </div>
          <p className="text-xs text-blue-600/80">Pendências do filtro</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-purple-200 bg-purple-50/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-700">
            Total de Acertos
          </CardTitle>
          <FileText className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700">
            {totalAcertos}
          </div>
          <p className="text-xs text-purple-600/80">Acertos realizados</p>
        </CardContent>
      </Card>
    </div>
  )
}
