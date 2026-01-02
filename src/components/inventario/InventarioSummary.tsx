import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InventarioSummaryData } from '@/types/inventario'
import { formatCurrency } from '@/lib/formatters'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Scale,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface InventarioSummaryProps {
  summary?: InventarioSummaryData
  loading?: boolean
  error?: string | null
}

export function InventarioSummary({
  summary,
  loading = false,
  error = null,
}: InventarioSummaryProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-muted bg-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-4 border-red-200 bg-red-50">
          <CardContent className="flex items-center justify-center p-6 text-red-600 gap-2">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">
              Erro ao carregar resumo do inventário: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fallback for empty data if not loading/error
  const data = summary || {
    initial: { qty: 0, value: 0 },
    final: { qty: 0, value: 0 },
    positiveDiff: { qty: 0, value: 0 },
    negativeDiff: { qty: 0, value: 0 },
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-blue-50/50 border-blue-100 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">
            Total Saldo Inicial
          </CardTitle>
          <Scale className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">
            {data.initial.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-blue-600 font-medium">
            R$ {formatCurrency(data.initial.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-50/50 border-gray-100 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            Total Saldo Final
          </CardTitle>
          <Scale className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {data.final.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-gray-600 font-medium">
            R$ {formatCurrency(data.final.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-green-50/50 border-green-100 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-700">
            Diferença Positiva (Sobra)
          </CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            +{data.positiveDiff.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-green-600 font-medium">
            + R$ {formatCurrency(data.positiveDiff.value)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-red-50/50 border-red-100 transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">
            Diferença Negativa (Falta)
          </CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">
            -{data.negativeDiff.qty.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-red-600 font-medium">
            - R$ {formatCurrency(data.negativeDiff.value)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
