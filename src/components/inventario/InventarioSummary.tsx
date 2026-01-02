import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InventarioSummaryData } from '@/types/inventario'
import { formatCurrency } from '@/lib/formatters'
import { ArrowDownIcon, ArrowUpIcon, Scale } from 'lucide-react'

interface InventarioSummaryProps {
  summary: InventarioSummaryData
}

export function InventarioSummary({ summary }: InventarioSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-blue-50/50 border-blue-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Total Saldo Inicial
          </CardTitle>
          <Scale className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {summary.initial.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-blue-600 font-medium">
            R$ {formatCurrency(summary.initial.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-50/50 border-gray-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            Total Saldo Final
          </CardTitle>
          <Scale className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {summary.final.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-gray-600 font-medium">
            R$ {formatCurrency(summary.final.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-green-50/50 border-green-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Diferença Positiva (Sobra)
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            +{summary.positiveDiff.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-green-600 font-medium">
            + R$ {formatCurrency(summary.positiveDiff.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-red-50/50 border-red-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">
            Diferença Negativa (Falta)
          </CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">
            -{summary.negativeDiff.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-red-600 font-medium">
            - R$ {formatCurrency(summary.negativeDiff.value)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
