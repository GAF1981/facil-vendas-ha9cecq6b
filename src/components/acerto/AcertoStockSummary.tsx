import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AcertoItem } from '@/types/acerto'
import { formatCurrency } from '@/lib/formatters'
import { Package, Coins, ArrowRightLeft } from 'lucide-react'

interface AcertoStockSummaryProps {
  items?: AcertoItem[]
}

export function AcertoStockSummary({ items = [] }: AcertoStockSummaryProps) {
  // Safe fallback to ensure items is an array before reducing
  const safeItems = Array.isArray(items) ? items : []

  const totalSaldoInicial = safeItems.reduce(
    (acc, item) => acc + (item.saldoInicial || 0),
    0,
  )
  const totalSaldoFinal = safeItems.reduce(
    (acc, item) => acc + (item.saldoFinal || 0),
    0,
  )
  const valorEstoqueInicial = safeItems.reduce(
    (acc, item) => acc + (item.saldoInicial || 0) * (item.precoUnitario || 0),
    0,
  )
  const valorEstoqueFinal = safeItems.reduce(
    (acc, item) => acc + (item.saldoFinal || 0) * (item.precoUnitario || 0),
    0,
  )

  return (
    <Card className="border-muted">
      <CardHeader className="py-2 px-4 min-h-[40px]">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Resumos de Estoque
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-0.5 p-2 bg-muted/30 rounded border">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Saldo Inicial
            </span>
            <span className="text-sm font-bold">{totalSaldoInicial}</span>
          </div>

          <div className="flex flex-col space-y-0.5 p-2 bg-muted/30 rounded border">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Saldo Final
            </span>
            <span className="text-sm font-bold">{totalSaldoFinal}</span>
          </div>

          <div className="flex flex-col space-y-0.5 p-2 bg-blue-50/50 rounded border border-blue-100">
            <span className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
              <Coins className="h-3 w-3" /> Valor Est. Inicial
            </span>
            <span className="text-sm font-bold text-blue-700">
              R$ {formatCurrency(valorEstoqueInicial)}
            </span>
          </div>

          <div className="flex flex-col space-y-0.5 p-2 bg-green-50/50 rounded border border-green-100">
            <span className="text-[10px] text-green-700 font-medium flex items-center gap-1">
              <Coins className="h-3 w-3" /> Valor Est. Final
            </span>
            <span className="text-sm font-bold text-green-700">
              R$ {formatCurrency(valorEstoqueFinal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
