import { EstoqueCarroItem } from '@/types/estoque_carro'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Props {
  items: EstoqueCarroItem[]
}

export function EstoqueCarroTable({ items }: Props) {
  return (
    <div className="rounded-md border bg-card overflow-auto shadow-sm max-h-[65vh]">
      <Table>
        <TableHeader className="bg-muted sticky top-0 z-10">
          <TableRow>
            <TableHead className="min-w-[200px]">Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo Inicial</TableHead>
            <TableHead className="text-right text-green-600">
              Ent. Cliente
            </TableHead>
            <TableHead className="text-right text-green-600">
              Ent. Estoque
            </TableHead>
            <TableHead className="text-right text-red-600">
              Saída Cliente
            </TableHead>
            <TableHead className="text-right text-red-600">
              Saída Estoque
            </TableHead>
            <TableHead className="text-right font-bold bg-blue-50/50">
              Saldo Final
            </TableHead>
            <TableHead className="text-right bg-yellow-50/50">
              Contagem
            </TableHead>
            <TableHead className="text-right">Dif (Qtd)</TableHead>
            <TableHead className="text-right">Dif (Val)</TableHead>
            <TableHead className="text-right bg-gray-50">Ajustes</TableHead>
            <TableHead className="text-right font-bold bg-gray-100">
              Novo Saldo
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.produto_id} className="hover:bg-muted/30">
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{item.produto}</span>
                  {item.codigo && (
                    <span className="text-xs text-muted-foreground">
                      Cod: {item.codigo}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">{item.tipo}</TableCell>
              <TableCell className="text-right font-mono">
                {item.saldo_inicial}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {item.entradas_cliente}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {item.entradas_estoque}
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                {item.saidas_cliente}
              </TableCell>
              <TableCell className="text-right font-mono text-red-600">
                {item.saidas_estoque}
              </TableCell>
              <TableCell className="text-right font-mono font-bold bg-blue-50/30">
                {item.saldo_final}
              </TableCell>
              <TableCell className="text-right font-mono bg-yellow-50/30">
                {item.contagem}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-mono',
                  item.diferenca_qtd !== 0 && 'text-red-600 font-bold',
                )}
              >
                {item.diferenca_qtd}
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                {formatCurrency(item.diferenca_val)}
              </TableCell>
              <TableCell className="text-right font-mono bg-gray-50/30">
                {item.ajustes}
              </TableCell>
              <TableCell className="text-right font-mono font-bold bg-gray-100/50">
                {item.novo_saldo}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
