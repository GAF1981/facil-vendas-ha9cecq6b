import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AcertoItem } from '@/types/acerto'
import { formatCurrency } from '@/lib/formatters'
import { Package, Coins, ArrowRightLeft } from 'lucide-react'

interface AcertoStockSummaryProps {
  items: AcertoItem[]
}

export function AcertoStockSummary({ items }: AcertoStockSummaryProps) {
  const totalSaldoInicial = items.reduce(
    (acc, item) => acc + (item.saldoInicial || 0),
    0,
  )
  const totalSaldoFinal = items.reduce(
    (acc, item) => acc + (item.saldoFinal || 0),
    0,
  )
  const valorEstoqueInicial = items.reduce(
    (acc, item) => acc + (item.saldoInicial || 0) * (item.precoUnitario || 0),
    0,
  )
  const valorEstoqueFinal = items.reduce(
    (acc, item) => acc + (item.saldoFinal || 0) * (item.precoUnitario || 0),
    0,
  )

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Resumos de Estoque
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg border">
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Saldo Inicial (Qtd)
            </span>
            <span className="text-2xl font-bold">{totalSaldoInicial}</span>
          </div>

          <div className="flex flex-col space-y-1 p-3 bg-muted/30 rounded-lg border">
            <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Saldo Final (Qtd)
            </span>
            <span className="text-2xl font-bold">{totalSaldoFinal}</span>
          </div>

          <div className="flex flex-col space-y-1 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <span className="text-sm text-blue-700 font-medium flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> Valor Estoque Inicial
            </span>
            <span className="text-2xl font-bold text-blue-700">
              R$ {formatCurrency(valorEstoqueInicial)}
            </span>
          </div>

          <div className="flex flex-col space-y-1 p-3 bg-green-50/50 rounded-lg border border-green-100">
            <span className="text-sm text-green-700 font-medium flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" /> Valor Estoque Final
            </span>
            <span className="text-2xl font-bold text-green-700">
              R$ {formatCurrency(valorEstoqueFinal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
